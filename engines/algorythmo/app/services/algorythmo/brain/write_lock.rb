# frozen_string_literal: true

require 'securerandom'

# Redis advisory lock serializing all writes to the GBrain subprocess.
#
# Why this exists (D-LOCK, plan v5):
#   GBrain Day-1 uses PGLite (SQLite WAL under the hood). SQLite has an internal file lock,
#   but concurrent Ruby processes (Rails foreground, Sidekiq IngestionWorker, Sidekiq
#   SnapshotDiffWorker, MCP capture-from-Cursor path) racing to call `gbrain capture` or
#   `gbrain export` can hit "database is locked" errors before the subprocess even starts.
#   This advisory lock serialises at the Ruby level, preventing the race entirely.
#
# Lock contention handling:
#   Polls up to `timeout` seconds (0.05s intervals) before raising LockContended.
#   Callers in Sidekiq workers should catch LockContended and re-enqueue with backoff
#   (2s / 4s / 8s, max 3 retries).
#
# Per-account lock key (P0-5 / ADR-0015): "gbrain:write:lock:<account_id>" so accounts
#   never contend with each other. Each account writes to its own GBRAIN_HOME brain.
module Algorythmo
  module Brain
    class WriteLock
      LOCK_KEY_PREFIX = 'gbrain:write:lock'

      # TTL must exceed WRITE_TIMEOUT (60s) with headroom.
      # WRITE_TIMEOUT=60s + 30s slop = 90s. Prevents lock expiring mid-write.
      LOCK_TTL = 90 # seconds

      POLL_INTERVAL = 0.05 # seconds between acquisition attempts

      LUA_RELEASE = <<~LUA
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        else
          return 0
        end
      LUA

      # Builds the per-account Redis lock key. A nil account_id would collide all
      # callers onto one key, so it is rejected.
      def self.lock_key(account_id)
        raise ArgumentError, 'account_id is required for the brain write lock' if account_id.nil?

        "#{LOCK_KEY_PREFIX}:#{account_id}"
      end

      # Acquires the advisory lock, yields the block, then releases atomically via Lua.
      #
      # @param account_id [Integer] selects the per-account lock key (required — P0-5)
      # @param timeout [Integer] seconds to poll before raising LockContended (default 5)
      # @raise [LockContended] if the lock cannot be acquired within timeout
      # @raise [ArgumentError] if account_id is nil
      def self.with_lock(account_id:, timeout: 5)
        key      = lock_key(account_id)
        token    = SecureRandom.uuid
        unless acquire(key, token, timeout)
          raise LockContended,
                "gbrain write lock held by another process — account=#{account_id} token=#{token[0, 8]}… timeout=#{timeout}s"
        end

        begin
          yield
        ensure
          release(key, token)
        end
      end

      # Raised when the advisory lock cannot be acquired within timeout.
      # Message includes token prefix and timeout for 3am triage.
      # Callers should re-enqueue with backoff rather than retrying inline.
      class LockContended < StandardError; end

      class << self
        private

        def acquire(key, token, timeout)
          deadline = Time.current + timeout
          loop do
            result = redis_pool.with { |conn| conn.set(key, token, nx: true, ex: LOCK_TTL) }
            return true if result
            return false if Time.current >= deadline

            sleep(POLL_INTERVAL)
          end
        end

        def release(key, token)
          redis_pool.with { |conn| conn.eval(LUA_RELEASE, keys: [key], argv: [token]) }
        end

        # Encapsulates Chatwoot's global Redis pool ($alfred) behind a method so
        # callers are not coupled to the global variable and specs can stub cleanly.
        # $alfred is defined in config/initializers/01_redis.rb and is the project
        # convention (Style/GlobalVars excluded for initializers, not for engine code).
        def redis_pool
          $alfred # rubocop:disable Style/GlobalVars
        end
      end
    end
  end
end
