# frozen_string_literal: true

# Caps the number of concurrent gbrain read subprocesses (think/search) across the
# whole instance.
#
# Why this exists (§3.6 / P1-1): every `think` spawns a fresh bun + PGLite
# (Postgres-17 WASM) subprocess, each RAM-resident. On a 4 GB VPS shared by four
# services, an unbounded fan-out of interactive Copilot questions can OOM the box.
# The WriteLock already serialises writes; this serialises READ concurrency, which
# the WriteLock does not cover.
#
# Mechanism: a Redis counter incremented on acquire and decremented in an ensure.
# Each slot carries a TTL so a crashed holder cannot leak a permanent slot — the
# counter self-heals. We do NOT poll/block: a saturated semaphore raises Saturated
# immediately so the controller can return 429 ("too many questions at once"). For
# a low-volume interactive chat, failing fast with a clear retry beats queuing.
module Algorythmo
  module Brain
    class ConcurrencySemaphore
      KEY_PREFIX = 'gbrain:think:semaphore'

      # Max concurrent gbrain think subprocesses, instance-wide. Conservative for a
      # 4 GB VPS; tune via env once real RAM per subprocess is measured at deploy.
      MAX_CONCURRENCY = Integer(ENV.fetch('ALGORYTHMO_BRAIN_THINK_CONCURRENCY', 2))

      # Slot TTL. Must exceed the think READ_TIMEOUT (30s) with headroom so a slot is
      # reclaimed even if the holder is hard-killed mid-flight.
      SLOT_TTL = 60 # seconds

      # Raised when no slot is free. The controller maps this to HTTP 429.
      class Saturated < StandardError; end

      # Acquires one slot, yields, then releases in an ensure.
      # @raise [Saturated] if MAX_CONCURRENCY slots are already taken.
      def self.with_slot
        slot = acquire
        raise Saturated, "gbrain think concurrency cap reached (#{MAX_CONCURRENCY})" unless slot

        begin
          yield
        ensure
          release(slot)
        end
      end

      class << self
        private

        # Each slot is its own short-TTL key; the live count is the number of slot
        # keys present. A dead holder's key simply expires, so the count self-heals
        # without a sweeper. We probe slots 0..MAX-1 and claim the first free one
        # atomically via SET NX.
        def acquire
          (0...MAX_CONCURRENCY).each do |index|
            key = slot_key(index)
            claimed = redis_pool.with { |conn| conn.set(key, '1', nx: true, ex: SLOT_TTL) }
            return index if claimed
          end
          nil
        end

        def release(index)
          redis_pool.with { |conn| conn.del(slot_key(index)) }
        end

        def slot_key(index)
          "#{KEY_PREFIX}:#{index}"
        end

        def redis_pool
          $alfred # rubocop:disable Style/GlobalVars
        end
      end
    end
  end
end
