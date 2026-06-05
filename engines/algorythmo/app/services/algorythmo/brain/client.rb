# frozen_string_literal: true

require 'open3'
require 'json'
require 'tmpdir'

# Thin wrapper over the GBrain CLI subprocess.
#
# Per-account isolation (P0-5): each account gets its own brain rooted at a
#   distinct GBRAIN_HOME. gbrain reads GBRAIN_HOME as a PARENT dir and appends
#   ".gbrain" itself (verified: src/core/config.ts configDir(), ~L723-735), so
#   GBRAIN_HOME=<base>/<account_id> yields a config dir <base>/<account_id>/.gbrain.
#   The path is injected via the Open3 env hash on EVERY invocation — never a flag.
#
# Provider config (verified in source at the pinned SHA):
#   - OLLAMA_BASE_URL  → embeddings endpoint  (src/core/ai/recipes/ollama.ts)
#       SELF-HOSTED indexer ollama:nomic-embed-text / 768 dims, no API key.
#       Founder directive 2026-06-05: own the indexer on our VPS, zero paid services.
#       OLLAMA_BASE_URL is NOT a secret (a service URL) — injected, but not redacted.
#   - DEEPSEEK_API_KEY → synthesis (think)    (src/core/ai/recipes/deepseek.ts)
#   - OPENAI_API_KEY   → manual synthesis fallback (only if set; flip models.think)
#   gbrain does NOT read DEEPSEEK_BASE_URL / DEEPSEEK_MODEL — we never inject them.
#   Secrets travel ONLY in the env hash — never as a CLI argument, never logged.
#
# All write methods (capture, export) MUST be wrapped by WriteLock.with_lock.
# Read methods (search, think, stats) do NOT acquire the lock.
module Algorythmo
  module Brain
    class Client
      # Raised when the gbrain subprocess exits with a non-zero status.
      class SubprocessError < StandardError; end

      # Raised when the gbrain subprocess exceeds its allowed timeout and is killed.
      # Named TimeoutError (not Timeout) to avoid shadowing ::Timeout from stdlib.
      class TimeoutError < StandardError; end

      READ_TIMEOUT  = Integer(ENV.fetch('GBRAIN_READ_TIMEOUT',  30)) # seconds
      WRITE_TIMEOUT = Integer(ENV.fetch('GBRAIN_WRITE_TIMEOUT', 60)) # seconds

      GBRAIN_BIN = ENV.fetch('GBRAIN_BIN', 'gbrain').freeze

      # Parent dir under which each account's brain lives (one subdir per account).
      # Defaults to ~/.gbrain-accounts so it never collides with a stray ~/.gbrain.
      GBRAIN_HOME_BASE = ENV.fetch('GBRAIN_HOME_BASE', File.join(Dir.home, '.gbrain-accounts')).freeze

      # @param account_id [Integer] Chatwoot account ID. Selects the per-account
      #   GBRAIN_HOME so brains are isolated at the filesystem level (P0-5).
      #   Coerced with Integer() at construction so a malicious string like "../99"
      #   raises immediately rather than landing in File.join (path-traversal guard).
      def initialize(account_id)
        @account_id = Integer(account_id)
      end

      # Absolute path used as GBRAIN_HOME for this account. gbrain appends ".gbrain".
      # Exposed (read-only) so the provision rake task can reuse the exact same root.
      def self.gbrain_home_for(account_id)
        File.join(GBRAIN_HOME_BASE, account_id.to_s)
      end

      # Ingest a markdown file into the brain.
      # MUST be called inside WriteLock.with_lock { }.
      # @param file [String] absolute path to the markdown file to capture.
      # @raise [ArgumentError] if path fails defensive validation.
      # @raise [SubprocessError] if gbrain exits non-zero.
      # @raise [TimeoutError] if gbrain exceeds WRITE_TIMEOUT.
      # --json is REQUIRED: without it `gbrain capture` prints a human-readable
      # receipt ("captured:\n  slug: ...") that JSON.parse rejects. With --json it
      # emits {slug,status,chunks,content_hash,written,path,source_kind,captured_at}
      # (verified: src/commands/capture.ts at the pinned SHA).
      def capture(file:)
        real_path = validate_capture_path!(file)
        run_subprocess([GBRAIN_BIN, 'capture', real_path, '--json'], timeout: WRITE_TIMEOUT)
      end

      # Search the brain for pages matching query.
      # @param query [String]
      # @param limit [Integer] max results (default 10)
      # @return [Array<Hash>]
      # KNOWN ISSUE (follow-up): `gbrain search "<query>"` is a shared op rendered as
      # human text ("[0.82] slug -- title") and IGNORES --json (the --json on `search
      # modes/stats/tune` is a different sub-subcommand). So this still returns non-JSON
      # and parse_output raises. No live caller today (Copiloto uses `think`, which is
      # JSON). Proper fix = parse the text output, guarded by gbrain_real_integration_spec.
      def search(query:, limit: 10)
        run_subprocess([GBRAIN_BIN, 'search', query, '--limit', limit.to_s], timeout: READ_TIMEOUT)
      end

      # Synthesise an answer using the brain's knowledge.
      #
      # --json is REQUIRED: without it gbrain prints markdown, which JSON.parse
      # would reject (verified: src/commands/think.ts). There is NO --context flag
      # in gbrain (verified: same file) — callers pass everything through `prompt`.
      #
      # @param prompt [String]
      # @return [Hash] parsed think --json payload. Real shape (src/core/think/index.ts):
      #   { "answer" => String, "gaps" => [...], "modelUsed" => String,
      #     "pagesGathered" => Integer, "takesGathered" => Integer, "graphHits" => Integer,
      #     "citations" => [{ "page_slug" => String, "row_num" => Integer|nil,
      #                       "citation_index" => Integer }],
      #     "warnings" => [...], "saved_slug" => String|nil, "evidence_inserted" => Integer }
      def think(prompt:)
        run_subprocess([GBRAIN_BIN, 'think', prompt, '--json'], timeout: READ_TIMEOUT)
      end

      # Export the full brain to a directory or file.
      # MUST be called inside WriteLock.with_lock { } (defensive against concurrent capture).
      # @param out [String] output path
      def export(out:)
        run_subprocess([GBRAIN_BIN, 'export', '--out', out], timeout: WRITE_TIMEOUT)
      end

      # KNOWN ISSUE (follow-up): `gbrain stats` is a shared op rendered as human text
      # ("Pages: N\nChunks: N\n...") and IGNORES --json, so parse_output raises on the
      # real engine. Real fields are FLAT (page_count, chunk_count, embedded_count,
      # link_count, tag_count, timeline_entry_count) — NOT { aggregate: { total_pages } }.
      # Used only by the history/overview surface (compiled_truth/snapshots), not the
      # upload→Copiloto path. Proper fix = parse the text + align the 3 callers to the
      # flat shape, guarded by gbrain_real_integration_spec.
      # @return [Hash]
      def stats
        run_subprocess([GBRAIN_BIN, 'stats'], timeout: READ_TIMEOUT)
      end

      private

      # Builds the env hash injected into EVERY gbrain subprocess (Open3.popen3).
      #
      # This is a DELTA: Open3 merges it onto the parent process env (PATH, HOME,
      # etc. survive because we do not pass unsetenv_others: true). We add:
      #   - GBRAIN_HOME      → per-account brain root (P0-5 isolation)
      #   - OLLAMA_BASE_URL  → self-hosted embeddings endpoint (not a secret)
      #   - DEEPSEEK_API_KEY → only if present (synthesis)
      #   - OPENAI_API_KEY   → only if present (manual synthesis fallback)
      #
      # Deliberately absent: DEEPSEEK_BASE_URL / DEEPSEEK_MODEL (gbrain ignores them).
      # Keys live here and ONLY here — never in args, never logged.
      def subprocess_env
        env = { 'GBRAIN_HOME' => self.class.gbrain_home_for(@account_id) }
        env['OLLAMA_BASE_URL']  = ENV['OLLAMA_BASE_URL']  if ENV['OLLAMA_BASE_URL'].present?
        env['DEEPSEEK_API_KEY'] = ENV['DEEPSEEK_API_KEY'] if ENV['DEEPSEEK_API_KEY'].present?
        env['OPENAI_API_KEY']   = ENV['OPENAI_API_KEY']   if ENV['OPENAI_API_KEY'].present?
        env
      end

      # Defensive path validation for capture. Returns the resolved real path so
      # the subprocess receives it — prevents TOCTOU via symlink swap after check.
      #
      # Guards:
      #   - must be absolute (no relative traversal)
      #   - must not contain ".." segments (belt-and-suspenders before realpath)
      #   - must not contain null bytes (null byte injection)
      #   - resolved real path must be inside server-owned tmpdir (with separator boundary
      #     so /tmpfoo never matches /tmp)
      #   - must be a regular file (not a directory or device)
      #
      # @return [String] resolved real path — pass this to subprocess, not original
      def validate_capture_path!(path)
        raise ArgumentError, 'path must be absolute'       unless path.start_with?('/')
        raise ArgumentError, 'path must not contain ..'    if path.include?('..')
        raise ArgumentError, 'path must not contain null'  if path.include?("\0")

        real_path   = resolve_real_path(path)
        tmpdir_real = File.realpath(Dir.tmpdir)
        inside_tmp  = real_path == tmpdir_real || real_path.start_with?(tmpdir_real + File::SEPARATOR)

        raise ArgumentError, "path must reside inside tmpdir (#{tmpdir_real})" unless inside_tmp
        raise ArgumentError, 'path must be a regular file' unless File.file?(real_path)

        real_path
      end

      def resolve_real_path(path)
        File.realpath(path)
      rescue Errno::ENOENT, Errno::ELOOP
        # ENOENT: file does not exist (yet). ELOOP: circular symlink. Both rejected.
        raise ArgumentError, 'path could not be resolved (missing or circular symlink)'
      end

      def run_subprocess(args, timeout:)
        stdout, stderr, status, timed_out = execute_with_timeout(args, timeout)
        raise TimeoutError, "gbrain timed out after #{timeout}s — killed" if timed_out
        raise SubprocessError, build_error(args, status, stderr) unless status.success?

        parse_output(stdout, args)
      end

      def execute_with_timeout(args, timeout)
        timed_out = false
        stdout = stderr = status = nil
        Open3.popen3(subprocess_env, *args) do |stdin, out, err, wait_thr|
          stdin.close
          out_thr = Thread.new { out.read }
          err_thr = Thread.new { err.read }
          timed_out = !wait_thr_join(wait_thr, timeout)
          kill_subprocess(wait_thr) if timed_out
          stdout = out_thr.value
          stderr = err_thr.value
          status = wait_thr.value
        end
        [stdout.to_s, stderr.to_s, status, timed_out]
      rescue Errno::ENOENT => e
        raise SubprocessError, "gbrain binary not found (#{GBRAIN_BIN}): #{e.message}"
      end

      def wait_thr_join(wait_thr, timeout)
        wait_thr.join(timeout)
      end

      def kill_subprocess(wait_thr)
        pid = wait_thr.pid
        Process.kill('TERM', pid)
        wait_thr.join(2)
        Process.kill('KILL', pid) if wait_thr.alive?
      rescue Errno::ESRCH, Errno::EPERM
        # Process already exited or permission denied — nothing to kill.
        nil
      end

      def parse_output(stdout, args)
        return {} if stdout.strip.empty?

        JSON.parse(stdout)
      rescue JSON::ParserError => e
        # redact_secrets guards against a key leaking via a partial stdout fragment
        # embedded in the ParseError message (e.g. JSON cut mid-token).
        safe_msg = redact_secrets(e.message).truncate(200)
        raise SubprocessError, "gbrain returned non-JSON output (#{args.first(2).join(' ')}): #{safe_msg}"
      end

      def build_error(args, status, stderr)
        cmd = args.first(2).join(' ')
        "gbrain #{cmd} exited #{status.exitstatus}: #{redact_secrets(stderr).strip.truncate(200)}"
      end

      # Defensive: gbrain should never echo a key, but if a future version leaks one
      # into stderr we must not let it reach an exception message or the logs.
      # OLLAMA_BASE_URL is not a secret, so it is not redacted.
      def redact_secrets(text)
        redacted = text.to_s
        [ENV.fetch('DEEPSEEK_API_KEY', nil), ENV.fetch('OPENAI_API_KEY', nil)].each do |secret|
          next if secret.blank?

          redacted = redacted.gsub(secret, '[REDACTED]')
        end
        redacted
      end
    end
  end
end
