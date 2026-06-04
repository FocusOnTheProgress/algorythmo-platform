# frozen_string_literal: true

module Algorythmo
  module Brain
    # An uploaded knowledge document on its way into the brain (plan 0012 §5).
    #
    # Lifecycle (status enum):
    #   pending(0)    — row created, blob stored, worker enqueued, not yet picked up
    #   extracting(1) — worker is converting the blob to markdown
    #   captured(2)   — markdown ingested into the brain; brain_page_path populated
    #   failed(3)     — extraction or capture raised; last_error populated
    #
    # The blob lives in Active Storage (has_one_attached :file), never in the DB.
    # account_id scopes the document to one tenant's isolated brain (P0-5).
    # NO default_scope — all queries explicit (D-A8).
    class Document < Algorythmo::ApplicationRecord
      self.table_name = 'algorythmo_brain_documents'

      # Extensions the upload pipeline accepts (plan §4.3 allowlist). Anything else
      # is rejected at the controller before the blob ever touches disk.
      ALLOWED_EXTENSIONS = %w[.pdf .docx .md .txt].freeze

      # Content categories surfaced in the "Ajustar" dropzone (plan §11 — 6 chips,
      # of which "todos" is a UI filter, not a real category).
      # "ajuste" is reserved for pasted-text entries created by AdjustmentsController
      # (plan 0012 §6, PR4 — "colar conhecimento" flow).
      CATEGORIES = %w[policies manuals rules design_system other ajuste].freeze

      # Hard ceiling on upload size (plan §4.3). 10 MiB.
      MAX_BYTE_SIZE = 10 * 1024 * 1024

      has_one_attached :file

      belongs_to :account
      belongs_to :user, optional: true

      enum status: { pending: 0, extracting: 1, captured: 2, failed: 3 }, _prefix: :status

      validates :filename,     presence: true
      validates :content_type, presence: true
      validates :byte_size,    presence: true,
                               numericality: { only_integer: true, greater_than: 0, less_than_or_equal_to: MAX_BYTE_SIZE }
      validates :category,     presence: true, inclusion: { in: CATEGORIES }
    end
  end
end
