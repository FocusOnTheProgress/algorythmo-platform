# frozen_string_literal: true

# PR 0012-5 — Snapshot table for Brain history (Fatia 5).
#
# Design notes (plan §5):
# - One row per capture event per account — lightweight audit trail of brain growth.
# - stats (jsonb): raw output of `gbrain stats` at capture time (read-only, no lock).
# - diff_summary (text, null): human-readable delta vs. previous snapshot; null on first row.
# - trigger (string): upload / adjustment / manual / cron.
# - NO default_scope (D-A8): all queries must be explicit.
# - Fatia 3 (BrainDocumentIngestionWorker) and Fatia 4 (RawMarkdownIngestionWorker)
#   will wire SnapshotRecorder.record on their successful captures — those workers
#   do not yet exist at this PR's merge time (follow-up wiring in PR body).
class CreateAlgorythmoBrainSnapshots < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_brain_snapshots do |t|
      t.references :account,
                   null: false,
                   foreign_key: { to_table: :accounts },
                   index: true

      t.datetime :taken_at,    null: false
      t.jsonb    :stats,       null: false, default: {}
      t.text     :diff_summary
      t.string   :trigger,     null: false

      t.timestamps null: false
    end

    add_index :algorythmo_brain_snapshots, :taken_at
  end
end
