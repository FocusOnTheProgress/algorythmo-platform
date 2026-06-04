# frozen_string_literal: true

require 'rails_helper'

# Per-user fixed-window rate limit. redis_pool is stubbed with a fake INCR counter.
RSpec.describe Algorythmo::Brain::CopilotRateLimiter do
  let(:account_id) { 2 }
  let(:user_id) { 42 }

  # Fake connection whose INCR increments an in-memory counter keyed by the redis key.
  def stub_pool
    counters = Hash.new(0)
    conn = instance_double(Redis::Namespace)
    allow(conn).to receive(:incr) { |key| counters[key] += 1 }
    allow(conn).to receive(:expire)

    pool = instance_double(ConnectionPool)
    allow(pool).to receive(:with).and_yield(conn)
    allow(described_class).to receive(:redis_pool).and_return(pool)
    conn
  end

  it 'allows requests up to MAX_REQUESTS' do
    stub_pool
    results = Array.new(described_class::MAX_REQUESTS) do
      described_class.allow?(account_id: account_id, user_id: user_id)
    end
    expect(results).to all(be(true))
  end

  it 'rejects the request after the limit is exhausted' do
    stub_pool
    described_class::MAX_REQUESTS.times { described_class.allow?(account_id: account_id, user_id: user_id) }
    expect(described_class.allow?(account_id: account_id, user_id: user_id)).to be(false)
  end

  # P2-1: EXPIRE is called on EVERY request (not only when current==1).
  # If the process dies between INCR and a conditional EXPIRE (deploy/OOM/SIGKILL),
  # the key would survive with no TTL and block the user permanently. Unconditional
  # EXPIRE is idempotent and guarantees the key always carries a finite TTL.
  it 'calls expire on every request to guarantee the TTL survives a crash between INCR and EXPIRE' do
    conn = stub_pool
    n = 3
    n.times { described_class.allow?(account_id: account_id, user_id: user_id) }
    expect(conn).to have_received(:expire).exactly(n).times
  end

  it 'sets the expire TTL to WINDOW seconds' do
    conn = stub_pool
    key  = described_class.key_for(account_id, user_id)
    described_class.allow?(account_id: account_id, user_id: user_id)
    expect(conn).to have_received(:expire).with(key, described_class::WINDOW)
  end

  it 'isolates counters per user' do
    stub_pool
    described_class::MAX_REQUESTS.times { described_class.allow?(account_id: account_id, user_id: user_id) }
    expect(described_class.allow?(account_id: account_id, user_id: 999)).to be(true)
  end
end
