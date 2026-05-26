# frozen_string_literal: true

require 'rails_helper'

# Covers: acquire/release happy path, concurrent LockContended, TTL expiry,
# Lua atomicity contract, and integration: 3 parallel threads serialise without race.
#
# MockRedis (test env) does not support EVAL for Lua scripts. All examples that
# exercise the full with_lock path stub WriteLock.redis_pool with a pool double
# whose connection supports both SET NX and EVAL. Real Lua execution is covered by
# PR M3-1.5 integration lane (gbrain_real_integration_spec.rb).
RSpec.describe Algorythmo::Brain::WriteLock do
  subject(:lock) { described_class }

  # ---------------------------------------------------------------------------
  # Shared helpers
  # ---------------------------------------------------------------------------

  # Returns a fake Redis connection double that supports the operations we need.
  # `held:` controls whether SET NX succeeds (true = lock free, false = contended).
  def build_fake_conn(held: false)
    conn = instance_double(Redis::Namespace)
    allow(conn).to receive(:set).and_return(held ? 'OK' : nil)
    allow(conn).to receive(:eval).and_return(1) # Lua DEL success
    allow(conn).to receive(:del)
    conn
  end

  # Stubs WriteLock.redis_pool to yield the given connection object.
  def stub_redis_pool(conn)
    pool = instance_double(ConnectionPool)
    allow(described_class).to receive(:redis_pool).and_return(pool)
    allow(pool).to receive(:with).and_yield(conn)
    pool
  end

  # ---------------------------------------------------------------------------
  # Happy path
  # ---------------------------------------------------------------------------
  describe '.with_lock — happy path' do
    before { stub_redis_pool(build_fake_conn(held: true)) }

    it 'yields the block and returns its value' do
      result = lock.with_lock { 42 }
      expect(result).to eq(42)
    end

    it 'releases via eval after the block completes' do
      conn = build_fake_conn(held: true)
      stub_redis_pool(conn)
      lock.with_lock { nil }
      expect(conn).to have_received(:eval).once
    end

    it 'releases the lock even when the block raises' do
      conn = build_fake_conn(held: true)
      stub_redis_pool(conn)
      expect { lock.with_lock { raise 'boom' } }.to raise_error(RuntimeError, 'boom')
      expect(conn).to have_received(:eval).once
    end
  end

  # ---------------------------------------------------------------------------
  # Contention
  # ---------------------------------------------------------------------------
  describe '.with_lock — contention' do
    it 'raises LockContended immediately when lock is held and timeout is zero' do
      stub_redis_pool(build_fake_conn(held: false))
      expect do
        lock.with_lock(timeout: 0) { nil }
      end.to raise_error(described_class::LockContended, /held by another process/)
    end

    it 'raises LockContended after polling exhausts timeout' do
      stub_redis_pool(build_fake_conn(held: false))
      expect do
        lock.with_lock(timeout: 0.05) { nil }
      end.to raise_error(described_class::LockContended)
    end

    it 'includes diagnostic info in the exception message' do
      stub_redis_pool(build_fake_conn(held: false))
      begin
        lock.with_lock(timeout: 0) { nil }
      rescue described_class::LockContended => e
        expect(e.message).to match(/token=/)
        expect(e.message).to match(/timeout=0s/)
      end
    end

    it 'second competing thread raises LockContended while first holds the lock' do
      # Use real $alfred (MockRedis) for this threaded test — no EVAL involved
      # because the second thread never acquires and therefore never calls release.
      token = SecureRandom.uuid
      $alfred.with { |conn| conn.set(described_class::LOCK_KEY, token, nx: true, ex: 90) } # rubocop:disable Style/GlobalVars

      second_raised = false
      t = Thread.new do
        lock.with_lock(timeout: 0.05) { nil }
      rescue described_class::LockContended
        second_raised = true
      end
      t.join

      expect(second_raised).to be(true)
    ensure
      $alfred.with { |conn| conn.del(described_class::LOCK_KEY) } # rubocop:disable Style/GlobalVars
    end
  end

  # ---------------------------------------------------------------------------
  # Lua release script contract (unit level — stubbed pool)
  #
  # Verifies the correct Lua script, key, and argv are forwarded to conn.eval.
  # Real Lua atomicity (GET+DEL on real Redis) lives in M3-1.5 integration lane.
  # ---------------------------------------------------------------------------
  describe 'Lua release script contract' do
    it 'passes LUA_RELEASE script, correct key, and a UUID token to conn.eval' do
      eval_script = nil
      eval_keys   = nil
      eval_argv   = nil

      conn = instance_double(Redis::Namespace)
      allow(conn).to receive(:set).and_return('OK')
      allow(conn).to receive(:eval) do |script, keys:, argv:|
        eval_script = script
        eval_keys   = keys
        eval_argv   = argv
      end
      stub_redis_pool(conn)

      lock.with_lock { nil }

      expect(eval_script).to eq(described_class::LUA_RELEASE)
      expect(eval_keys).to eq([described_class::LOCK_KEY])
      expect(eval_argv.first).to match(/\A[0-9a-f-]{36}\z/)
    end

    it 'each with_lock call uses a unique token' do
      tokens = []
      conn   = instance_double(Redis::Namespace)
      allow(conn).to receive(:set).and_return('OK')
      allow(conn).to receive(:eval) { |_script, argv:, **_| tokens << argv.first }
      stub_redis_pool(conn)

      lock.with_lock { nil }
      lock.with_lock { nil }

      expect(tokens.length).to eq(2)
      expect(tokens.first).not_to eq(tokens.last)
    end
  end

  # ---------------------------------------------------------------------------
  # TTL expiry (simulated)
  # ---------------------------------------------------------------------------
  describe 'TTL expiry' do
    it 'allows re-acquisition after lock TTL expires (simulated by manual delete)' do
      $alfred.with { |conn| conn.set(described_class::LOCK_KEY, 'stale', nx: true, ex: 1) } # rubocop:disable Style/GlobalVars
      $alfred.with { |conn| conn.del(described_class::LOCK_KEY) } # rubocop:disable Style/GlobalVars

      conn = build_fake_conn(held: true)
      stub_redis_pool(conn)
      expect { lock.with_lock { nil } }.not_to raise_error
    end
  end

  # ---------------------------------------------------------------------------
  # Integration — 3 parallel threads serialise
  # ---------------------------------------------------------------------------
  describe 'integration — 3 parallel threads serialise writes' do
    it 'all 3 blocks complete without raising (serialised, no deadlock)' do
      completed = []
      mutex     = Mutex.new

      # Shared conn: SET NX returns true once (first caller), nil for others until
      # the first releases. We simulate real serialisation by using a real Mutex
      # around the fake "lock is held" state.
      lock_held = false
      lock_mutex = Mutex.new
      conn = instance_double(Redis::Namespace)
      allow(conn).to receive(:set) do |_key, _val, **_kwargs|
        lock_mutex.synchronize do
          next nil if lock_held

          lock_held = true
          'OK'
        end
      end
      allow(conn).to receive(:eval) do
        lock_mutex.synchronize { lock_held = false }
        1
      end
      stub_redis_pool(conn)

      threads = Array.new(3) do |i|
        Thread.new do
          lock.with_lock(timeout: 10) do
            sleep(0.02)
            mutex.synchronize { completed << i }
          end
        end
      end

      threads.each(&:join)

      expect(completed.sort).to eq([0, 1, 2])
    end
  end
end
