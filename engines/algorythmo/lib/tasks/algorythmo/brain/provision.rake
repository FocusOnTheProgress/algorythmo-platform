# frozen_string_literal: true

# algorythmo:brain:provision — idempotent, non-TTY-safe per-account brain setup (P0-4).
#
# Provisions (or re-provisions) the GBrain for one Chatwoot account:
#   1. gbrain init --pglite --force --non-interactive
#        --embedding-model zeroentropyai:zembed-1 --embedding-dimensions 1280
#      Embedding provider/dimensions are CRAVADOS (no auto-detect/picker) so the
#      command never blocks waiting on TTY input. --force makes re-runs idempotent.
#      The provider/dims are the gbrain ENGINE DEFAULT (founder directive 2026-06-04:
#      use the motor's default, not OpenAI). Still pinned EXPLICITLY — the init
#      env-picker fails loud in non-TTY (P0-4), so we never rely on auto-detect.
#   2. gbrain config set models.think deepseek:deepseek-chat
#      Synthesis (think) runs on DeepSeek (P0-3). models.think is a KNOWN config key
#      (verified: src/core/config.ts), so no --force is needed for the set.
#
# Both subprocesses inherit the per-account GBRAIN_HOME and the provider keys via the
# SAME env hash the Brain::Client uses — keys never appear in argv, never logged.
#
# Flags VERIFIED in source at the pinned SHA (engines/algorythmo/GBRAIN_PINNED_SHA):
#   --pglite, --force, --non-interactive, --embedding-model, --embedding-dimensions
#     → src/commands/init.ts
#   engine default embedding = zeroentropyai:zembed-1 / 1280 dims
#     → src/core/ai/defaults.ts L20-21 (DEFAULT_EMBEDDING_MODEL/DIMENSIONS)
#   ZeroEntropy reads ZEROENTROPY_API_KEY → src/core/config.ts L43, L409
#   config set <key> <value>; models.think known key → src/commands/config.ts + core/config.ts
#   DeepSeek reads DEEPSEEK_API_KEY → src/core/ai/recipes/deepseek.ts
#
# Usage:
#   ACCOUNT_ID=2 bundle exec rake algorythmo:brain:provision
#   bundle exec rake "algorythmo:brain:provision[2]"
#
# Requires ZEROENTROPY_API_KEY (embeddings) and DEEPSEEK_API_KEY (synthesis) in the env.

require 'open3'

module Algorythmo
  module Tasks
    # Provisions a single account's GBrain. Pure subprocess orchestration — no Rails
    # models touched, so it is safe to run before/independently of the app boot.
    class BrainProvision
      # gbrain engine default (defaults.ts L20-21). Pinned explicitly to stay
      # non-TTY-safe; OpenAI remains swappable via these constants if the founder
      # reverts (directive 2026-06-04).
      EMBEDDING_MODEL      = 'zeroentropyai:zembed-1'
      EMBEDDING_DIMENSIONS = '1280'
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

      # Same env hash contract as Brain::Client#subprocess_env: keys only in env.
      def subprocess_env
        env = { 'GBRAIN_HOME' => gbrain_home }
        env['ZEROENTROPY_API_KEY'] = ENV.fetch('ZEROENTROPY_API_KEY', nil)
        env['DEEPSEEK_API_KEY']    = ENV.fetch('DEEPSEEK_API_KEY', nil)
        env
      end

      def require_keys!
        missing = []
        missing << 'ZEROENTROPY_API_KEY (embeddings)' if ENV['ZEROENTROPY_API_KEY'].to_s.strip.empty?
        missing << 'DEEPSEEK_API_KEY (synthesis)'     if ENV['DEEPSEEK_API_KEY'].to_s.strip.empty?
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
      def redact(text)
        out = text.to_s
        [ENV.fetch('ZEROENTROPY_API_KEY', nil), ENV.fetch('DEEPSEEK_API_KEY', nil)].each do |secret|
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
