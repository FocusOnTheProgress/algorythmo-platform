# frozen_string_literal: true

# §8.3 cleanup_legacy_leads — hard-deletes leads created before CrmListener
# was wired. Legacy signature: channel_origin blank/nil AND last_message_at nil
# (the listener always populates both).
#
# Production safety: DOUBLE GATE. Aborts unless BOTH
#   1) `--force` is present on the rake command line, AND
#   2) ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW is set in the environment.
# Dev / test / staging bypass both gates — delete is unconditional there.
#
# Audit log: every run that scans the legacy set writes
# `tmp/cleanup_legacy_leads_<unix>.log` recording env, gate state, scanned ids
# and final deleted count. Persists across the delete — the rows are gone, the
# log is the only record.
#
# Idempotent: re-running with no legacy rows left is a no-op (0 deletes, audit
# log still written for traceability).

module Algorythmo
  module Tasks
    class CleanupLegacyLeads
      CONFIRM_TOKEN = 'YES_I_KNOW'
      AUDIT_PREFIX  = 'cleanup_legacy_leads'

      class AbortedByGate < StandardError; end

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
        @force       = force
        @confirm_env = confirm_env
        @env         = env
        @logger      = logger
        @audit_dir   = audit_dir || Rails.root.join('tmp')
        @output      = output
      end

      def execute!
        gate_in_production!

        ids = legacy_scope.pluck(:id)
        audit_path = write_audit_header(ids)

        deleted = legacy_scope.delete_all
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
        return unless @env.production?

        unless @force
          raise AbortedByGate,
                'Refusing to run in production without --force flag. ' \
                'Invoke as: bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force'
        end

        return if @confirm_env == CONFIRM_TOKEN

        raise AbortedByGate,
              "Refusing to run in production without ALGORYTHMO_CLEANUP_CONFIRM=#{CONFIRM_TOKEN}."
      end

      def write_audit_header(ids)
        FileUtils.mkdir_p(@audit_dir)
        path = @audit_dir.join("#{AUDIT_PREFIX}_#{Time.now.to_i}.log")
        File.open(path, 'a') do |f|
          f.puts('--- algorythmo:crm:cleanup_legacy_leads ---')
          f.puts("started_utc=#{Time.now.utc.iso8601}")
          f.puts("env=#{@env}")
          f.puts("force_flag=#{@force ? 'true' : 'false'}")
          f.puts("confirm_env_present=#{(!@confirm_env.nil? && !@confirm_env.empty?) ? 'true' : 'false'}")
          f.puts("scanned_count=#{ids.size}")
          f.puts("scanned_ids=#{ids.inspect}")
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
      begin
        Algorythmo::Tasks::CleanupLegacyLeads.execute!(
          force: ARGV.include?('--force'),
          confirm_env: ENV['ALGORYTHMO_CLEANUP_CONFIRM']
        )
      rescue Algorythmo::Tasks::CleanupLegacyLeads::AbortedByGate => e
        abort("[cleanup_legacy_leads] ABORT: #{e.message}")
      ensure
        # Rake otherwise treats `--force` as an additional task name and crashes
        # with "Don't know how to build task '--force'". Stub it as a no-op.
        ARGV.each { |arg| task arg.to_sym do; end }
      end
    end
  end
end
