# frozen_string_literal: true

# §8.3 cleanup_legacy_leads — hard-deletes leads created before CrmListener
# was wired. Legacy signature: channel_origin blank/nil AND last_message_at nil
# (the listener always populates both).
#
# Safety gate: DOUBLE GATE in every env EXCEPT the allowlist
# (`development`, `test`). Production, staging, qa, demo, or any
# misconfigured env all require BOTH
#   1) `--force` is present on the rake command line, AND
#   2) ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW is set in the environment.
# Destructive ops opt OUT of safety, not IN.
#
# Audit log: every run that scans the legacy set writes
# `tmp/cleanup_legacy_leads_<unix>_<pid>.log` recording env, gate state,
# scanned ids, severed FK chains, and final deleted count. Persists across
# the delete — the rows are gone, the log is the only record.
#
# Idempotent: re-running with no legacy rows left is a no-op (0 deletes, audit
# log still written for traceability).

module Algorythmo
  module Tasks
    class CleanupLegacyLeads
      CONFIRM_TOKEN = 'YES_I_KNOW'
      AUDIT_PREFIX  = 'cleanup_legacy_leads'
      # Allowlist of envs that bypass the double gate. ANYTHING else
      # (production, staging, qa, demo, or a misconfigured env) goes
      # through both gates — destructive ops opt OUT of safety, not IN.
      UNGATED_ENVS = %w[development test].freeze

      class AbortedByGate < StandardError; end

      # rubocop:disable Metrics/ParameterLists
      def self.execute!(force:, confirm_env:, env: Rails.env, logger: Rails.logger, audit_dir: nil, output: $stdout)
        new(
          force: force,
          confirm_env: confirm_env,
          env: env,
          logger: logger,
          audit_dir: audit_dir,
          output: output
        ).execute!
      end

      def initialize(force:, confirm_env:, env:, logger:, audit_dir:, output:)
        # rubocop:enable Metrics/ParameterLists
        @force       = force
        @confirm_env = confirm_env
        @env         = env
        @logger      = logger
        @audit_dir   = audit_dir || Rails.root.join('tmp')
        @output      = output
      end

      def execute!
        gate_in_production!

        ids = nil
        deleted = nil
        audit_path = nil
        severed_chains = []
        Algorythmo::Lead.transaction do
          ids = legacy_scope.pluck(:id)
          # `previous_lead_id` has `on_delete: :nullify`. If any reopened
          # lead points its previous_lead_id at a legacy row, deleting
          # the legacy row silently severs that chain. Capture the
          # reverse-references before delete so forensics is possible
          # post-mortem (the rows still exist, just with NULL parent).
          severed_chains = Algorythmo::Lead.where(previous_lead_id: ids)
                                           .pluck(:id, :previous_lead_id)
          audit_path = write_audit_header(ids, severed_chains)
          # Delete by id-set (not scope re-evaluation) so the audit's
          # scanned_ids and deleted_count cannot drift if a concurrent
          # insert lands a fresh legacy-shaped row between the two queries.
          deleted = Algorythmo::Lead.where(id: ids).delete_all
        end
        write_audit_footer(audit_path, deleted)

        announce("[cleanup_legacy_leads] removed #{deleted} legacy lead(s). Audit log: #{audit_path}")

        { deleted: deleted, scanned: ids.size, audit_path: audit_path.to_s }
      end

      private

      def legacy_scope
        Algorythmo::Lead
          .where(channel_origin: [nil, ''])
          .where(last_message_at: nil)
      end

      def gate_in_production!
        return if UNGATED_ENVS.include?(@env.to_s)

        unless @force
          raise AbortedByGate,
                "Refusing to run in #{@env} without --force flag. " \
                'Invoke as: bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force'
        end

        return if @confirm_env == CONFIRM_TOKEN

        raise AbortedByGate,
              "Refusing to run in #{@env} without ALGORYTHMO_CLEANUP_CONFIRM=#{CONFIRM_TOKEN}."
      end

      def write_audit_header(ids, severed_chains)
        FileUtils.mkdir_p(@audit_dir)
        # PID suffix so two runs landing in the same second don't append
        # into the same file and mix scanned_ids of one with deleted_count
        # of the other (Time.now.to_i is second-resolution + non-monotonic).
        path = @audit_dir.join("#{AUDIT_PREFIX}_#{Time.now.to_i}_#{Process.pid}.log")
        File.open(path, 'a') do |f|
          f.puts('--- algorythmo:crm:cleanup_legacy_leads ---')
          f.puts("started_utc=#{Time.now.utc.iso8601}")
          f.puts("env=#{@env}")
          f.puts("force_flag=#{@force ? 'true' : 'false'}")
          f.puts("confirm_env_present=#{@confirm_env.present? ? 'true' : 'false'}")
          f.puts("scanned_count=#{ids.size}")
          f.puts("scanned_ids=#{ids.inspect}")
          # Chains severed by FK :nullify when the legacy rows are deleted.
          # Empty in the normal case. Format: [[reopened_id, legacy_id], ...]
          f.puts("severed_chain_count=#{severed_chains.size}")
          f.puts("severed_chains=#{severed_chains.inspect}")
        end
        path
      end

      def write_audit_footer(path, deleted_count)
        File.open(path, 'a') do |f|
          f.puts("deleted_count=#{deleted_count}")
          f.puts("completed_utc=#{Time.now.utc.iso8601}")
        end
      end

      def announce(line)
        @logger.info(line) if @logger.respond_to?(:info)
        @output.puts(line) if @output.respond_to?(:puts)
      end
    end
  end
end

namespace :algorythmo do
  namespace :crm do
    desc 'Delete legacy leads (channel_origin blank + last_message_at nil). Idempotent. Double-gated in production.'
    task cleanup_legacy_leads: :environment do
      Algorythmo::Tasks::CleanupLegacyLeads.execute!(
        force: ARGV.include?('--force'),
        confirm_env: ENV.fetch('ALGORYTHMO_CLEANUP_CONFIRM', nil)
      )
    rescue Algorythmo::Tasks::CleanupLegacyLeads::AbortedByGate => e
      abort("[cleanup_legacy_leads] ABORT: #{e.message}")
    end

    # Rake otherwise treats `--force` as an additional task name and crashes
    # with "Don't know how to build task '--force'". Define it once as a
    # deterministic no-op. Scope is limited to the single token we actually
    # accept (no ARGV iteration — that would extend arbitrary tasks).
    task :'--force' => :environment do
      # no-op — see comment above
    end
  end
end
