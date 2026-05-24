# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::StageHistoryRecorder do
  let(:account)  { create(:account) }
  let(:contact)  { create(:contact, account: account) }
  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',          kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Qualificado',   kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho', kind: :won,  position: 2, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo_stage) { pipeline.stages.find_by(name: 'Novo') }
  let(:qual_stage) { pipeline.stages.find_by(name: 'Qualificado') }
  let(:won_stage)  { pipeline.stages.find_by(name: 'Fechado ganho') }

  let(:lead) do
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: novo_stage,
      position: 1.0,
      stage_entered_at: Time.current
    )
  end

  # Resets thread-local Current state after each example.
  after { Current.user = nil }

  describe '.record_creation' do
    it 'creates a StageHistory entry with from_stage nil' do
      expect do
        described_class.record_creation(lead)
      end.to change(Algorythmo::StageHistory, :count).by(1)

      entry = Algorythmo::StageHistory.last
      expect(entry.lead).to eq(lead)
      expect(entry.from_stage).to be_nil
      expect(entry.to_stage).to eq(novo_stage)
      expect(entry.actor_type).to eq('system')
      expect(entry.actor_id).to be_nil
    end

    context 'idempotency — Sidekiq retry guard' do
      it 'skips when last entry already is (to=current_stage, created_at < 1 min ago)' do
        described_class.record_creation(lead)

        expect do
          described_class.record_creation(lead)
        end.not_to change(Algorythmo::StageHistory, :count)
      end

      it 'records again when last entry is older than 1 minute' do
        Algorythmo::StageHistory.create!(
          lead: lead,
          from_stage: nil,
          to_stage: novo_stage,
          actor_type: 'system',
          actor_id: nil,
          created_at: 2.minutes.ago
        )

        expect do
          described_class.record_creation(lead)
        end.to change(Algorythmo::StageHistory, :count).by(1)
      end

      it 'records again when last entry points to a different stage' do
        Algorythmo::StageHistory.create!(
          lead: lead,
          from_stage: nil,
          to_stage: qual_stage,
          actor_type: 'system',
          actor_id: nil,
          created_at: 10.seconds.ago
        )

        expect do
          described_class.record_creation(lead)
        end.to change(Algorythmo::StageHistory, :count).by(1)
      end
    end

    context 'failure handling' do
      it 'rescues RecordInvalid without raising' do
        allow(Algorythmo::StageHistory).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(Algorythmo::StageHistory.new))
        allow(ChatwootExceptionTracker).to receive(:new).and_return(double(capture_exception: nil))

        expect { described_class.record_creation(lead) }.not_to raise_error
      end
    end
  end

  describe '.record_transition' do
    it 'creates a StageHistory entry with from and to stages' do
      expect do
        described_class.record_transition(lead, from: novo_stage, to: qual_stage)
      end.to change(Algorythmo::StageHistory, :count).by(1)

      entry = Algorythmo::StageHistory.last
      expect(entry.from_stage).to eq(novo_stage)
      expect(entry.to_stage).to eq(qual_stage)
    end

    it 'records actor=system when Current.user is nil' do
      Current.user = nil
      described_class.record_transition(lead, from: novo_stage, to: qual_stage)

      entry = Algorythmo::StageHistory.last
      expect(entry.actor_type).to eq('system')
      expect(entry.actor_id).to be_nil
    end

    context 'failure handling' do
      it 'rescues RecordInvalid without raising' do
        allow(Algorythmo::StageHistory).to receive(:create!).and_raise(ActiveRecord::RecordInvalid.new(Algorythmo::StageHistory.new))
        allow(ChatwootExceptionTracker).to receive(:new).and_return(double(capture_exception: nil))

        expect { described_class.record_transition(lead, from: novo_stage, to: qual_stage) }.not_to raise_error
      end
    end
  end

  describe 'actor resolution' do
    it 'resolves "user" when Current.user is a User' do
      user = create(:user, account: account)
      Current.user = user

      described_class.record_transition(lead, from: novo_stage, to: qual_stage)
      entry = Algorythmo::StageHistory.last

      expect(entry.actor_type).to eq('user')
      expect(entry.actor_id).to eq(user.id)
    end

    it 'resolves "agent_bot" when Current.user is an AgentBot' do
      bot = AgentBot.create!(name: 'Manu', description: 'test', outgoing_url: 'https://example.com')
      Current.user = bot

      described_class.record_transition(lead, from: novo_stage, to: qual_stage)
      entry = Algorythmo::StageHistory.last

      expect(entry.actor_type).to eq('agent_bot')
      expect(entry.actor_id).to eq(bot.id)
    end

    it 'resolves "system" when Current.user is nil' do
      Current.user = nil

      described_class.record_transition(lead, from: novo_stage, to: qual_stage)
      entry = Algorythmo::StageHistory.last

      expect(entry.actor_type).to eq('system')
      expect(entry.actor_id).to be_nil
    end

    it 'resolves "system" for an unrecognised class (stale thread state defence)' do
      # Simulates Current.user set to an arbitrary object from a prior Sidekiq job
      # on a reused thread (thread_mattr_accessor does not auto-reset unlike CurrentAttributes).
      Current.user = Object.new

      described_class.record_transition(lead, from: novo_stage, to: qual_stage)
      entry = Algorythmo::StageHistory.last

      expect(entry.actor_type).to eq('system')
      expect(entry.actor_id).to be_nil
    end
  end
end
