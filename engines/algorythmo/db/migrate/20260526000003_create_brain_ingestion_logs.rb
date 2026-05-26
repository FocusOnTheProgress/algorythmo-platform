# frozen_string_literal: true

# PR M3-4 — Ingestion log table, one row per (account, conversation) pair.
#
# Design notes:
# - account_id is scaffold for M3.5 multi-tenant. Day-1 is always the founder account.
# - conversation_id ON DELETE CASCADE: when a conversation is hard-deleted, its ingestion
#   record goes with it — no orphan tracking of conversations that no longer exist.
# - unique index (account_id, conversation_id) enforces idempotency: the worker can safely
#   upsert and re-running will not duplicate rows.
# - Trigger BEFORE INSERT OR UPDATE enforces the invariant
#   algorythmo_brain_ingestion_logs.account_id = conversations.account_id.
#   Postgres rejects subqueries in CHECK constraints, so a trigger is the correct mechanism
#   (plan v5 §3 wording locked; engineer must not substitute a CHECK constraint).
class CreateBrainIngestionLogs < ActiveRecord::Migration[7.1]
  def up
    create_table :algorythmo_brain_ingestion_logs do |t|
      t.references :account,
                   null: false,
                   foreign_key: { to_table: :accounts },
                   index: false

      t.references :conversation,
                   null: false,
                   foreign_key: { to_table: :conversations, on_delete: :cascade },
                   index: false

      t.datetime  :brain_indexed_at
      t.string    :brain_page_path
      t.integer   :outcome, null: false, default: 0
      t.text      :last_error
      t.timestamps null: false
    end

    add_index :algorythmo_brain_ingestion_logs,
              %i[account_id conversation_id],
              unique: true,
              name: 'idx_brain_ingestion_logs_account_conversation'

    # Trigger: rejects rows where account_id diverges from conversations.account_id.
    # Postgres cannot enforce this via CHECK constraint (subquery in CHECK is forbidden).
    execute <<~SQL.squish
      CREATE OR REPLACE FUNCTION algorythmo_brain_ingestion_logs_account_check()
      RETURNS TRIGGER AS $$
      DECLARE
        conv_account_id INTEGER;
      BEGIN
        SELECT account_id INTO conv_account_id
          FROM conversations
         WHERE id = NEW.conversation_id;

        IF conv_account_id IS DISTINCT FROM NEW.account_id THEN
          RAISE EXCEPTION
            'algorythmo_brain_ingestion_logs: account_id (%) does not match conversations.account_id (%) for conversation_id (%)',
            NEW.account_id, conv_account_id, NEW.conversation_id;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER algorythmo_brain_ingestion_logs_account_check_trigger
        BEFORE INSERT OR UPDATE ON algorythmo_brain_ingestion_logs
        FOR EACH ROW EXECUTE FUNCTION algorythmo_brain_ingestion_logs_account_check();
    SQL
  end

  def down
    execute <<~SQL.squish
      DROP TRIGGER IF EXISTS algorythmo_brain_ingestion_logs_account_check_trigger
        ON algorythmo_brain_ingestion_logs;
      DROP FUNCTION IF EXISTS algorythmo_brain_ingestion_logs_account_check();
    SQL

    drop_table :algorythmo_brain_ingestion_logs
  end
end
