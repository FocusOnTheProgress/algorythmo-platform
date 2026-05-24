# frozen_string_literal: true

# PR 2 (M1-C) — Append-only history table for Lead stage transitions.
#
# Design notes:
# - No updated_at: records are immutable by contract (readonly? in model).
# - lead_id on_delete: :cascade — hard-deleting a lead also purges its history.
#   Soft-delete (leads.deleted=true) does NOT cascade — history is preserved.
# - to_stage_id on_delete: :restrict — prevents deleting a Stage that history
#   points to. Stages are effectively archived, not hard-deleted.
# - from_stage_id on_delete: :nullify — safe to nullify; NULL already represents
#   "lead was created" in the first entry.
# - Two indexes built now (greenfield, zero CONCURRENTLY cost):
#     (lead_id, created_at) — hot path: history for a single lead in chron order.
#     (to_stage_id, created_at) — future dashboard (M3): "transitions into stage X per month".
class CreateAlgorythmoStageHistories < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_stage_histories do |t|
      t.references :lead, null: false,
                          foreign_key: { to_table: :algorythmo_leads, on_delete: :cascade },
                          index: false
      t.references :from_stage, null: true,
                                foreign_key: { to_table: :algorythmo_stages, on_delete: :nullify }
      t.references :to_stage, null: false,
                              foreign_key: { to_table: :algorythmo_stages, on_delete: :restrict }
      t.string  :actor_type, null: false
      t.bigint  :actor_id,   null: true
      t.timestamp :created_at, null: false
    end

    add_index :algorythmo_stage_histories, %i[lead_id created_at],
              name: 'idx_stage_histories_lead_chrono'

    add_index :algorythmo_stage_histories, %i[to_stage_id created_at],
              name: 'idx_stage_histories_stage_chrono'
  end
end
