# frozen_string_literal: true

require 'securerandom'
require 'digest'
require 'base64'
require 'json'
require 'fileutils'

# Issues a new MCP bearer token for a user/account/scope triple.
#
# Security contract (D-A5):
#   - Raw token = 32 bytes from SecureRandom → URLSafe Base64 (43 chars).
#   - ONLY the SHA-256 hex digest is persisted to the DB (McpSession#token_hash).
#   - Raw token is written to a 0600 chmod file, NEVER echoed to logs, NEVER in CLI args.
#   - Redis cache pre-populated with session info (TTL 5min) to short-circuit per-call DB lookups.
#   - Returns the token ONCE in the result hash — caller (controller) writes it to file then discards.
#
# Token file path convention:
#   ~/.algorythmo/mcp/token-<session_uuid>
#   The founder pastes the command into Cursor mcp.json — gbrain reads the file, never the arg.
module Algorythmo
  module Brain
    class McpTokenIssuer
      # Raised when scope is not in Algorythmo::McpScopes::ALL.
      class InvalidScope < ArgumentError; end

      REDIS_CACHE_TTL = 300 # 5 minutes — short-circuit DB on per-call validation

      # @param user    [User]
      # @param account [Account]
      # @param scope   [String] one of Algorythmo::McpScopes::ALL
      # @return [Hash] { token:, session:, token_file_path:, command:, expires_at: }
      def self.call(user:, account:, scope:)
        new(user: user, account: account, scope: scope).call
      end

      def initialize(user:, account:, scope:)
        @user    = user
        @account = account
        @scope   = scope
      end

      def call
        validate_scope!

        raw_token  = generate_token
        token_hash = Digest::SHA256.hexdigest(raw_token)
        session    = create_session!(token_hash)

        populate_redis_cache(token_hash, session)

        build_result(raw_token, session)
      end

      private

      def create_session!(token_hash)
        McpSession.create!(
          user: @user,
          account: @account,
          token_hash: token_hash,
          scope: @scope,
          expires_at: 8.hours.from_now
        )
      end

      def build_result(raw_token, session)
        token_file_path = token_file_path_for(session.id)
        {
          token: raw_token,
          session: session,
          token_file_path: token_file_path,
          command: "gbrain serve --stdio --auth-file=#{token_file_path}",
          expires_at: session.expires_at
        }
      end

      def validate_scope!
        return if Algorythmo::McpScopes::ALL.include?(@scope)

        raise InvalidScope, "Unknown MCP scope: #{@scope.inspect}. Valid: #{Algorythmo::McpScopes::ALL.join(', ')}"
      end

      def generate_token
        # 32 bytes → 43-char URLSafe Base64 string (no padding)
        Base64.urlsafe_encode64(SecureRandom.bytes(32), padding: false)
      end

      def populate_redis_cache(token_hash, session)
        payload = JSON.generate(
          user_id: session.user_id,
          account_id: session.account_id,
          scope: session.scope,
          expires_at: session.expires_at.iso8601
        )
        redis_pool.with { |conn| conn.setex(redis_key(token_hash), REDIS_CACHE_TTL, payload) }
      rescue StandardError => e
        # Redis failure must NOT prevent token issuance. DB is the source of truth.
        # Log so the ops team can monitor degraded-cache mode.
        Rails.logger.warn("[McpTokenIssuer] Redis cache write failed — validator will fall back to DB. #{e.class}: #{e.message}")
      end

      def token_file_path_for(session_id)
        File.join(Dir.home, '.algorythmo', 'mcp', "token-#{session_id}")
      end

      def redis_key(token_hash)
        "mcp:token:#{token_hash}"
      end

      def redis_pool
        $alfred # rubocop:disable Style/GlobalVars
      end
    end
  end
end
