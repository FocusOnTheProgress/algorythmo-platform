# frozen_string_literal: true

# Redis advisory lock serializing all writes to the GBrain subprocess.
#
# Why this exists (D-LOCK, ADR-0014 context, plan v5):
#   GBrain Day-1 uses PGLite (SQLite WAL under the hood). SQLite has an internal file lock,
#   but concurrent Ruby processes (Rails foreground, Sidekiq IngestionWorker, Sidekiq
#   SnapshotDiffWorker, MCP capture-from-Cursor path) racing to call `gbrain capture` or
#   `gbrain export` can hit "database is locked" errors before the subprocess even starts.
#   This advisory lock serialises at the Ruby level, preventing the race entirely.
#
# Interface frozen in PR M3-1.
# Full body (Redis SET NX EX + Lua atomic release) lands in PR M3-2.
# Stress test (Rails + Sidekiq + MCP simultaneous) validates in PR M3-1.5.
#
# Lock contention handling:
#   Raises LockContended immediately (does NOT busy-wait). Caller is responsible for
#   re-enqueueing. Sidekiq workers catch LockContended and re-enqueue with backoff
#   (2s / 4s / 8s, max 3 retries).
#
# M3.5 upgrade: lock key becomes per-account ("gbrain:write:lock:<account_id>")
#   so accounts do not contend with each other.
module Algorythmo
  module Brain
    class WriteLock
      LOCK_KEY = 'gbrain:write:lock'
      # Covers p99 of capture/export operations (empirically ~5-15s; 30s provides margin).
      LOCK_TTL = 30 # seconds

      # Acquires the advisory lock, yields the block, then releases.
      #
      # @param timeout [Integer] unused in skeleton; reserved for future blocking-acquire mode
      # @raise [LockContended] if the lock is already held by another process
      def self.with_lock(timeout: 5, &block)
        raise NotImplementedError, 'Brain::WriteLock.with_lock — full Redis body in PR M3-2'
      end

      # Raised when the advisory lock cannot be acquired (another process holds it).
      # Callers should re-enqueue with backoff rather than retrying inline.
      class LockContended < StandardError; end
    end
  end
end
