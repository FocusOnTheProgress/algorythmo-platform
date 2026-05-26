# frozen_string_literal: true

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
# M3.5 upgrade (ADR-0015): lock key becomes per-account ("gbrain:write:lock:<account_id>")
#   so accounts do not contend with each other. account_id arg already accepted (ignored Day-1).
module Algorythmo
  module Brain
    class WriteLock
      LOCK_KEY = 'gbrain:write:lock'
      # Covers p99 of capture/export operations (empirically ~5-15s; 30s provides margin).
      LOCK_TTL = 30 # seconds

      POLL_INTERVAL = 0.05 # seconds between acquisition attempts

      LUA_RELEASE = <<~LUA.freeze
        if redis.call('GET', KEYS[1]) == ARGV[1] then
          return redis.call('DEL', KEYS[1])
        else
          return 0
        end
      LUA

      # Acquires the advisory lock, yields the block, then releases atomically via Lua.
      #
      # @param account_id [Integer, nil] reserved for M3.5 per-account lock key; ignored Day-1
      # @param timeout [Integer] seconds to poll before raising LockContended (default 5)
      # @raise [LockContended] if the lock cannot be acquired within timeout
      def self.with_lock(account_id: nil, timeout: 5, &block)
        token = SecureRandom.uuid
        acquired = acquire(token, timeout)
        raise LockContended, 'gbrain write lock held by another process' unless acquired

        begin
          block.call
        ensure
          release(token)
        end
      end

      # Raised when the advisory lock cannot be acquired within timeout.
      # Callers should re-enqueue with backoff rather than retrying inline.
      class LockContended < StandardError; end

      class << self
        private

        def acquire(token, timeout)
          deadline = Time.now + timeout
          loop do
            result = $alfred.with { |conn| conn.set(LOCK_KEY, token, nx: true, ex: LOCK_TTL) }
            return true if result
            return false if Time.now >= deadline

            sleep(POLL_INTERVAL)
          end
        end

        def release(token)
          $alfred.with { |conn| conn.eval(LUA_RELEASE, keys: [LOCK_KEY], argv: [token]) }
        end
      end
    end
  end
end
