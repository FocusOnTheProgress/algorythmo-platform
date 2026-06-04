# frozen_string_literal: true

# Per-user rate limit for Copilot questions.
#
# Why (§4.5): each question triggers a `think` → a DeepSeek call (cost + latency).
# A fixed-window counter per user caps abuse and runaway loops. We keep it in the
# engine (not Rack::Attack) so it is unit-testable and the limit lives next to the
# feature it protects.
module Algorythmo
  module Brain
    class CopilotRateLimiter
      KEY_PREFIX = 'gbrain:copilot:ratelimit'

      # Max questions per user per window.
      MAX_REQUESTS = Integer(ENV.fetch('ALGORYTHMO_COPILOT_RATE_LIMIT', 20))

      # Fixed window length in seconds.
      WINDOW = Integer(ENV.fetch('ALGORYTHMO_COPILOT_RATE_WINDOW', 60))

      # @param account_id [Integer]
      # @param user_id [Integer]
      # @return [Boolean] true if the request is within the limit (and was counted),
      #   false if the user has exhausted the window.
      def self.allow?(account_id:, user_id:)
        key = key_for(account_id, user_id)
        count = redis_pool.with do |conn|
          current = conn.incr(key)
          conn.expire(key, WINDOW) if current == 1
          current
        end
        count <= MAX_REQUESTS
      end

      def self.key_for(account_id, user_id)
        "#{KEY_PREFIX}:#{account_id}:#{user_id}"
      end

      def self.redis_pool
        $alfred # rubocop:disable Style/GlobalVars
      end
    end
  end
end
