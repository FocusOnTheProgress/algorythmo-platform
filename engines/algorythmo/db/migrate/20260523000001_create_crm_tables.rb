# frozen_string_literal: true

# A.1 — CRM tables: algorythmo_pipelines, algorythmo_stages, algorythmo_leads
# Indices chosen for three distinct hot paths:
#   (1) Partial unique on (contact_id, account_id) scoped to stage_kind=0 (open) — DB-level idempotency (F2/F8)
#       stage_kind is denormalised from algorythmo_stages.kind so that the partial-index predicate is a simple
#       integer equality — Postgres does not accept subqueries in partial-index WHERE clauses.
#   (2) (stage_id, stage_entered_at DESC) — aging signal ordering for D10 chip
#   (3) (account_id, stage_id, position) — Kanban cursor pagination (A.11, P2)
class CreateCrmTables < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_pipelines do |t|
      t.references :account, null: false, foreign_key: true
      t.string :name, null: false
      t.timestamps
    end

    create_table :algorythmo_stages do |t|
      t.references :pipeline, null: false,
                              foreign_key: { to_table: :algorythmo_pipelines }
      t.string  :name,              null: false
      t.integer :position,          null: false, default: 0
      t.integer :kind,              null: false, default: 0 # enum: open, won, lost
      t.float   :aging_coefficient, null: false, default: 1.0 # D10
      t.timestamps
    end

    create_table :algorythmo_leads do |t|
      t.references :account, null: false, foreign_key: true
      t.references :contact, null: false, foreign_key: { on_delete: :cascade }
      t.references :stage,   null: false,
                             foreign_key: { to_table: :algorythmo_stages }
      t.float     :position
      t.integer   :stage_kind,      null: false, default: 0 # algorythmo: denormalised from stage.kind for partial-index predicate
      t.bigint    :previous_lead_id   # chain reference (C2/A.5) — FK managed manually below with on_delete: :nullify
      t.string    :channel_origin     # D6: whatsapp/email/instagram/widget/api/etc.
      t.jsonb     :channel_metadata   # D6: handle, phone, email domain, avatar URL, etc.
      t.jsonb     :custom_fields
      t.timestamp :stage_entered_at   # D10: resets to Time.current on every stage transition
      t.timestamp :closed_at          # C2: set when stage kind = won|lost
      t.timestamp :last_message_at    # C2: updated by listener on every incoming message
      t.boolean   :deleted,           null: false, default: false # soft delete (A.7)
      t.timestamps
    end

    # previous_lead_id FK: nullify on delete so the chain history is preserved but not broken.
    add_foreign_key :algorythmo_leads, :algorythmo_leads,
                    column: :previous_lead_id,
                    on_delete: :nullify

    # (1) DB-level idempotency: one open Lead per contact per account.
    # stage_kind is denormalised here (kept in sync by Lead#sync_stage_kind before_save callback)
    # so the predicate is a plain integer equality — Postgres rejects subqueries in partial-index WHERE.
    add_index :algorythmo_leads, %i[contact_id account_id],
              unique: true,
              where: 'stage_kind = 0',
              name: 'idx_leads_open_unique_per_contact'

    # (2) Aging signal ordering — used by the Kanban API to sort cards by time-in-stage.
    add_index :algorythmo_leads, %i[stage_id stage_entered_at],
              name: 'idx_leads_stage_entered_at',
              order: { stage_entered_at: :desc }

    # (3) Cursor pagination index — covers (account_id, stage_id, position) for A.11.
    add_index :algorythmo_leads, %i[account_id stage_id position],
              name: 'idx_leads_kanban_cursor'

    # Retro-populate stage_entered_at for any pre-existing leads (safe on greenfield;
    # necessary if this migration runs during a future upstream sync with existing data).
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE algorythmo_leads SET stage_entered_at = created_at WHERE stage_entered_at IS NULL
        SQL
      end
    end
  end
end
