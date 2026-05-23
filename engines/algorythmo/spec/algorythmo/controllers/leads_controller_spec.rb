# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Algorythmo::Api::V1::LeadsController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:agent)   { create(:user, account: account, role: :agent) }
  let(:contact) { create(:contact, account: account) }

  # Keep backward compat: existing specs used `user` as admin
  let(:user) { admin }

  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',           kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Qualificado',    kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho',  kind: :won,  position: 2, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo_stage) { pipeline.stages.find_by(kind: :open, position: 0) }
  let(:qual_stage) { pipeline.stages.find_by(kind: :open, position: 1) }
  let(:won_stage)  { pipeline.stages.find_by(kind: :won) }

  before do
    allow(Algorythmo::FeatureGate).to receive(:feature_enabled?)
                                        .with(account, 'algorythmo_crm')
                                        .and_return(true)
    request.headers['api_access_token'] = user.access_token.token
    pipeline
  end

  def create_lead(stage: nil, pos: 1.0)
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: stage || novo_stage,
      position: pos,
      stage_entered_at: Time.current
    )
  end

  # ── GET #index ───────────────────────────────────────────────────────────────

  describe 'GET #index' do
    it 'returns leads for the stage' do
      lead = create_lead
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['leads'].map { |l| l['id'] }).to include(lead.id)
    end

    it 'excludes soft-deleted leads' do
      deleted_lead = create_lead
      deleted_lead.update!(deleted: true)
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      body = JSON.parse(response.body)
      expect(body['leads'].map { |l| l['id'] }).not_to include(deleted_lead.id)
    end

    describe 'A.11 — cursor pagination' do
      it 'returns next_cursor when there are more results' do
        # Create 3 leads, request limit=2
        3.times { |i| create_lead(pos: i.to_f + 1) }
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 2 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).not_to be_nil
      end

      it 'returns null next_cursor on last page' do
        create_lead(pos: 1.0)
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 50 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).to be_nil
      end

      it 'paginates correctly with cursor' do
        leads = 5.times.map { |i| create_lead(pos: i.to_f + 1) }
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 3 }
        body1 = JSON.parse(response.body)
        cursor = body1['next_cursor']
        expect(cursor).not_to be_nil

        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 3, cursor: cursor }
        body2 = JSON.parse(response.body)
        ids_page1 = body1['leads'].map { |l| l['id'] }
        ids_page2 = body2['leads'].map { |l| l['id'] }
        expect((ids_page1 & ids_page2)).to be_empty
        expect(ids_page2).not_to be_empty
      end
    end
  end

  # ── GET #show ────────────────────────────────────────────────────────────────

  describe 'GET #show' do
    it 'returns the lead' do
      lead = create_lead
      get :show, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(lead.id)
    end

    it 'returns 404 for deleted lead' do
      lead = create_lead
      lead.update!(deleted: true)
      get :show, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:not_found)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when accessing a lead from another account' do
        get :show, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── POST #create ─────────────────────────────────────────────────────────────

  describe 'POST #create' do
    context 'cross-account isolation' do
      let(:account_b)  { create(:account) }
      let(:contact_b)  { create(:contact, account: account_b) }

      it 'returns 404 when contact_id belongs to another account' do
        post :create, params: {
          account_id: account.id,
          lead: { contact_id: contact_b.id, stage_id: novo_stage.id }
        }
        expect(response).to have_http_status(:not_found)
      end

      it 'returns 404 when previous_lead_id belongs to another account' do
        pipeline_b = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        stage_b    = Algorythmo::Stage.create!(pipeline: pipeline_b, name: 'Novo', kind: :open,
                                               position: 0, aging_coefficient: 1.0)
        lead_b     = Algorythmo::Lead.create!(account: account_b, contact: contact_b,
                                              stage: stage_b, position: 1.0, stage_entered_at: Time.current)

        post :create, params: {
          account_id: account.id,
          lead: { contact_id: contact.id, stage_id: novo_stage.id, previous_lead_id: lead_b.id }
        }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── PATCH #update ─────────────────────────────────────────────────────────────

  describe 'PATCH #update' do
    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when updating a lead from another account' do
        patch :update, params: { account_id: account.id, id: lead_b.id, lead: { channel_origin: 'api' } }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── PATCH #move ───────────────────────────────────────────────────────────────

  describe 'PATCH #move' do
    it 'moves lead to a new stage' do
      lead = create_lead
      patch :move, params: { account_id: account.id, id: lead.id, stage_id: qual_stage.id }
      expect(response).to have_http_status(:ok)
      expect(lead.reload.stage_id).to eq(qual_stage.id)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when moving a lead from another account' do
        patch :move, params: { account_id: account.id, id: lead_b.id, stage_id: novo_stage.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── POST #reopen ──────────────────────────────────────────────────────────────

  describe 'POST #reopen' do
    it 'creates a new lead with previous_lead_id' do
      lead = create_lead(stage: won_stage)
      post :reopen, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body['previous_lead_id']).to eq(lead.id)
    end

    it 'returns 422 when lead is already open' do
      lead = create_lead
      post :reopen, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Won', kind: :won, position: 0, aging_coefficient: 0.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when reopening a lead from another account' do
        post :reopen, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── DELETE #destroy ───────────────────────────────────────────────────────────

  describe 'DELETE #destroy' do
    it 'soft-deletes the lead (admin)' do
      lead = create_lead
      delete :destroy, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:no_content)
      expect(lead.reload.deleted).to be true
    end

    context 'H2 — role enforcement' do
      before { request.headers['api_access_token'] = agent.access_token.token }

      it 'returns 401/403 when an agent attempts to delete a lead' do
        lead = create_lead
        delete :destroy, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:unauthorized).or have_http_status(:forbidden)
      end
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when deleting a lead from another account' do
        delete :destroy, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── Feature gate ─────────────────────────────────────────────────────────────

  describe 'feature gate enforcement' do
    it 'returns 403 when algorythmo_crm is disabled' do
      allow(Algorythmo::FeatureGate).to receive(:feature_enabled?).and_return(false)
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      expect(response).to have_http_status(:forbidden)
    end
  end
end
