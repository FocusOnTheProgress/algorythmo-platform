# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Api::V1::StagesController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account)  { create(:account) }
  let(:admin)    { create(:user, account: account, role: :administrator) }
  let(:agent)    { create(:user, account: account, role: :agent) }

  # Keep backward compat: existing specs used `user` as admin
  let(:user) { admin }

  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Proposta', kind: :open, position: 2, aging_coefficient: 7.0)
    p.reload
  end
  let(:stage) { pipeline.stages.first }

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    request.headers['api_access_token'] = user.access_token.token
    pipeline
  end

  describe 'PATCH #rename' do
    it 'renames the stage' do
      patch :rename, params: { account_id: account.id, id: stage.id, name: 'Orçamento enviado' }
      expect(response).to have_http_status(:ok)
      expect(stage.reload.name).to eq('Orçamento enviado')
    end

    it 'returns 422 for blank name' do
      patch :rename, params: { account_id: account.id, id: stage.id, name: '' }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context 'H2 — role enforcement' do
      before { request.headers['api_access_token'] = agent.access_token.token }

      it 'returns 401/403 when an agent attempts to rename a stage' do
        patch :rename, params: { account_id: account.id, id: stage.id, name: 'Hacked' }
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
      let(:stage_b) { pipeline_b.stages.first }

      before { stage_b }

      it 'returns 404 when renaming a stage from another account' do
        patch :rename, params: { account_id: account.id, id: stage_b.id, name: 'Injection' }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  describe 'PATCH #update (aging_coefficient)' do
    it 'updates aging_coefficient' do
      patch :update, params: { account_id: account.id, id: stage.id, stage: { aging_coefficient: 3.5 } }
      expect(response).to have_http_status(:ok)
      expect(stage.reload.aging_coefficient).to eq(3.5)
    end

    it 'rejects negative coefficient' do
      patch :update, params: { account_id: account.id, id: stage.id, stage: { aging_coefficient: -1.0 } }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context 'H2 — role enforcement' do
      before { request.headers['api_access_token'] = agent.access_token.token }

      it 'returns 401/403 when an agent attempts to update aging_coefficient' do
        patch :update, params: { account_id: account.id, id: stage.id, stage: { aging_coefficient: 99.0 } }
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
      let(:stage_b) { pipeline_b.stages.first }

      before { stage_b }

      it 'returns 404 when updating aging_coefficient of a stage from another account' do
        patch :update, params: { account_id: account.id, id: stage_b.id, stage: { aging_coefficient: 5.0 } }
        expect(response).to have_http_status(:not_found)
      end
    end
  end
end
