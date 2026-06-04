# frozen_string_literal: true

require 'rails_helper'

# Covers the full contract of Algorythmo::Brain::IngestionWorker:
#   - Current.account set before any query
#   - Forward-only gate (pre-m3_start_date conversations skipped)
#   - Idempotency (second run produces one log row, not two)
#   - Success path writes log with outcome: :success
#   - Failure path writes log with outcome: :failed + last_error; exception re-raises
#   - LockContended re-raises (Sidekiq retry handles backoff)
#   - Trigger rejects mismatched account_id
#   - Snapshot hook: successful capture fires SnapshotRecorder.record (Fatia 5)
RSpec.describe Algorythmo::Brain::IngestionWorker do
  subject(:worker) { described_class.new }

  let(:account) { create(:account) }
  let(:inbox)   { create(:inbox, account: account) }

  # Conversation that is eligible: resolved, created well after the pinned m3_start_date (29 days ago).
  let(:conversation) do
    create(:conversation,
           account: account,
           inbox: inbox,
           status: 'resolved',
           created_at: 1.day.ago)
  end

  # Stub Brain::Client to avoid spawning real gbrain subprocess.
  # GBrain CLI returns parsed JSON (a Hash) — the worker extracts the
  # `page_path` key, NOT the raw return value.
  def stub_capture_success(page_path: '/brain/conversations/test.md')
    client_double = instance_double(Algorythmo::Brain::Client, capture: { 'page_path' => page_path })
    allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)
    client_double
  end

  def stub_capture_failure(error_class: RuntimeError, message: 'gbrain exploded')
    client_double = instance_double(Algorythmo::Brain::Client)
    allow(client_double).to receive(:capture).and_raise(error_class, message)
    allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)
    client_double
  end

  # Stub WriteLock to pass-through by default (no real Redis needed in unit tests).
  def stub_write_lock_passthrough
    allow(Algorythmo::Brain::WriteLock).to receive(:with_lock) { |**_kwargs, &blk| blk.call }
  end

  def stub_write_lock_contended
    allow(Algorythmo::Brain::WriteLock).to receive(:with_lock)
      .and_raise(Algorythmo::Brain::WriteLock::LockContended, 'held by another process — token=abc… timeout=5s')
  end

  before do
    # Pin the start date so the eligible conversation (created_at: start_date + 1.day) is
    # above the gate and old_conversation (created_at: start_date - 1.day) is below it.
    account.update_column(:algorythmo_m3_start_date, 30.days.ago)
    # SnapshotRecorder.record is called after every successful capture.  Stub it
    # out here so existing worker tests don't need to know about the recorder
    # internals (they test the worker, not the recorder — recorder has its own spec).
    allow(Algorythmo::Brain::SnapshotRecorder).to receive(:record)
  end

  after { Current.reset }

  # ---------------------------------------------------------------------------
  # Current.account is set before query (D-A8)
  # ---------------------------------------------------------------------------
  describe 'Current.account assignment' do
    it 'sets Current.account before the batch_scope query executes' do
      stub_write_lock_passthrough
      stub_capture_success

      seen_id = nil
      # We intercept the IngestionLog query (first place account_id is used
      # outside Account.find) to snapshot Current.account at query time.
      allow(Algorythmo::Brain::IngestionLog).to receive(:where) do |*args, **kwargs|
        seen_id ||= Current.account&.id
        Algorythmo::Brain::IngestionLog.unscoped.where(*args, **kwargs)
      end

      worker.perform(account.id)

      expect(seen_id).to eq(account.id)
    end
  end

  # ---------------------------------------------------------------------------
  # Forward-only gate (D-ING)
  # ---------------------------------------------------------------------------
  describe 'forward-only gate' do
    it 'does not ingest conversations created before algorythmo_m3_start_date' do
      old_conversation = create(:conversation,
                                account: account,
                                inbox: inbox,
                                status: 'resolved',
                                created_at: 60.days.ago)

      stub_write_lock_passthrough
      # No capture should occur — if it does, stub would not be set up and the call would fail.
      expect(Algorythmo::Brain::Client).not_to receive(:new)

      worker.perform(account.id, old_conversation.id)

      expect(Algorythmo::Brain::IngestionLog.where(conversation_id: old_conversation.id)).to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # Idempotency
  # ---------------------------------------------------------------------------
  describe 'idempotency' do
    it 'produces exactly one log row when the same conversation is processed twice' do
      stub_write_lock_passthrough
      stub_capture_success

      worker.perform(account.id, conversation.id)
      worker.perform(account.id, conversation.id)

      logs = Algorythmo::Brain::IngestionLog.where(
        account_id: account.id, conversation_id: conversation.id
      )
      expect(logs.count).to eq(1)
    end

    it 'skips already-indexed conversations in batch mode' do
      # Pre-create a success log so this conversation looks already indexed.
      Algorythmo::Brain::IngestionLog.create!(
        account_id: account.id,
        conversation_id: conversation.id,
        outcome: :success,
        brain_indexed_at: 1.hour.ago,
        brain_page_path: '/brain/old.md'
      )

      stub_write_lock_passthrough
      expect(Algorythmo::Brain::Client).not_to receive(:new)

      worker.perform(account.id)
    end
  end

  # ---------------------------------------------------------------------------
  # Success path
  # ---------------------------------------------------------------------------
  describe 'success path' do
    it 'writes outcome: :success with brain_indexed_at and brain_page_path' do
      stub_write_lock_passthrough
      stub_capture_success(page_path: '/brain/conversations/42.md')

      worker.perform(account.id, conversation.id)

      log = Algorythmo::Brain::IngestionLog.find_by!(
        account_id: account.id, conversation_id: conversation.id
      )

      aggregate_failures do
        expect(log.outcome).to eq('success')
        expect(log.brain_page_path).to eq('/brain/conversations/42.md')
        expect(log.brain_indexed_at).to be_within(5.seconds).of(Time.current)
        expect(log.last_error).to be_nil
      end
    end

    it 'stores nil in brain_page_path when GBrain returns an empty hash (legacy/no contract)' do
      stub_write_lock_passthrough
      client_double = instance_double(Algorythmo::Brain::Client, capture: {})
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)

      worker.perform(account.id, conversation.id)

      log = Algorythmo::Brain::IngestionLog.find_by!(account_id: account.id, conversation_id: conversation.id)
      expect(log.brain_page_path).to be_nil
    end

    it 'stores nil in brain_page_path when the hash key is blank or missing' do
      stub_write_lock_passthrough
      client_double = instance_double(Algorythmo::Brain::Client, capture: { 'page_path' => '' })
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(client_double)

      worker.perform(account.id, conversation.id)

      log = Algorythmo::Brain::IngestionLog.find_by!(account_id: account.id, conversation_id: conversation.id)
      expect(log.brain_page_path).to be_nil
    end
  end

  # ---------------------------------------------------------------------------
  # Failure path
  # ---------------------------------------------------------------------------
  describe 'failure path' do
    it 'writes outcome: :failed + last_error and re-raises for Sidekiq retry' do
      stub_write_lock_passthrough
      stub_capture_failure(message: 'gbrain exited 1: fatal error')

      expect { worker.perform(account.id, conversation.id) }.to raise_error(RuntimeError, 'gbrain exited 1: fatal error')

      log = Algorythmo::Brain::IngestionLog.find_by!(
        account_id: account.id, conversation_id: conversation.id
      )

      aggregate_failures do
        expect(log.outcome).to eq('failed')
        expect(log.last_error).to include('gbrain exited 1: fatal error')
      end
    end

    it 'adds a Sentry breadcrumb on failure when Sentry is defined' do
      stub_write_lock_passthrough
      stub_capture_failure

      breadcrumb_klass = Class.new do
        attr_reader :category

        def initialize(category:, **)
          @category = category
        end
      end
      breadcrumbs = []
      sentry_module = Module.new do
        define_singleton_method(:add_breadcrumb) { |_bc| nil }
      end
      sentry_module.const_set(:Breadcrumb, breadcrumb_klass)
      stub_const('Sentry', sentry_module)
      allow(Sentry).to receive(:add_breadcrumb) { |bc| breadcrumbs << bc }

      expect { worker.perform(account.id, conversation.id) }.to raise_error(RuntimeError)

      expect(breadcrumbs).not_to be_empty
      expect(breadcrumbs.first.category).to eq('brain.ingestion')
    end
  end

  # ---------------------------------------------------------------------------
  # Lock contention re-enqueue
  # ---------------------------------------------------------------------------
  describe 'lock contention' do
    it 're-raises LockContended so Sidekiq handles the retry backoff' do
      stub_write_lock_contended
      # Stub client so it does not interfere — lock never reaches client
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(
        instance_double(Algorythmo::Brain::Client)
      )

      expect do
        worker.perform(account.id, conversation.id)
      end.to raise_error(Algorythmo::Brain::WriteLock::LockContended)
    end

    it 'does NOT write a failure log row on LockContended (it is a retry condition, not a failure)' do
      stub_write_lock_contended
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(
        instance_double(Algorythmo::Brain::Client)
      )

      expect { worker.perform(account.id, conversation.id) }.to raise_error(
        Algorythmo::Brain::WriteLock::LockContended
      )

      expect(Algorythmo::Brain::IngestionLog.where(conversation_id: conversation.id)).to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # Trigger rejects mismatched account_id
  # ---------------------------------------------------------------------------
  describe 'DB trigger: account_id invariant' do
    it 'raises ActiveRecord::StatementInvalid when account_id does not match conversation.account_id' do
      other_account = create(:account)

      expect do
        Algorythmo::Brain::IngestionLog.create!(
          account_id: other_account.id,
          conversation_id: conversation.id,
          outcome: :failed,
          last_error: 'forced mismatch'
        )
      end.to raise_error(ActiveRecord::StatementInvalid, /does not match/)
    end
  end

  # ---------------------------------------------------------------------------
  # Snapshot hook (Fatia 5 — SnapshotRecorder wiring)
  # ---------------------------------------------------------------------------
  describe 'snapshot hook' do
    it 'calls SnapshotRecorder.record with trigger: cron after a successful capture' do
      stub_write_lock_passthrough
      stub_capture_success

      # Override the shared before stub to assert, not just allow
      expect(Algorythmo::Brain::SnapshotRecorder).to receive(:record)
        .with(account_id: account.id, trigger: 'cron')
        .once

      worker.perform(account.id, conversation.id)
    end

    it 'does NOT call SnapshotRecorder.record when capture raises' do
      stub_write_lock_passthrough
      stub_capture_failure

      expect(Algorythmo::Brain::SnapshotRecorder).not_to receive(:record)

      expect { worker.perform(account.id, conversation.id) }.to raise_error(RuntimeError)
    end

    it 'does NOT call SnapshotRecorder.record when lock is contended' do
      stub_write_lock_contended
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(
        instance_double(Algorythmo::Brain::Client)
      )

      expect(Algorythmo::Brain::SnapshotRecorder).not_to receive(:record)

      expect { worker.perform(account.id, conversation.id) }.to raise_error(
        Algorythmo::Brain::WriteLock::LockContended
      )
    end

    # P1 safety: SnapshotRecorder failure must never corrupt the ingestion outcome.
    # If stats times out or any StandardError occurs in record_snapshot_best_effort,
    # the ingestion log must stay :success and the worker must NOT re-raise
    # (which would trigger Sidekiq retry and duplicate the capture in GBrain).
    it 'keeps ingestion log :success and does NOT re-raise when SnapshotRecorder raises' do
      stub_write_lock_passthrough
      stub_capture_success

      # Override the shared allow to simulate a recorder failure
      allow(Algorythmo::Brain::SnapshotRecorder).to receive(:record)
        .and_raise(Algorythmo::Brain::Client::SubprocessError, 'gbrain stats timed out')

      expect { worker.perform(account.id, conversation.id) }.not_to raise_error

      log = Algorythmo::Brain::IngestionLog.find_by!(
        account_id: account.id, conversation_id: conversation.id
      )
      expect(log.outcome).to eq('success')
    end

    it 'logs a warning when SnapshotRecorder raises (visible, never silently swallowed)' do
      stub_write_lock_passthrough
      stub_capture_success

      allow(Algorythmo::Brain::SnapshotRecorder).to receive(:record)
        .and_raise(StandardError, 'transient failure')

      expect(Rails.logger).to receive(:warn).with(
        a_string_including('snapshot skipped', account.id.to_s)
      )

      worker.perform(account.id, conversation.id)
    end
  end
end
