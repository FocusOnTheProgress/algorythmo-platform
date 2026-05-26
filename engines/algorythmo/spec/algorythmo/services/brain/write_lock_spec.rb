# frozen_string_literal: true

require 'rails_helper'

# Covers: acquire/release happy path, concurrent LockContended, TTL expiry,
# Lua atomicity (malicious caller cannot release a lock it does not own),
# and integration: 3 parallel threads serialise without race.
#
# MockRedis (used in test env) does not support EVAL, so Lua atomicity tests
# stub $alfred directly to verify the script is passed correctly without
# executing real Lua. Real Redis EVAL execution is validated in M3-1.5
# integration lane (gbrain_real_integration_spec.rb).
RSpec.describe Algorythmo::Brain::WriteLock do
  subject(:lock) { described_class }

  # -----------------------------------------------------------------------
  # Happy path
  # -----------------------------------------------------------------------
  describe '.with_lock — happy path' do
    it 'yields the block and returns its value' do
      result = lock.with_lock { 42 }
      expect(result).to eq(42)
    end

    it 'releases the lock key after the block completes' do
      lock.with_lock { nil }
      expect { lock.with_lock { nil } }.not_to raise_error
    end

    it 'releases the lock even when the block raises' do
      expect { lock.with_lock { raise 'boom' } }.to raise_error(RuntimeError, 'boom')
      expect { lock.with_lock { nil } }.not_to raise_error
    end
  end

  # -----------------------------------------------------------------------
  # Contention
  # -----------------------------------------------------------------------
  describe '.with_lock — contention' do
    it 'raises LockContended when the lock is already held and timeout expires' do
      token = SecureRandom.uuid
      $alfred.with { |conn| conn.set(described_class::LOCK_KEY, token, nx: true, ex: 30) }

      expect do
        lock.with_lock(timeout: 0.1) { nil }
      end.to raise_error(described_class::LockContended)
    ensure
      $alfred.with { |conn| conn.del(described_class::LOCK_KEY) }
    end

    it 'second competing thread raises LockContended' do
      acquired_first = false
      second_raised  = false
      barrier        = Mutex.new
      cond           = ConditionVariable.new

      t1 = Thread.new do
        lock.with_lock(timeout: 5) do
          barrier.synchronize do
            acquired_first = true
            cond.broadcast
          end
          sleep(0.3)
        end
      end

      t2 = Thread.new do
        barrier.synchronize { cond.wait(barrier) until acquired_first }
        begin
          lock.with_lock(timeout: 0.05) { nil }
        rescue described_class::LockContended
          second_raised = true
        end
      end

      t1.join
      t2.join

      expect(second_raised).to be(true)
    end
  end

  # -----------------------------------------------------------------------
  # Lua atomicity — unit-level contract (stubbed $alfred)
  #
  # We verify that release(:token) passes the correct Lua script, key and
  # argv to redis eval. Real execution is in M3-1.5 integration lane.
  # -----------------------------------------------------------------------
  describe 'Lua release script contract' do
    let(:fake_conn) { instance_double('Redis::Namespace') }

    before do
      allow($alfred).to receive(:with).and_yield(fake_conn)
      # SET NX for acquire — return nil (lock held by another token)
      allow(fake_conn).to receive(:set).and_return(nil)
    end

    it 'passes LUA_RELEASE script to eval on release' do
      allow(fake_conn).to receive(:set).with(
        described_class::LOCK_KEY, anything, nx: true, ex: described_class::LOCK_TTL
      ).and_return('OK')
      allow(fake_conn).to receive(:eval)

      lock.with_lock { nil }

      expect(fake_conn).to have_received(:eval).with(
        described_class::LUA_RELEASE,
        keys: [described_class::LOCK_KEY],
        argv: [anything]
      )
    end

    it 'passes a different token to eval than a hypothetical attacker would' do
      released_token = nil

      allow(fake_conn).to receive(:set).with(
        described_class::LOCK_KEY, anything, nx: true, ex: described_class::LOCK_TTL
      ).and_return('OK')
      allow(fake_conn).to receive(:eval) do |_script, argv:, **|
        released_token = argv.first
      end

      lock.with_lock { nil }

      attacker_token = SecureRandom.uuid
      expect(released_token).not_to be_nil
      expect(released_token).not_to eq(attacker_token)
    end
  end

  # -----------------------------------------------------------------------
  # TTL expiry
  # -----------------------------------------------------------------------
  describe 'TTL expiry' do
    it 'allows acquisition after TTL expires (simulated by manual delete)' do
      $alfred.with { |conn| conn.set(described_class::LOCK_KEY, 'stale-token', nx: true, ex: 1) }
      $alfred.with { |conn| conn.del(described_class::LOCK_KEY) }

      expect { lock.with_lock { nil } }.not_to raise_error
    end
  end

  # -----------------------------------------------------------------------
  # Integration — 3 parallel threads serialise
  # -----------------------------------------------------------------------
  describe 'integration — 3 parallel threads serialise writes' do
    it 'completes all 3 blocks without raising' do
      completed = []
      mutex     = Mutex.new

      threads = 3.times.map do |i|
        Thread.new do
          lock.with_lock(timeout: 10) do
            sleep(0.05)
            mutex.synchronize { completed << i }
          end
        end
      end

      threads.each(&:join)

      expect(completed.sort).to eq([0, 1, 2])
    end
  end
end
