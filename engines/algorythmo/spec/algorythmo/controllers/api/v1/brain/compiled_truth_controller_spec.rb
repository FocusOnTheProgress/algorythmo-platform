# frozen_string_literal: true

require 'rails_helper'

# Request spec for Algorythmo::Api::V1::Brain::CompiledTruthController#show
#
# Salvaguardas do plano §8/PR1:
#   1. Founder/account válido                    → 200 com shape real
#   2. Non-founder / tenant errado               → 403 fail-closed
#   3. gbrain ausente/SubprocessError            → 502 com body tipado (NÃO 500)
#   4. gbrain TimeoutError                       → 502 com body tipado (NÃO 500)
#   5. Cérebro vazio (stats retorna 0 páginas)   → 200 com zeros (nunca erro)
#
# Open3 é totalmente stubado — nenhum processo real é spawned.
RSpec.describe Algorythmo::Api::V1::Brain::CompiledTruthController, type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:headers) { { 'api_access_token' => admin.access_token.token } }
  let(:path)    { "/algorythmo/api/v1/accounts/#{account.id}/brain/compiled_truth" }

  # Standard stats payload from gbrain — matches the shape verified in
  # gbrain_real_integration_spec.rb (src/core/schema-pack/stats.ts).
  let(:stats_payload) do
    {
      'aggregate' => {
        'total_pages' => 7,
        'total_edges' => 23
      }
    }
  end

  before do
    # Feature gate: crm must be enabled for Brain::BaseController to pass.
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
  end

  # Helper: make ALGORYTHMO_PRIMARY_ACCOUNT_ID match this account (tenant pass)
  def stub_primary_account
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
  end

  # Helper: point PRIMARY to a different ID (tenant fail)
  def stub_wrong_account
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return('0')
  end

  # ---------------------------------------------------------------------------
  # 1. Happy path — founder + valid brain
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — founder with populated brain' do
    before do
      stub_primary_account
      allow_any_instance_of(Algorythmo::Brain::Client).to receive(:stats).and_return(stats_payload)
    end

    it 'returns 200' do
      get path, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it 'returns the real pages count from stats aggregate' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body['pages']).to eq(7)
    end

    it 'returns the real edges count from stats aggregate' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body['edges']).to eq(23)
    end

    it 'includes the full raw_stats for transparency' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body['raw_stats']).to eq(stats_payload)
    end

    it 'includes the account_id in the response' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body['account_id']).to eq(account.id)
    end
  end

  # ---------------------------------------------------------------------------
  # 2. Empty brain — zeros, not an error
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — empty brain (no documents yet)' do
    let(:empty_stats) { { 'aggregate' => { 'total_pages' => 0, 'total_edges' => 0 } } }

    before do
      stub_primary_account
      allow_any_instance_of(Algorythmo::Brain::Client).to receive(:stats).and_return(empty_stats)
    end

    it 'returns 200 (never an error when brain is empty)' do
      get path, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it 'returns pages: 0 and edges: 0' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body['pages']).to eq(0)
      expect(body['edges']).to eq(0)
    end
  end

  # ---------------------------------------------------------------------------
  # 3. gbrain missing aggregate key — graceful zero fallback
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — stats returns empty hash (provisioning edge case)' do
    before do
      stub_primary_account
      allow_any_instance_of(Algorythmo::Brain::Client).to receive(:stats).and_return({})
    end

    it 'returns 200 with zeros, not an exception' do
      get path, headers: headers
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['pages']).to eq(0)
      expect(body['edges']).to eq(0)
    end
  end

  # ---------------------------------------------------------------------------
  # 4. Non-founder / wrong tenant → 403 fail-closed
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — non-founder account' do
    before { stub_wrong_account }

    it 'returns 403 without calling gbrain' do
      expect_any_instance_of(Algorythmo::Brain::Client).not_to receive(:stats)
      get path, headers: headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # 5. Unauthenticated request → 401 (Chatwoot auth chain)
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — unauthenticated' do
    it 'returns 401 before reaching the controller action' do
      get path
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # ---------------------------------------------------------------------------
  # 6. gbrain SubprocessError → 502 typed (never 500)
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — gbrain subprocess fails' do
    before do
      stub_primary_account
      allow_any_instance_of(Algorythmo::Brain::Client)
        .to receive(:stats)
        .and_raise(Algorythmo::Brain::Client::SubprocessError, 'gbrain stats exited 1: fatal error')
    end

    it 'returns 502, not 500' do
      get path, headers: headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it 'returns a typed error body (never exposes a raw 500 stack trace)' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body).to have_key('error')
      expect(body['error']).to be_a(String)
      expect(body['error']).not_to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # 7. gbrain TimeoutError → 502 typed (never 500)
  # ---------------------------------------------------------------------------
  describe 'GET /brain/compiled_truth — gbrain times out' do
    before do
      stub_primary_account
      allow_any_instance_of(Algorythmo::Brain::Client)
        .to receive(:stats)
        .and_raise(Algorythmo::Brain::Client::TimeoutError, 'gbrain timed out after 30s — killed')
    end

    it 'returns 502, not 500' do
      get path, headers: headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it 'returns a typed error body' do
      get path, headers: headers
      body = JSON.parse(response.body)
      expect(body).to have_key('error')
    end
  end
end
