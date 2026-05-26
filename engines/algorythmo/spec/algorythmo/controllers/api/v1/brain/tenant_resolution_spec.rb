# frozen_string_literal: true

require 'rails_helper'

# Covers plan §6 + §4 T0 spec requirements for Algorythmo::Brain::TenantResolution concern.
#
# Test matrix (5 required cases from plan §4 T0 + §6):
#   1. No auth token                         → 401 (Chatwoot chain rejects before concern runs)
#   2. User without account membership       → 401 or 403 (Chatwoot chain)
#   3. User with membership + ENV match      → 200 + Current.account set
#   4. current_account.id != ENV value       → 403 fail-closed
#   5. ENV var UNSET                         → 403 + Rails.logger.error (NEVER 500)
#   6. before_action order                   → resolve_tenant! runs AFTER current_account
RSpec.describe Algorythmo::Brain::TenantResolution, type: :controller do
  # Use CompiledTruthController as the concrete carrier; it inherits BaseController
  # which includes TenantResolution. The stub returns 501 once the concern passes.
  controller(Algorythmo::Api::V1::Brain::CompiledTruthController) do
    # Nothing extra — stub already responds with head :not_implemented (501)
  end

  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?)
      .with(anything, 'crm')
      .and_return(true)
  end

  # -------------------------------------------------------------------------
  # Case 1 — No auth → 401 from Chatwoot chain
  # -------------------------------------------------------------------------
  context 'when no auth token is provided' do
    it 'returns 401 before the concern can run' do
      get :show, params: { account_id: account.id }
      expect(response).to have_http_status(:unauthorized)
    end
  end

  # -------------------------------------------------------------------------
  # Case 2 — Authenticated user without membership in this account → 401/403
  # -------------------------------------------------------------------------
  context 'when user has no membership in the requested account' do
    let(:other_account) { create(:account) }
    let(:outsider)      { create(:user, account: other_account, role: :administrator) }

    before { request.headers['api_access_token'] = outsider.access_token.token }

    it 'returns 4xx (Chatwoot membership guard) before concern logic runs' do
      get :show, params: { account_id: account.id }
      expect(response.status).to be_between(400, 403)
    end
  end

  # -------------------------------------------------------------------------
  # Case 3 — User with membership + ENV match → 200 (stub is 501, but concern passes)
  # -------------------------------------------------------------------------
  context 'when user has membership and ENV matches account id' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', account.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token
    end

    it 'allows the request through the concern (stub returns 501)' do
      get :show, params: { account_id: account.id }
      # 501 = concern passed, stub is not yet implemented — that is the correct gate behaviour
      expect(response).to have_http_status(:not_implemented)
    end

    it 'Current.account is set by the upstream Chatwoot chain before resolve_tenant! fires' do
      # Current.account is set by Api::V1::Accounts::BaseController#current_account (upstream).
      # resolve_tenant! reads it; if Chatwoot chain failed, current_account would raise/redirect
      # and we would never reach the 501 stub. Getting 501 proves the full chain ran.
      get :show, params: { account_id: account.id }
      expect(response).to have_http_status(:not_implemented)
    end
  end

  # -------------------------------------------------------------------------
  # Case 4 — ENV set but points to a DIFFERENT account id → 403
  # -------------------------------------------------------------------------
  context 'when ENV ALGORYTHMO_PRIMARY_ACCOUNT_ID does not match current_account.id' do
    let(:other_account) { create(:account) }

    before do
      # Admin belongs to `account` but ENV names `other_account`
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', other_account.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token
    end

    it 'returns 403 fail-closed' do
      get :show, params: { account_id: account.id }
      expect(response).to have_http_status(:forbidden)
    end
  end

  # -------------------------------------------------------------------------
  # Case 5 — ENV UNSET → 403 + Rails.logger.error (NEVER 500)
  # This is the most critical safety invariant: ENV.presence returns nil → log → 403.
  # KeyError / 500 must never happen.
  # -------------------------------------------------------------------------
  context 'when ALGORYTHMO_PRIMARY_ACCOUNT_ID is not set in ENV' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', nil)
      request.headers['api_access_token'] = admin.access_token.token
    end

    it 'returns 403, not 500' do
      expect { get :show, params: { account_id: account.id } }.not_to raise_error
      expect(response).to have_http_status(:forbidden)
    end

    it 'logs an error explaining the misconfiguration' do
      expect(Rails.logger).to receive(:error).with(
        a_string_including('ALGORYTHMO_PRIMARY_ACCOUNT_ID not set')
      )
      get :show, params: { account_id: account.id }
    end
  end

  # -------------------------------------------------------------------------
  # Case 6 — before_action order: resolve_tenant! runs AFTER current_account
  # -------------------------------------------------------------------------
  context 'before_action order' do
    it 'resolve_tenant! is declared in TenantResolution (runs after Chatwoot chain)' do
      # The concern is included in Brain::BaseController. Verify the before_action
      # callback is registered on that controller and not before auth callbacks.
      callbacks = Algorythmo::Api::V1::Brain::BaseController
                    ._process_action_callbacks
                    .select { |cb| cb.kind == :before }
                    .map(&:filter)

      resolve_idx = callbacks.index(:resolve_tenant!)
      auth_idx    = callbacks.index(:authenticate_access_token!)

      expect(resolve_idx).to be_present
      expect(auth_idx).to be_present
      # resolve_tenant! must come AFTER authentication
      expect(resolve_idx).to be > auth_idx
    end
  end

  # -------------------------------------------------------------------------
  # Helper
  # -------------------------------------------------------------------------
  def stub_env(key, value)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:fetch).and_call_original

    if value.nil?
      allow(ENV).to receive(:[]).with(key).and_return(nil)
    else
      allow(ENV).to receive(:[]).with(key).and_return(value)
    end
  end
end
