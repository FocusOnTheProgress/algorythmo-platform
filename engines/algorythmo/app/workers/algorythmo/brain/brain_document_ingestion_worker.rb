# frozen_string_literal: true

require 'fileutils'
require 'tmpdir'

module Algorythmo
  module Brain
    # Sidekiq worker: ingests one uploaded document into the brain (plan 0012 §2.3).
    #
    # Pipeline:
    #   a. download the Active Storage blob to an ephemeral tmpfile (removed in ensure)
    #   b. extract text/markdown by type (DocumentExtractor — text only, no render/macro)
    #   c. wrap it in frontmatter (titulo / categoria / origem / data)
    #   d. WriteLock.with_lock(account_id:) { Client.new(account_id).capture(file: md_path) }
    #   e. status -> captured + brain_page_path  |  failed + last_error
    #
    # Idempotent: a document already in `captured` is a no-op (safe to re-run / retry).
    # LockContended re-raises so Sidekiq retries with backoff (2s/4s/8s, max 3) without
    # marking the document failed — contention is a retry condition, not a failure.
    #
    # ::Sidekiq::Worker is fully qualified: inside `module Algorythmo` a bare
    # `include Sidekiq::Worker` resolves to Algorythmo::Sidekiq and breaks (project lesson).
    class BrainDocumentIngestionWorker
      include ::Sidekiq::Worker

      sidekiq_options queue: :default, retry: 3

      def perform(account_id, document_id)
        Current.account = Account.find(account_id)

        document = Algorythmo::Brain::Document.find_by(id: document_id, account_id: account_id)
        return if document.nil?
        return if document.status_captured?

        ingest(account_id, document)
      end

      private

      def ingest(account_id, document)
        document.update!(status: :extracting, last_error: nil)

        with_tmp_markdown(document) do |md_path|
          Algorythmo::Brain::WriteLock.with_lock(account_id: account_id) do
            result = Algorythmo::Brain::Client.new(account_id).capture(file: md_path)
            document.update!(status: :captured, brain_page_path: extract_page_path(result))
          end
        end
      rescue Algorythmo::Brain::WriteLock::LockContended => e
        Rails.logger.warn("[Algorythmo::Brain::BrainDocumentIngestionWorker] Lock contended document=#{document.id}: #{e.message}")
        raise # Sidekiq retry handles backoff; do NOT mark failed
      rescue StandardError => e
        record_failure(document, e)
        raise
      end

      # Downloads the blob, builds the frontmatter'd markdown, yields its path, and
      # removes the tmpdir on return — no /tmp leak across thousands of uploads.
      def with_tmp_markdown(document)
        dir = Dir.mktmpdir('algorythmo_brain_doc_')
        blob_path = File.join(dir, "blob_#{document.id}#{File.extname(document.filename)}")
        document.file.blob.open(tmpdir: dir) { |f| FileUtils.cp(f.path, blob_path) }

        text = Algorythmo::Brain::DocumentExtractor.call(blob_path: blob_path, content_type: document.content_type)
        md_path = File.join(dir, "document_#{document.id}.md")
        File.write(md_path, with_frontmatter(document, text))

        yield md_path
      ensure
        FileUtils.rm_rf(dir) if dir
      end

      # Frontmatter so the brain page is self-describing: title, category, origin, date.
      # Dynamic scalars are JSON-encoded — valid YAML for scalars — so a filename
      # carrying a newline or colon cannot break out of or inject into the frontmatter.
      def with_frontmatter(document, body)
        <<~MARKDOWN
          ---
          titulo: #{document.filename.to_json}
          categoria: #{document.category.to_json}
          origem: "documento anexado"
          data: #{document.created_at.iso8601.to_json}
          ---

          #{body}
        MARKDOWN
      end

      # capture --json returns { ..., path, slug, ... }; `path` is the canonical write
      # destination, `slug` identifies the page. (page_path kept as a defensive fallback.)
      def extract_page_path(result)
        return nil unless result.is_a?(Hash)

        %w[path slug page_path]
          .map { |key| result[key] || result[key.to_sym] }
          .find { |value| value.is_a?(String) && !value.empty? }
      end

      def record_failure(document, exception)
        document.update!(status: :failed, last_error: exception.message.to_s.truncate(1000))
        add_sentry_breadcrumb(document, exception)
      end

      def add_sentry_breadcrumb(document, exception)
        return unless defined?(Sentry)

        Sentry.add_breadcrumb(
          Sentry::Breadcrumb.new(
            category: 'brain.document_ingestion',
            message: "Document ingestion failed document=#{document.id}: #{exception.class}",
            level: 'error',
            data: {
              document_id: document.id,
              account_id: document.account_id,
              error_class: exception.class.name,
              error_message: exception.message.to_s.truncate(200)
            }
          )
        )
      end
    end
  end
end
