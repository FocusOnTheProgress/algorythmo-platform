# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Algorythmo::Api::V1::StagesController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account)  { create(:account) }
  let(:user)     { create(:user, account: account, role: :administrator) }
  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Proposta', kind: :open, position: 2, aging_coefficient: 7.0)
    p.reload
  end
  let(:stage) { pipeline.stages.first }

  before do
    allow(Algorythmo::FeatureGate).to receive(:feature_enabled?).and_return(true)
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
  end
end
