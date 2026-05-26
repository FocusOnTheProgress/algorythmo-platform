# frozen_string_literal: true

require 'digest'
require 'json'

# Per-call MCP token validator (D-A5).
#
# Validation order:
#   1. Hash incoming bearer. Look up Redis cache (TTL 5min).
#      Hit → return session info hash + touch_usage! on the DB session.
#   2. Redis miss (or Redis down) → look up DB via McpSession.active scope.
#      Hit → repopulate Redis 5min + touch_usage!.
#   3. DB miss → raise McpAuthExpired (credential failure).
#   4. Redis AND DB both unreachable → raise McpAuthUnavailable (infra failure).
#      Callers map these to distinct MCP error codes:
#        McpAuthExpired    → mcp/auth_expired
#        McpAuthUnavailable → mcp/auth_unavailable
#
# Day-1 stdio deferral note (v5):
#   Day-1 stdio carries no per-call account context. Single-account assumption
#   (ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']) guards correctness. M3.5: MCP transport
#   upgrades to HTTP+OAuth where account is in token claims → validator asserts
#   session.account_id == claim.account_id.
#
# Sentry breadcrumb is added on every auth failure so production failures are
# traceable without logging the raw token.
module Algorythmo
  module Brain
    class McpTokenValidator
      REDIS_CACHE_TTL = 300 # 5 minutes — match issuer TTL

      # Raised when the token is not found in either Redis or DB, or is revoked/expired.
      # Maps to MCP error code mcp/auth_expired.
      class McpAuthExpired < StandardError; end

      # Raised when Redis AND DB are both unreachable (infra failure, not credential failure).
      # Maps to MCP error code mcp/auth_unavailable.
      # Caller should NOT revoke the session — the credential may be valid once infra recovers.
      class McpAuthUnavailable < StandardError; end

      # @param token [String] raw URLSafe Base64 bearer token from the MCP client
      # @return [Hash] { user_id:, account_id:, scope:, expires_at: }
      # @raise [McpAuthExpired]     if token unknown, revoked, or expired
      # @raise [McpAuthUnavailable] if both Redis and DB are unreachable
      def self.call(token:)
        new(token: token).call
      end

      def initialize(token:)
        @token      = token
        @token_hash = Digest::SHA256.hexdigest(token)
      end

      def call
        info = lookup_redis || lookup_db
        enforce_primary_account!(info)
        info
      end

      private

      def lookup_redis
        raw = redis_pool.with { |conn| conn.get(redis_key) }
        return nil if raw.nil?

        info = JSON.parse(raw, symbolize_names: true)

        # Best-effort touch — Redis hit means session is likely still valid in DB.
        # Failure here does NOT block the auth response.
        touch_usage_async(info[:user_id])

        info
      rescue JSON::ParserError
        # Corrupted cache entry — treat as miss, fall through to DB.
        nil
      rescue StandardError => e
        # Redis down → fall through to DB lookup.
        log_redis_failure(e)
        nil
      end

      def lookup_db
        session = find_active_session_in_db

        if session.nil?
          add_sentry_breadcrumb('McpTokenValidator token not found or expired', nil)
          raise McpAuthExpired, 'MCP token not found, revoked, or expired'
        end

        info = session_to_info(session)
        populate_redis_cache(info)
        session.touch_usage!
        info
      end

      def find_active_session_in_db
        McpSession.active.find_by(token_hash: @token_hash)
      rescue StandardError => e
        add_sentry_breadcrumb('McpTokenValidator DB unreachable', e)
        raise McpAuthUnavailable, "MCP auth DB unreachable: #{e.class}: #{e.message}"
      end

      def touch_usage_async(user_id)
        # We have the user_id from Redis but not the session object.
        # Look up only when we have a cache hit — use find_by so we don't raise.
        session = McpSession.active.find_by(token_hash: @token_hash, user_id: user_id)
        session&.touch_usage!
      rescue StandardError
        # Touch failure must never fail the auth response.
        nil
      end

      def populate_redis_cache(info)
        payload = JSON.generate(info)
        redis_pool.with { |conn| conn.setex(redis_key, REDIS_CACHE_TTL, payload) }
      rescue StandardError => e
        # Redis repopulation failure is non-fatal — next call just hits DB again.
        Rails.logger.warn("[McpTokenValidator] Redis repopulation failed. #{e.class}: #{e.message}")
      end

      def session_to_info(session)
        {
          user_id: session.user_id,
          account_id: session.account_id,
          scope: session.scope,
          expires_at: session.expires_at.iso8601
        }
      end

      # Day-1 invariant: the only legitimate account is the founder's
      # (ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']). gbrain consumes the validator
      # response directly over MCP and does NOT pass through Chatwoot's
      # TenantResolution concern, so we must enforce the assumption here
      # rather than leaning on the web side. M3.5: this gate is replaced by
      # token-claim ↔ session account_id matching.
      def enforce_primary_account!(info)
        expected = ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence
        return unless expected
        return if info[:account_id].to_s == expected.to_s

        add_sentry_breadcrumb('McpTokenValidator account_id mismatch', nil)
        raise McpAuthExpired, 'MCP token account_id does not match primary account'
      end

      def redis_key
        "mcp:token:#{@token_hash}"
      end

      def log_redis_failure(err)
        Rails.logger.warn("[McpTokenValidator] Redis lookup failed — falling back to DB. #{err.class}: #{err.message}")
      end

      def add_sentry_breadcrumb(message, err)
        return unless defined?(Sentry)

        Sentry.add_breadcrumb(
          Sentry::Breadcrumb.new(
            message: message,
            category: 'mcp.auth',
            level: 'warning',
            data: err ? { error_class: err.class.to_s, error_message: err.message } : {}
          )
        )
      end

      def redis_pool
        $alfred # rubocop:disable Style/GlobalVars
      end
    end
  end
end
