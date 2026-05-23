# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Algorythmo::Api::V1::PipelinesController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }

  before do
    allow(Algorythmo::FeatureGate).to receive(:feature_enabled?)
                                        .with(account, 'algorythmo_crm')
                                        .and_return(true)
    request.headers['api_access_token'] = admin.access_token.token
  end

  def create_pipeline_with_stages(acc = account)
    pipeline = Algorythmo::Pipeline.create!(account: acc, name: 'Main')
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Novo',        kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Qualificado', kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Proposta',    kind: :open, position: 2, aging_coefficient: 2.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Ganho',       kind: :won,  position: 3, aging_coefficient: 0.0)
    Algorythmo::Stage.create!(pipeline: pipeline, name: 'Perdido',     kind: :lost, position: 4, aging_coefficient: 0.0)
    pipeline.reload
  end

  # ── GET #default ─────────────────────────────────────────────────────────────

  describe 'GET #default' do
    context 'with a configured pipeline' do
      let!(:pipeline) { create_pipeline_with_stages }

      it 'returns 200 with pipeline id and name' do
        get :default, params: { account_id: account.id }
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['pipeline']['id']).to eq(pipeline.id)
        expect(body['pipeline']['name']).to eq('Main')
      end

      it 'returns all stages ordered by position' do
        get :default, params: { account_id: account.id }
        body = JSON.parse(response.body)
        positions = body['stages'].map { |s| s['position'] }
        expect(positions).to eq(positions.sort)
        expect(body['stages'].size).to eq(5)
      end

      it 'includes required stage fields' do
        get :default, params: { account_id: account.id }
        body = JSON.parse(response.body)
        stage = body['stages'].first
        expect(stage.keys).to include('id', 'name', 'position', 'kind', 'aging_coefficient')
      end
    end

    context 'without a configured pipeline' do
      it 'returns 404' do
        get :default, params: { account_id: account.id }
        expect(response).to have_http_status(:not_found)
        expect(JSON.parse(response.body)['error']).to eq('No pipeline configured')
      end
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:admin_b)   { create(:user, account: account_b, role: :administrator) }

      before do
        create_pipeline_with_stages(account_b)
        allow(Algorythmo::FeatureGate).to receive(:feature_enabled?)
                                            .with(account_b, 'algorythmo_crm')
                                            .and_return(true)
      end

      it 'returns 404 when account has no pipeline even though another account does' do
        # admin from account (no pipeline) cannot see account_b pipeline
        get :default, params: { account_id: account.id }
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'feature gate off' do
      before do
        allow(Algorythmo::FeatureGate).to receive(:feature_enabled?).and_return(false)
      end

      it 'returns 403' do
        get :default, params: { account_id: account.id }
        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
