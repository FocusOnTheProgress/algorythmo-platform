# frozen_string_literal: true

require 'rails_helper'

# Caps concurrent gbrain think subprocesses. redis_pool is stubbed with a fake
# connection so SET NX behavior drives the semaphore without a real Redis.
RSpec.describe Algorythmo::Brain::ConcurrencySemaphore do
  # Fake connection where SET NX succeeds only while free slots remain. `free` is
  # the number of slots that can still be claimed; each successful SET decrements it.
  def stub_pool_with_free_slots(free)
    remaining = free
    conn = instance_double(Redis::Namespace)
    allow(conn).to receive(:set) do |_key, _val, **_opts|
      if remaining.positive?
        remaining -= 1
        'OK'
      end
    end
    allow(conn).to receive(:del)

    pool = instance_double(ConnectionPool)
    allow(pool).to receive(:with).and_yield(conn)
    allow(described_class).to receive(:redis_pool).and_return(pool)
    conn
  end

  describe '.with_slot — slot available' do
    before { stub_pool_with_free_slots(described_class::MAX_CONCURRENCY) }

    it 'yields and returns the block value' do
      expect(described_class.with_slot { 99 }).to eq(99)
    end

    it 'releases the slot via del after the block (even on error)' do
      conn = stub_pool_with_free_slots(described_class::MAX_CONCURRENCY)
      expect do
        described_class.with_slot { raise 'boom' }
      end.to raise_error('boom')
      expect(conn).to have_received(:del).once
    end
  end

  describe '.with_slot — saturated' do
    before { stub_pool_with_free_slots(0) }

    it 'raises Saturated when no slot is free' do
      expect { described_class.with_slot { :never } }.to raise_error(described_class::Saturated)
    end

    it 'does not yield the block when saturated' do
      yielded = false
      expect { described_class.with_slot { yielded = true } }.to raise_error(described_class::Saturated)
      expect(yielded).to be(false)
    end
  end
end
