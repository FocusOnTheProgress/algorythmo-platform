# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Api::V1::PipelineMetricsController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }

  def create_pipeline_with_stages(acc = account)
    pipeline = Algorythmo::Pipeline.create!(account: acc, name: 'Main')
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Novo',           kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Qualificado',    kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Proposta',       kind: :open, position: 2, aging_coefficient: 2.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Fechado ganho',  kind: :won,  position: 3, aging_coefficient: 0.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Fechado perdido', kind: :lost, position: 4, aging_coefficient: 0.0)
    pipeline.reload
  end

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?)
      .with(account, 'crm')
      .and_return(true)
    request.headers['api_access_token'] = admin.access_token.token
  end

  describe 'GET #show — happy path' do
    let!(:pipeline) { create_pipeline_with_stages }

    it 'returns 200 with the metrics payload envelope' do
      get :show, params: { account_id: account.id, id: pipeline.id }
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body.keys).to include('pipeline_id', 'computed_at', 'ttl_seconds', 'summary', 'stages')
      expect(body['pipeline_id']).to eq(pipeline.id)
      expect(body['ttl_seconds']).to eq(60)
    end

    it 'returns the summary block with the contract keys' do
      get :show, params: { account_id: account.id, id: pipeline.id }
      body = JSON.parse(response.body)
      expect(body['summary'].keys).to match_array(%w[open_leads avg_funnel_hours conversion_rate])
    end

    it 'returns one stage entry per pipeline stage with the contract keys' do
      get :show, params: { account_id: account.id, id: pipeline.id }
      body = JSON.parse(response.body)
      expect(body['stages'].size).to eq(5)
      body['stages'].each do |stage_payload|
        expect(stage_payload.keys).to match_array(
          %w[stage_id stage_kind lead_count avg_time_in_stage_seconds conversion_rate_to_next]
        )
      end
    end

    it 'returns null conversion_rate_to_next on terminal stages' do
      get :show, params: { account_id: account.id, id: pipeline.id }
      body = JSON.parse(response.body)
      terminal_payloads = body['stages'].select { |s| %w[won lost].include?(s['stage_kind']) }
      expect(terminal_payloads.size).to eq(2)
      terminal_payloads.each { |s| expect(s['conversion_rate_to_next']).to be_nil }
    end
  end

  describe 'GET #show — cross-account isolation' do
    let(:other_account)  { create(:account) }
    let!(:other_pipeline) { create_pipeline_with_stages(other_account) }

    it 'returns 404 when the pipeline belongs to a different account' do
      get :show, params: { account_id: account.id, id: other_pipeline.id }
      expect(response).to have_http_status(:not_found)
      expect(JSON.parse(response.body)['error']).to eq('Pipeline not found')
    end

    it 'returns 404 for a non-existent pipeline id' do
      get :show, params: { account_id: account.id, id: 9_999_999 }
      expect(response).to have_http_status(:not_found)
    end
  end

  describe 'GET #show — feature gate' do
    let!(:pipeline) { create_pipeline_with_stages }

    it 'returns 403 when algorythmo_crm cut flag is off' do
      allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(false)
      get :show, params: { account_id: account.id, id: pipeline.id }
      expect(response).to have_http_status(:forbidden)
    end
  end
end
