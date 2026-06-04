# frozen_string_literal: true

# PR3 (plan 0012 §5) — uploaded-document pipeline table.
#
# One row per uploaded knowledge document. The blob itself lives in Active Storage
# (has_one_attached :file), not in this table — only metadata + ingestion state here.
#
# Design notes:
# - account_id is the multi-tenant scaffold (same pattern as the ingestion_logs table).
#   Each account's documents feed its own isolated brain (GBRAIN_HOME, P0-5).
# - user_id ON DELETE NULLIFY: a document outlives the admin who uploaded it. We keep
#   the knowledge in the brain even if the uploader is later removed.
# - status enum tracks the async pipeline: pending → extracting → captured | failed.
# - brain_page_path is the capture() return — the link back into "Ver". Null until captured.
# - last_error caps at 1000 chars (matches ingestion_logs.last_error truncation).
# - index (account_id, status) backs the paginated "Ver" listing (newest pending/failed/etc.).
# - NO default_scope (D-A8) — all queries explicit at the call site.
class CreateAlgorythmoBrainDocuments < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_brain_documents do |t|
      t.references :account,
                   null: false,
                   foreign_key: { to_table: :accounts },
                   index: true

      t.references :user,
                   null: true,
                   foreign_key: { to_table: :users, on_delete: :nullify },
                   index: false

      t.string  :filename,        null: false
      t.string  :content_type,    null: false
      t.bigint  :byte_size,       null: false
      t.string  :category,        null: false
      t.integer :status,          null: false, default: 0
      t.string  :brain_page_path, null: true
      t.string  :last_error, limit: 1000, null: true

      t.timestamps null: false
    end

    add_index :algorythmo_brain_documents,
              %i[account_id status],
              name: 'idx_brain_documents_account_status'
  end
end
