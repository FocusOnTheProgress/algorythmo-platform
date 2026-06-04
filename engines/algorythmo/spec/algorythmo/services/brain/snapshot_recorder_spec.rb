# frozen_string_literal: true

require 'rails_helper'

# Contract for Algorythmo::Brain::SnapshotRecorder:
#   - Calls Client#stats (read-only, no WriteLock)
#   - Persists one Snapshot row per call
#   - diff_summary nil on first snapshot; human-readable delta thereafter
#   - gbrain error propagates (caller/worker decides retry/skip)
#   - Non-Hash stats result is stored as {} (defensive)
RSpec.describe Algorythmo::Brain::SnapshotRecorder do
  let(:account) { create(:account) }

  def stub_stats(result)
    client_double = instance_double(Algorythmo::Brain::Client, stats: result)
    allow(Algorythmo::Brain::Client).to receive(:new).with(account.id).and_return(client_double)
    client_double
  end

  def make_prior_snapshot(stats:, taken_at: 1.hour.ago)
    Algorythmo::Brain::Snapshot.create!(
      account: account,
      taken_at: taken_at,
      stats: stats,
      trigger: 'cron'
    )
  end

  # ---------------------------------------------------------------------------
  # Happy path — first snapshot (no prior)
  # ---------------------------------------------------------------------------
  describe '.record — first snapshot for an account' do
    it 'creates one Snapshot row' do
      stub_stats({ 'pages' => 3, 'edges' => 7 })

      expect do
        described_class.record(account_id: account.id, trigger: 'cron')
      end.to change { Algorythmo::Brain::Snapshot.where(account_id: account.id).count }.by(1)
    end

    it 'stores the stats hash returned by Client#stats' do
      stub_stats({ 'pages' => 3, 'edges' => 7 })
      snapshot = described_class.record(account_id: account.id, trigger: 'cron')

      expect(snapshot.stats).to eq({ 'pages' => 3, 'edges' => 7 })
    end

    it 'sets diff_summary to nil when there is no prior snapshot' do
      stub_stats({ 'pages' => 1 })
      snapshot = described_class.record(account_id: account.id, trigger: 'cron')

      expect(snapshot.diff_summary).to be_nil
    end

    it 'sets trigger correctly' do
      stub_stats({})
      snapshot = described_class.record(account_id: account.id, trigger: 'upload')

      expect(snapshot.trigger).to eq('upload')
    end

    it 'sets taken_at close to now' do
      stub_stats({})
      snapshot = described_class.record(account_id: account.id, trigger: 'manual')

      expect(snapshot.taken_at).to be_within(5.seconds).of(Time.current)
    end
  end

  # ---------------------------------------------------------------------------
  # diff_summary computed against prior snapshot
  # ---------------------------------------------------------------------------
  describe '.record — subsequent snapshot' do
    it 'produces a human-readable diff_summary with page and edge deltas' do
      make_prior_snapshot(stats: { 'pages' => 4, 'edges' => 10 })
      stub_stats({ 'pages' => 6, 'edges' => 13 })

      snapshot = described_class.record(account_id: account.id, trigger: 'cron')

      aggregate_failures do
        expect(snapshot.diff_summary).to include('pages')
        expect(snapshot.diff_summary).to include('4')
        expect(snapshot.diff_summary).to include('6')
        expect(snapshot.diff_summary).to include('+2')
        expect(snapshot.diff_summary).to include('edges')
        expect(snapshot.diff_summary).to include('10')
        expect(snapshot.diff_summary).to include('13')
        expect(snapshot.diff_summary).to include('+3')
      end
    end

    it 'shows negative delta when pages decreased (defensive)' do
      make_prior_snapshot(stats: { 'pages' => 5, 'edges' => 10 })
      stub_stats({ 'pages' => 2, 'edges' => 10 })

      snapshot = described_class.record(account_id: account.id, trigger: 'cron')

      expect(snapshot.diff_summary).to include('-3')
    end

    it 'falls back to "no measurable change" when keys are absent in both snapshots' do
      make_prior_snapshot(stats: {})
      stub_stats({})

      snapshot = described_class.record(account_id: account.id, trigger: 'cron')

      expect(snapshot.diff_summary).to eq('no measurable change')
    end
  end

  # ---------------------------------------------------------------------------
  # Resilience — Client#stats returns non-Hash
  # ---------------------------------------------------------------------------
  describe '.record — non-Hash stats result' do
    it 'stores empty hash and does not raise' do
      client_double = instance_double(Algorythmo::Brain::Client, stats: nil)
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)

      expect do
        described_class.record(account_id: account.id, trigger: 'cron')
      end.not_to raise_error

      snapshot = Algorythmo::Brain::Snapshot.where(account_id: account.id).last
      expect(snapshot.stats).to eq({})
    end
  end

  # ---------------------------------------------------------------------------
  # gbrain error propagates (caller decides retry policy)
  # ---------------------------------------------------------------------------
  describe '.record — Client#stats raises' do
    it 'propagates the error without creating a snapshot row' do
      client_double = instance_double(Algorythmo::Brain::Client)
      allow(client_double).to receive(:stats).and_raise(
        Algorythmo::Brain::Client::SubprocessError, 'gbrain stats exited 1'
      )
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)

      expect do
        described_class.record(account_id: account.id, trigger: 'cron')
      end.to raise_error(Algorythmo::Brain::Client::SubprocessError)

      expect(Algorythmo::Brain::Snapshot.where(account_id: account.id)).to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # No WriteLock — stats is read-only
  # ---------------------------------------------------------------------------
  describe '.record — does not acquire WriteLock' do
    it 'never calls WriteLock.with_lock' do
      stub_stats({})
      expect(Algorythmo::Brain::WriteLock).not_to receive(:with_lock)

      described_class.record(account_id: account.id, trigger: 'cron')
    end
  end
end
