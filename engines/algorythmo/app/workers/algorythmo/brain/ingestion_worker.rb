# frozen_string_literal: true

require 'tmpdir'

module Algorythmo
  module Brain
    # Sidekiq worker: ingests resolved conversations into GBrain.
    #
    # - Daily batch (02:00) when conversation_id is nil.
    # - Single-conversation mode when conversation_id is provided.
    # - Forward-only gate: skips conversations before account.algorythmo_m3_start_date (D-ING).
    # - Idempotent: upserts on (account_id, conversation_id); second run is a no-op.
    # - LockContended re-raises → Sidekiq retry (max 3, backoff 2s/4s/8s).
    # - Other exceptions: write outcome: :failed + last_error, then re-raise.
    # - account_id scaffold for M3.5 multi-tenant. Day-1: always the founder account.
    class IngestionWorker
      include Sidekiq::Worker

      sidekiq_options queue: :default, retry: 3

      def perform(account_id, conversation_id = nil)
        # D-A8: Current.account must be set before any query.
        Current.account = Account.find(account_id)
        account = Current.account

        conversations = conversation_id ? single_scope(account, conversation_id) : batch_scope(account)
        conversations.each { |conv| ingest_one(account_id, conv) }
      end

      private

      # Applies the forward-only gate to a single conversation lookup.
      def single_scope(account, conversation_id)
        account.conversations
               .where(id: conversation_id)
               .where('conversations.created_at > ?', account.algorythmo_m3_start_date)
               .to_a
      end

      # Returns unindexed resolved conversations created after algorythmo_m3_start_date.
      def batch_scope(account)
        already_indexed = Algorythmo::Brain::IngestionLog
                          .where(account_id: account.id, outcome: :success)
                          .select(:conversation_id)

        account.conversations
               .where(status: :resolved)
               .where('conversations.created_at > ?', account.algorythmo_m3_start_date)
               .where.not(id: already_indexed)
      end

      def ingest_one(account_id, conversation)
        return if conversation.nil?

        Algorythmo::Brain::WriteLock.with_lock(account_id: account_id) do
          page_path = Algorythmo::Brain::Client.new(account_id).capture(
            file: write_tmp_file(conversation)
          )
          upsert_log(account_id, conversation, outcome: :success,
                                               brain_indexed_at: Time.current,
                                               brain_page_path: page_path.to_s)
        end
      rescue Algorythmo::Brain::WriteLock::LockContended => e
        Rails.logger.warn("[Algorythmo::Brain::IngestionWorker] Lock contended conversation=#{conversation.id}: #{e.message}")
        raise # Sidekiq retry handles backoff (2s/4s/8s, max 3)
      rescue StandardError => e
        record_failure(account_id, conversation, e)
        raise
      end

      # Writes markdown to a tempfile and returns path. Caller (capture) reads synchronously.
      # Temp dir is not cleaned up — OS reclaims on reboot; files are < 100 KB per conversation.
      def write_tmp_file(conversation)
        markdown = Algorythmo::Brain::ConversationToMarkdown.call(conversation)
        dir  = Dir.mktmpdir('algorythmo_brain_')
        path = File.join(dir, "conversation_#{conversation.id}.md")
        File.write(path, markdown)
        path
      end

      def upsert_log(account_id, conversation, attrs)
        Algorythmo::Brain::IngestionLog
          .find_or_initialize_by(account_id: account_id, conversation_id: conversation.id)
          .update!(attrs)
      end

      def record_failure(account_id, conversation, exception)
        upsert_log(account_id, conversation,
                   outcome: :failed,
                   last_error: exception.message.to_s.truncate(1000))
        add_sentry_breadcrumb(conversation, exception)
      end

      def add_sentry_breadcrumb(conversation, exception)
        return unless defined?(Sentry)

        Sentry.add_breadcrumb(
          Sentry::Breadcrumb.new(
            category: 'brain.ingestion',
            message:  "Ingestion failed conversation=#{conversation.id}: #{exception.class}",
            level:    'error',
            data:     {
              conversation_id: conversation.id,
              account_id:      conversation.account_id,
              error_class:     exception.class.name,
              error_message:   exception.message.to_s.truncate(200)
            }
          )
        )
      end
    end
  end
end
