# frozen_string_literal: true

# Thin wrapper over the GBrain CLI subprocess.
#
# Day-1: account_id is accepted but ignored — there is a single brain at ~/.gbrain/
#   (GBrain upstream default). No --dir flag (does not exist upstream per premise audit v4).
#
# Day-M3.5: account_id → database_url resolved via AccountBrainRegistry
#   (table `algorythmo_account_brains`, provisioned per ADR-0014).
#   Brain::Client.new(account_id) will pass GBRAIN_DATABASE_URL via Open3 env hash,
#   isolating each account's brain at the DB level without per-tenant filesystem paths.
#
# All write methods (capture, export) MUST be wrapped by WriteLock.with_lock.
# Read methods (search, think, stats) do NOT acquire the lock.
module Algorythmo
  module Brain
    class Client
      # Raised when the gbrain subprocess exits with a non-zero status.
      class SubprocessError < StandardError; end

      # Raised when the gbrain subprocess exceeds its timeout and is killed.
      class Timeout < StandardError; end

      READ_TIMEOUT  = Integer(ENV.fetch('GBRAIN_READ_TIMEOUT',  30)) # seconds
      WRITE_TIMEOUT = Integer(ENV.fetch('GBRAIN_WRITE_TIMEOUT', 60)) # seconds

      GBRAIN_BIN = ENV.fetch('GBRAIN_BIN', 'gbrain').freeze

      # @param account_id [Integer] Chatwoot account ID.
      #   Day-1: ignored (single brain). Day-M3.5: used to resolve GBRAIN_DATABASE_URL.
      def initialize(account_id)
        @account_id = account_id
      end

      # Ingest a markdown file into the brain.
      # MUST be called inside WriteLock.with_lock { }.
      # @param file [String] absolute path to the markdown file to capture.
      # @raise [ArgumentError] if path fails defensive validation.
      # @raise [SubprocessError] if gbrain exits non-zero.
      # @raise [Timeout] if gbrain exceeds WRITE_TIMEOUT.
      def capture(file:)
        validate_capture_path!(file)
        run_subprocess([GBRAIN_BIN, 'capture', file], timeout: WRITE_TIMEOUT)
      end

      # Search the brain for pages matching query.
      # @param query [String]
      # @param limit [Integer] max results (default 10)
      # @return [Array<Hash>]
      def search(query:, limit: 10)
        run_subprocess([GBRAIN_BIN, 'search', query, '--limit', limit.to_s], timeout: READ_TIMEOUT)
      end

      # Synthesise an answer using the brain's knowledge.
      # @param prompt [String]
      # @param context [String, nil] optional extra context; ignored if nil
      # @return [Hash] { answer:, citations: [] }
      def think(prompt:, context: nil)
        args = [GBRAIN_BIN, 'think', prompt]
        args += ['--context', context] if context
        run_subprocess(args, timeout: READ_TIMEOUT)
      end

      # Export the full brain to a directory or file.
      # MUST be called inside WriteLock.with_lock { } (defensive against concurrent capture).
      # @param out [String] output path
      def export(out:)
        run_subprocess([GBRAIN_BIN, 'export', '--out', out], timeout: WRITE_TIMEOUT)
      end

      # Return usage statistics from the brain.
      # @return [Hash]
      def stats
        run_subprocess([GBRAIN_BIN, 'stats'], timeout: READ_TIMEOUT)
      end

      private

      # Defensive path validation for capture:
      #   - must be an absolute path
      #   - must reside inside the server-owned tmpdir
      #   - must not contain ".." components
      #   - must not be a symlink pointing outside the tmpdir
      #   - must be a regular file
      def validate_capture_path!(path)
        raise ArgumentError, 'path must be absolute' unless path.start_with?('/')
        raise ArgumentError, 'path must not contain ..' if path.include?('..')

        tmpdir    = Dir.tmpdir
        real_path = resolve_real_path(path)

        raise ArgumentError, "path must reside inside tmpdir (#{tmpdir})" unless real_path.start_with?(tmpdir)
        raise ArgumentError, 'path must be a regular file' unless File.file?(path)
      end

      def resolve_real_path(path)
        File.realpath(path)
      rescue Errno::ENOENT, Errno::ELOOP
        # ENOENT: file doesn't exist yet — treat parent check as sufficient
        # ELOOP:  too many symlink levels — reject
        raise ArgumentError, 'path could not be resolved (missing or circular symlink)'
      end

      def run_subprocess(args, timeout:)
        stdout, stderr, status, timed_out = execute_with_timeout(args, timeout)
        raise Timeout, "gbrain timed out after #{timeout}s — killed" if timed_out
        raise SubprocessError, build_error(args, status, stderr) unless status.success?

        parse_output(stdout, args)
      end

      def execute_with_timeout(args, timeout)
        timed_out = false
        stdout = ''
        stderr = ''
        status = nil
        Open3.popen3(*args) do |_stdin, out, err, wait_thr|
          timed_out = wait_with_timeout(wait_thr, timeout)
          Process.kill('KILL', wait_thr.pid) if timed_out
          stdout = out.read
          stderr = err.read
          status = wait_thr.value
        end
        [stdout, stderr, status, timed_out]
      rescue Errno::ENOENT => e
        raise SubprocessError, "gbrain binary not found (#{GBRAIN_BIN}): #{e.message}"
      end

      def wait_with_timeout(wait_thr, timeout)
        deadline = Time.now + timeout
        sleep(0.05) until wait_thr.status == false || Time.now >= deadline
        wait_thr.status != false
      end

      def parse_output(stdout, args)
        return {} if stdout.strip.empty?

        JSON.parse(stdout)
      rescue JSON::ParserError => e
        raise SubprocessError, "gbrain returned non-JSON output (#{args.first(2).join(' ')}): #{e.message}"
      end

      def build_error(args, status, stderr)
        cmd = args.first(2).join(' ')
        "gbrain #{cmd} exited #{status.exitstatus}: #{stderr.strip.truncate(200)}"
      end
    end
  end
end
