# frozen_string_literal: true

# T3 (PR M3-5) — Token store for MCP stdio sessions.
#
# Security model (D-A5):
#   - Raw bearer token is NEVER persisted. Only SHA-256 hex digest (token_hash).
#   - TTL 8h sliding: renewed on each per-call validation (touch_usage!).
#   - Revocation via UPDATE revoked_at — Redis cache may lag up to 5min (founder accepted D-A5).
#   - account_id is scaffold for M3.5 (brain-per-account via GBRAIN_DATABASE_URL, ADR-0014).
#     Day-1: always the single founder account.
class CreateMcpSessions < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_mcp_sessions, id: :uuid do |t|
      t.references :user,    null: false, foreign_key: { to_table: :users,    on_delete: :cascade }
      t.references :account, null: false, foreign_key: { to_table: :accounts, on_delete: :cascade }

      # SHA-256 hex digest of the raw bearer token. Raw token never stored.
      t.string  :token_hash, null: false

      # Enum: READ_TRUTH, READ_TIMELINE, WRITE_CAPTURE, ADMIN — see config/mcp_scopes.rb
      t.string  :scope, null: false

      t.datetime :expires_at,   null: false
      t.datetime :revoked_at                # NULL = active
      t.datetime :last_used_at              # updated on each per-call validation

      t.timestamps null: false
    end

    # Unique lookup by token hash on every MCP call — must be O(1).
    add_index :algorythmo_mcp_sessions, :token_hash, unique: true,
                                                     name: 'idx_mcp_sessions_token_hash'

    # Active-sessions index for revocation query (DELETE /brain/mcp_sessions).
    # Partial index: excludes already-revoked rows so the condition matches what
    # the query will filter on and the index stays small.
    add_index :algorythmo_mcp_sessions, %i[user_id account_id],
              where: 'revoked_at IS NULL',
              name: 'idx_mcp_sessions_active_per_user_account'
  end
end
