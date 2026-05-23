# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Algorythmo::Lead, type: :model do
  let(:account)  { create(:account) }
  let(:contact)  { create(:contact, account: account) }
  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',            kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Qualificado',     kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Proposta',        kind: :open, position: 2, aging_coefficient: 7.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho',   kind: :won,  position: 3, aging_coefficient: 0.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado perdido', kind: :lost, position: 4, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo_stage)     { pipeline.stages.find_by(name: 'Novo') }
  let(:qual_stage)     { pipeline.stages.find_by(name: 'Qualificado') }
  let(:won_stage)      { pipeline.stages.find_by(name: 'Fechado ganho') }
  let(:lost_stage)     { pipeline.stages.find_by(name: 'Fechado perdido') }

  def create_lead(stage: nil, attrs: {})
    described_class.create!({
      account: account,
      contact: contact,
      stage: stage || novo_stage,
      position: 1.0,
      stage_entered_at: Time.current
    }.merge(attrs))
  end

  describe 'validations' do
    it 'is valid with required attributes' do
      expect(create_lead).to be_persisted
    end
  end

  describe '#move_to_stage' do
    let!(:lead) { create_lead }

    it 'changes the stage and updates stage_entered_at' do
      freeze_time = Time.current
      travel_to(freeze_time) do
        lead.move_to_stage(qual_stage)
      end

      lead.reload
      expect(lead.stage).to eq(qual_stage)
      expect(lead.stage_entered_at).to be_within(1.second).of(freeze_time)
    end

    it 'appends to end of target stage' do
      existing = create_lead(stage: qual_stage, attrs: { contact: create(:contact, account: account), position: 5.0 })
      lead.move_to_stage(qual_stage)
      expect(lead.reload.position).to be > existing.position
    end

    it 'sets closed_at when moving to won' do
      lead.move_to_stage(won_stage)
      expect(lead.reload.closed_at).not_to be_nil
    end

    it 'clears closed_at when moving from won back to open' do
      lead.move_to_stage(won_stage)
      lead.move_to_stage(novo_stage)
      expect(lead.reload.closed_at).to be_nil
    end

    it 'raises when stage is nil' do
      expect { lead.move_to_stage(nil) }.to raise_error(ArgumentError)
    end

    it 'raises when stage belongs to a different pipeline' do
      other_pipeline = Algorythmo::Pipeline.create!(account: account, name: 'Other')
      foreign_stage  = Algorythmo::Stage.create!(pipeline: other_pipeline, name: 'X', kind: :open, position: 0, aging_coefficient: 1.0)
      expect { lead.move_to_stage(foreign_stage) }.to raise_error(ArgumentError, /different pipeline/)
    end
  end

  describe '#reopen_as_new_lead' do
    it 'creates a new lead with previous_lead_id pointing to the closed one' do
      lead = create_lead(stage: won_stage)
      new_lead = lead.reopen_as_new_lead

      expect(new_lead).to be_persisted
      expect(new_lead.previous_lead_id).to eq(lead.id)
      expect(new_lead.stage).to eq(novo_stage)
      expect(new_lead.stage_entered_at).to be_within(1.second).of(Time.current)
    end

    it 'works from lost stage' do
      lead = create_lead(stage: lost_stage)
      new_lead = lead.reopen_as_new_lead
      expect(new_lead.previous_lead_id).to eq(lead.id)
    end

    it 'raises when lead is in an open stage' do
      lead = create_lead
      expect { lead.reopen_as_new_lead }.to raise_error(ArgumentError, /won or lost/)
    end

    it 'builds a chain: A → B → C' do
      lead_a = create_lead(stage: won_stage)
      lead_b = lead_a.reopen_as_new_lead
      lead_b.move_to_stage(won_stage)
      lead_c = lead_b.reopen_as_new_lead

      expect(lead_c.previous_lead_id).to eq(lead_b.id)
      expect(lead_b.previous_lead_id).to eq(lead_a.id)
      expect(lead_a.previous_lead_id).to be_nil
    end
  end

  describe 'scopes' do
    it '.active excludes soft-deleted leads' do
      lead = create_lead
      lead.update!(deleted: true)
      expect(described_class.active).not_to include(lead)
    end

    it '.open returns only leads in open stages' do
      open_lead   = create_lead(stage: novo_stage)
      closed_lead = create_lead(stage: won_stage, attrs: { contact: create(:contact, account: account) })
      expect(described_class.open).to include(open_lead)
      expect(described_class.open).not_to include(closed_lead)
    end
  end
end
