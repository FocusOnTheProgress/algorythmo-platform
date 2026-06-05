# frozen_string_literal: true

# algorythmo:brain:provision — idempotent, non-TTY-safe per-account brain setup (P0-4).
#
# Provisions (or re-provisions) the GBrain for one Chatwoot account:
#   1. gbrain init --pglite --force --non-interactive
#        --embedding-model ollama:nomic-embed-text --embedding-dimensions 768
#      Embedding provider/dimensions are CRAVADOS (no auto-detect/picker) so the
#      command never blocks waiting on TTY input. --force makes re-runs idempotent.
#      Indexer = SELF-HOSTED OLLAMA (founder directive 2026-06-05: own the indexer,
#      zero paid services, runs on our VPS). nomic-embed-text (768 dims) is a small
#      CPU-friendly embedding model; the endpoint comes from OLLAMA_BASE_URL.
#      Validated end-to-end (capture + semantic search round-trip) before shipping.
#   2. gbrain config set models.think deepseek:deepseek-chat
#      Synthesis (think) runs on DeepSeek (P0-3). models.think is a KNOWN config key
#      (verified: src/core/config.ts), so no --force is needed for the set.
#      OPENAI_API_KEY (if set) is a MANUAL fallback: flip models.think to an openai
#      model to switch synthesis providers. No automatic failover (founder choice 'a').
#
# Both subprocesses inherit the per-account GBRAIN_HOME and the provider config via the
# SAME env hash the Brain::Client uses — keys never appear in argv, never logged.
#
# Flags VERIFIED in source at the pinned SHA (engines/algorythmo/GBRAIN_PINNED_SHA):
#   --pglite, --force, --non-interactive, --embedding-model, --embedding-dimensions
#     → src/commands/init.ts
#   Ollama embedding recipe reads OLLAMA_BASE_URL (default http://localhost:11434/v1),
#   no API key required → src/core/ai/recipes/ollama.ts
#   config set <key> <value>; models.think known key → src/commands/config.ts + core/config.ts
#   DeepSeek reads DEEPSEEK_API_KEY → src/core/ai/recipes/deepseek.ts
#
# Usage:
#   ACCOUNT_ID=2 bundle exec rake algorythmo:brain:provision
#   bundle exec rake "algorythmo:brain:provision[2]"
#
# Requires OLLAMA_BASE_URL (embeddings endpoint) and DEEPSEEK_API_KEY (synthesis) in
# the env. OPENAI_API_KEY is optional (manual synthesis fallback).

require 'open3'

module Algorythmo
  module Tasks
    # Provisions a single account's GBrain. Pure subprocess orchestration — no Rails
    # models touched, so it is safe to run before/independently of the app boot.
    class BrainProvision
      # Self-hosted Ollama indexer (ollama.ts). Pinned explicitly to stay non-TTY-safe;
      # any provider remains swappable via these constants. nomic-embed-text is 768-dim.
      EMBEDDING_MODEL      = 'ollama:nomic-embed-text'
      EMBEDDING_DIMENSIONS = '768'
      THINK_MODEL          = 'deepseek:deepseek-chat'

      GBRAIN_BIN = ENV.fetch('GBRAIN_BIN', 'gbrain').freeze

      class ProvisionError < StandardError; end

      def self.run!(account_id:, output: $stdout)
        new(account_id: account_id, output: output).run!
      end

      def initialize(account_id:, output:)
        @account_id = Integer(account_id)
        @output     = output
      end

      def run!
        require_keys!
        log "Provisioning brain for account #{@account_id} (GBRAIN_HOME=#{gbrain_home})"
        run_step('init', init_args)
        run_step('config set models.think', config_think_args)
        log "Done. Brain for account #{@account_id} is provisioned and idempotent."
      end

      private

      def gbrain_home
        Algorythmo::Brain::Client.gbrain_home_for(@account_id)
      end

      # Same env hash contract as Brain::Client#subprocess_env: config only in env.
      def subprocess_env
        env = { 'GBRAIN_HOME' => gbrain_home }
        env['OLLAMA_BASE_URL']  = ENV.fetch('OLLAMA_BASE_URL', nil)  # embeddings endpoint (not a secret)
        env['DEEPSEEK_API_KEY'] = ENV.fetch('DEEPSEEK_API_KEY', nil) # synthesis
        env['OPENAI_API_KEY']   = ENV['OPENAI_API_KEY'] if ENV['OPENAI_API_KEY'].present? # manual synthesis fallback
        env
      end

      def require_keys!
        missing = []
        missing << 'OLLAMA_BASE_URL (embeddings endpoint)' if ENV['OLLAMA_BASE_URL'].to_s.strip.empty?
        missing << 'DEEPSEEK_API_KEY (synthesis)'          if ENV['DEEPSEEK_API_KEY'].to_s.strip.empty?
        return if missing.empty?

        raise ProvisionError, "Missing required env var(s): #{missing.join(', ')}"
      end

      def init_args
        [
          GBRAIN_BIN, 'init',
          '--pglite',
          '--force',
          '--non-interactive',
          '--embedding-model', EMBEDDING_MODEL,
          '--embedding-dimensions', EMBEDDING_DIMENSIONS
        ]
      end

      def config_think_args
        [GBRAIN_BIN, 'config', 'set', 'models.think', THINK_MODEL]
      end

      def run_step(label, args)
        log "  → gbrain #{label}"
        stdout, stderr, status = Open3.capture3(subprocess_env, *args)
        return if status.success?

        raise ProvisionError,
              "gbrain #{label} failed (exit #{status.exitstatus}): #{redact(stderr.empty? ? stdout : stderr).strip}"
      rescue Errno::ENOENT => e
        raise ProvisionError, "gbrain binary not found (#{GBRAIN_BIN}): #{e.message}"
      end

      # Defensive: never let a leaked key reach the abort message / logs.
      # OLLAMA_BASE_URL is not a secret, so it is not redacted.
      def redact(text)
        out = text.to_s
        [ENV.fetch('DEEPSEEK_API_KEY', nil), ENV.fetch('OPENAI_API_KEY', nil)].each do |secret|
          next if secret.to_s.empty?

          out = out.gsub(secret, '[REDACTED]')
        end
        out
      end

      def log(message)
        @output.puts("[algorythmo:brain:provision] #{message}")
      end
    end
  end
end

namespace :algorythmo do
  namespace :brain do
    desc 'Provision (idempotent) a per-account GBrain: init --pglite + config models.think=deepseek. ACCOUNT_ID=<id> or [id].'
    task :provision, [:account_id] => :environment do |_task, args|
      account_id = args[:account_id] || ENV.fetch('ACCOUNT_ID', nil)
      abort('[algorythmo:brain:provision] account_id required (ACCOUNT_ID=<id> or rake task[<id>])') if account_id.to_s.strip.empty?

      Algorythmo::Tasks::BrainProvision.run!(account_id: account_id)
    rescue Algorythmo::Tasks::BrainProvision::ProvisionError => e
      abort("[algorythmo:brain:provision] #{e.message}")
    end
  end
end
