# frozen_string_literal: true

# algorythmo: telemetry-placeholder-a5
# Creates telemetry_events table — empty schema placeholder per decision A5.
# No ingest job or endpoint in M0. Only schema + indices are created here.
# Future: add AlgorythmoTelemetryJob when telemetry collection is planned (post-MVP).
class CreateTelemetryEvents < ActiveRecord::Migration[7.1]
  def change
    create_table :telemetry_events do |t|
      t.bigint :account_id, null: false
      t.string :event_type, null: false, limit: 255
      t.jsonb :payload, default: {}
      t.datetime :created_at, null: false, precision: 6

      t.index :account_id
      t.index :created_at
      t.index %i[account_id created_at]
    end

    add_foreign_key :telemetry_events, :accounts, on_delete: :cascade
  end
end
