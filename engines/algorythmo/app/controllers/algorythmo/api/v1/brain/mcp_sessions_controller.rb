# frozen_string_literal: true

# DELETE /brain/mcp_sessions
#
# Revokes ALL active MCP sessions for current_user scoped to current_account.
# Best-effort Redis DEL is attempted on each cache key before the DB revocation.
#
# Cache eviction note (D-A5):
#   Sessions stay valid via Redis cache up to 5min after revoke. This is
#   acceptable for founder dogfooding — the 5-min window was explicitly
#   accepted (spike v3.0). M3.5 can tighten if PME clients require immediate
#   invalidation (add a Redis pub/sub event or reduce REDIS_CACHE_TTL).
class Algorythmo::Api::V1::Brain::McpSessionsController < Algorythmo::Api::V1::Brain::BaseController
  def destroy
    sessions = Algorythmo::McpSession.active.where(
      user_id:    current_user.id,
      account_id: current_account.id
    )

    # Best-effort Redis eviction before DB revocation.
    evict_redis_cache(sessions)

    # Bulk-revoke in DB. Uses update_all for efficiency — bypasses touch/callbacks
    # which is correct here (we want a timestamp set, not AR lifecycle).
    sessions.update_all(revoked_at: Time.current) # rubocop:disable Rails/SkipsModelValidations

    render json: { revoked: true }, status: :ok
  end

  private

  def evict_redis_cache(sessions)
    # Load only token_hashes — avoid instantiating full AR objects for a DEL op.
    token_hashes = sessions.pluck(:token_hash)
    return if token_hashes.empty?

    keys = token_hashes.map { |h| "mcp:token:#{h}" }

    # Pipeline the DEL calls — single round-trip regardless of session count.
    $alfred.with do |conn| # rubocop:disable Style/GlobalVars
      conn.del(*keys)
    end
  rescue StandardError => e
    # Redis DEL failure must NOT prevent DB revocation. Log and continue.
    Rails.logger.warn("[McpSessionsController] Redis eviction failed — DB revoke will still proceed. #{e.class}: #{e.message}")
  end
end
