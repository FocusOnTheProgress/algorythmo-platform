# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::StageHistory, type: :model do
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

  def build_history(attrs = {})
    described_class.new({
      lead: lead,
      to_stage: qual_stage,
      actor_type: 'system',
      actor_id: nil
    }.merge(attrs))
  end

  def create_history(attrs = {})
    described_class.create!({
      lead: lead,
      to_stage: qual_stage,
      actor_type: 'system',
      actor_id: nil,
      created_at: Time.current
    }.merge(attrs))
  end

  # ── Validations ────────────────────────────────────────────────────────────────

  describe 'actor_type validation' do
    it 'is valid with "user"' do
      h = build_history(actor_type: 'user', actor_id: 1)
      expect(h).to be_valid
    end

    it 'is valid with "agent_bot"' do
      h = build_history(actor_type: 'agent_bot', actor_id: 99)
      expect(h).to be_valid
    end

    it 'is valid with "system"' do
      h = build_history(actor_type: 'system', actor_id: nil)
      expect(h).to be_valid
    end

    it 'is invalid with an unknown actor_type' do
      h = build_history(actor_type: 'manu')
      expect(h).not_to be_valid
      expect(h.errors[:actor_type]).to be_present
    end

    it 'is invalid with a blank actor_type' do
      h = build_history(actor_type: '')
      expect(h).not_to be_valid
    end
  end

  describe 'actor_id numericality validation' do
    it 'is valid when actor_id is a positive integer' do
      h = build_history(actor_type: 'user', actor_id: 5)
      expect(h).to be_valid
    end

    it 'is invalid when actor_id is 0' do
      h = build_history(actor_type: 'user', actor_id: 0)
      expect(h).not_to be_valid
      expect(h.errors[:actor_id]).to be_present
    end

    it 'is invalid when actor_id is negative' do
      h = build_history(actor_type: 'user', actor_id: -1)
      expect(h).not_to be_valid
    end

    it 'is invalid when actor_id is a non-integer string' do
      h = build_history(actor_type: 'user', actor_id: 'abc')
      expect(h).not_to be_valid
    end

    it 'allows actor_id nil (system case)' do
      h = build_history(actor_type: 'system', actor_id: nil)
      expect(h).to be_valid
    end
  end

  describe 'actor_id_required_unless_system validation' do
    it 'is invalid when actor_type is "user" and actor_id is nil' do
      h = build_history(actor_type: 'user', actor_id: nil)
      expect(h).not_to be_valid
      expect(h.errors[:actor_id]).to be_present
    end

    it 'is invalid when actor_type is "agent_bot" and actor_id is nil' do
      h = build_history(actor_type: 'agent_bot', actor_id: nil)
      expect(h).not_to be_valid
    end

    it 'is valid when actor_type is "system" and actor_id is nil' do
      h = build_history(actor_type: 'system', actor_id: nil)
      expect(h).to be_valid
    end
  end

  describe 'associations' do
    it 'belongs_to lead' do
      history = create_history
      expect(history.lead).to eq(lead)
    end

    it 'belongs_to to_stage (required)' do
      h = build_history(to_stage: nil)
      expect(h).not_to be_valid
    end

    it 'allows from_stage to be nil (lead creation entry)' do
      h = build_history(from_stage: nil)
      expect(h).to be_valid
    end

    it 'resolves from_stage when provided' do
      history = create_history(from_stage: novo_stage)
      expect(history.reload.from_stage).to eq(novo_stage)
    end

    it 'cascade-destroys with lead' do
      history = create_history
      expect { lead.destroy }.to change(described_class, :count).by(-1)
    end
  end

  # ── Append-only (readonly?) ────────────────────────────────────────────────────

  describe '#readonly?' do
    it 'returns false for an unsaved record' do
      h = build_history
      expect(h.readonly?).to be(false)
    end

    it 'returns true after the record is persisted' do
      history = create_history
      expect(history.readonly?).to be(true)
    end

    it 'raises ActiveRecord::ReadOnlyRecord on update' do
      history = create_history
      expect { history.update!(actor_type: 'user') }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it 'raises ActiveRecord::ReadOnlyRecord on update_attribute' do
      history = create_history
      expect { history.update_attribute(:actor_type, 'user') }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end
  end
end
