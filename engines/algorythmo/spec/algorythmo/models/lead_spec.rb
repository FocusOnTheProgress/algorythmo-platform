# frozen_string_literal: true

require 'rails_helper'

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

  describe 'stage_kind denormalisation' do
    it 'syncs stage_kind = 0 (open) when stage is open' do
      lead = create_lead(stage: novo_stage)
      expect(lead.stage_kind).to eq(0)
    end

    it 'syncs stage_kind = 1 (won) when stage is won' do
      lead = create_lead(stage: won_stage, attrs: { contact: create(:contact, account: account) })
      expect(lead.stage_kind).to eq(1)
    end

    it 'syncs stage_kind = 2 (lost) when stage is lost' do
      lead = create_lead(stage: lost_stage, attrs: { contact: create(:contact, account: account) })
      expect(lead.stage_kind).to eq(2)
    end

    it 'updates stage_kind when stage changes via move_to_stage' do
      lead = create_lead
      expect { lead.move_to_stage(won_stage) }.to change { lead.reload.stage_kind }.from(0).to(1)
    end
  end

  describe 'DB-level partial unique index (B1)' do
    # idx_leads_open_unique_per_contact: unique on (contact_id, account_id) WHERE stage_kind = 0
    it 'raises RecordNotUnique when a second open lead is created for the same contact+account' do
      create_lead(stage: novo_stage)
      expect do
        # Bypass before_save to force a raw DB insert that violates the index.
        # Use insert! (not insert) — insert uses ON CONFLICT DO NOTHING and would
        # silently swallow the conflict; insert! re-raises ActiveRecord::RecordNotUnique.
        described_class.insert!({
                                  account_id: account.id,
                                  contact_id: contact.id,
                                  stage_id: novo_stage.id,
                                  stage_kind: 0,
                                  position: 2.0,
                                  deleted: false,
                                  stage_entered_at: Time.current,
                                  created_at: Time.current,
                                  updated_at: Time.current
                                })
      end.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it 'allows two leads for the same contact+account when one is closed (stage_kind != 0)' do
      create_lead(stage: novo_stage)
      # A won lead for the same contact — no unique conflict because stage_kind = 1.
      closed = create_lead(stage: won_stage, attrs: { contact: contact })
      expect(closed).to be_persisted
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

    it 'records a StageHistory entry after commit (Rails 7.1 fires after_commit in transactional tests)' do
      expect do
        lead.move_to_stage(qual_stage)
      end.to change(Algorythmo::StageHistory, :count).by(1)

      entry = Algorythmo::StageHistory.last
      expect(entry.from_stage).to eq(novo_stage)
      expect(entry.to_stage).to eq(qual_stage)
      expect(entry.actor_type).to eq('system')
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

    it 'records StageHistory on the NEW lead, not the original' do
      lead = create_lead(stage: won_stage)
      new_lead = lead.reopen_as_new_lead

      # Original lead: no stage_history created by reopen_as_new_lead
      # (reopen_as_new_lead creates a new Lead via Lead.create!, no stage_id change on existing)
      expect(lead.stage_histories.count).to eq(0)

      # New lead: no StageHistory yet (create! does not fire after_update_commit;
      # record_creation must be called explicitly by the listener)
      expect(new_lead.stage_histories.count).to eq(0)
    end
  end

  describe '§5.4 — guard_stage_id_change' do
    let!(:lead) { create_lead }

    it 'raises ActiveRecord::RecordInvalid when stage_id is updated directly' do
      expect do
        lead.update!(stage: qual_stage)
      end.to raise_error(ActiveRecord::RecordInvalid, /move_to_stage/)
    end

    it 'allows stage_id change via move_to_stage (sets _via_move_to_stage flag)' do
      expect { lead.move_to_stage(qual_stage) }.not_to raise_error
      expect(lead.reload.stage).to eq(qual_stage)
    end

    it 'allows non-stage updates without restriction' do
      expect { lead.update!(position: 99.0) }.not_to raise_error
    end

    it 'allows updates to other fields when stage is unchanged' do
      expect { lead.update!(deleted: true) }.not_to raise_error
    end

    # KNOWN GAP — adversarial review M1-C PR #52 (sério).
    # The guard is a validation. ActiveRecord's `update_columns`, `update_all`,
    # and `update_attribute` BYPASS validations by design. This spec documents
    # the gap so future developers don't assume the guard is total.
    #
    # Mitigation today: no caller in the codebase uses these APIs on stage_id.
    # Convention enforced by review. If we ever need a stronger guarantee, we
    # can override these methods on the model, but doing so violates the Rails
    # idiom that "_columns/_all are explicit bypasses" — likely the wrong fix.
    it 'DOES NOT defend against update_columns(stage_id:) — documented gap' do
      expect { lead.update_columns(stage_id: qual_stage.id) }.not_to raise_error
      expect(lead.reload.stage).to eq(qual_stage)
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
