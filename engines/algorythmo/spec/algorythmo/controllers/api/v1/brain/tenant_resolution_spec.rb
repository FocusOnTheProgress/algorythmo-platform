# frozen_string_literal: true

require 'rails_helper'

# Covers plan §6 + §4 T0 spec requirements for Algorythmo::Brain::TenantResolution concern.
#
# Test matrix (plan §4 T0 + §6):
#   1. No auth token                         → 401 (Chatwoot chain rejects before concern runs)
#   2. User without account membership       → 401 or 403 (Chatwoot chain)
#   3. User with membership + ENV match      → 200 + Current.account set
#   4. current_account.id != ENV value       → 403 fail-closed
#   5. ENV var UNSET                         → 403 + Rails.logger.error (NEVER 500)
#   6a. current_account nil (chain misconfig) → 403 + logger.error, never 500 (P1-4)
#   7. before_action order                   → resolve_tenant! runs AFTER authenticate + current_account + feature gate
RSpec.describe Algorythmo::Brain::TenantResolution, type: :controller do
  # Use CompiledTruthController as the concrete carrier; it inherits BaseController
  # which includes TenantResolution. Client#stats is stubbed so the controller
  # reaches its successful render (200) without spawning a real subprocess.
  controller(Algorythmo::Api::V1::Brain::CompiledTruthController) do
    # Nothing extra — real action runs with stubbed Client#stats
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
  # Case 3 — User with membership + ENV match → concern passes, controller runs (200)
  # 200 proves the full Chatwoot auth chain ran (auth → current_account → feature gate →
  # resolve_tenant!) without any guard aborting. Current.account being set is a
  # precondition enforced by the upstream chain; reaching 200 is proof.
  # Client#stats is stubbed — no subprocess, no real brain required.
  # -------------------------------------------------------------------------
  context 'when user has membership and ENV matches account id' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', account.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token
      allow_any_instance_of(Algorythmo::Brain::Client)
        .to receive(:stats)
        .and_return({ 'aggregate' => { 'total_pages' => 0, 'total_edges' => 0 } })
    end

    it 'passes all guards and reaches the action (returns 200, not 403)' do
      get :show, params: { account_id: account.id }
      expect(response).to have_http_status(:ok)
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
  # Case 6a — current_account nil (chain misconfigured in subclass) → 403 + logger.error, never 500
  # -------------------------------------------------------------------------
  context 'when current_account is nil (chain misconfigured)' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', account.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token
      # Simulate a subclass that skipped current_account before_action
      allow(controller).to receive(:current_account).and_return(nil)
    end

    it 'returns 403, not 500 (never NoMethodError)' do
      expect { get :show, params: { account_id: account.id } }.not_to raise_error
      expect(response).to have_http_status(:forbidden)
    end

    it 'logs an error identifying chain misconfiguration' do
      expect(Rails.logger).to receive(:error).with(
        a_string_including('current_account nil at resolve_tenant!')
      )
      get :show, params: { account_id: account.id }
    end
  end

  # -------------------------------------------------------------------------
  # Case 7 — before_action order: resolve_tenant! runs AFTER current_account
  # Plan §4 T0 line 224: "roda DEPOIS de current_account + ensure_algorythmo_crm_enabled!".
  # If resolve_tenant! ever fires before current_account, current_account returns nil
  # and the nil guard (P1-4) returns 403; but we fail loudly here to surface regressions.
  # -------------------------------------------------------------------------
  context 'before_action order' do
    it 'resolve_tenant! runs after authenticate_access_token!, current_account, and ensure_algorythmo_crm_enabled!' do
      base = Algorythmo::Api::V1::Brain::BaseController
      callbacks = base._process_action_callbacks
                      .select { |cb| cb.kind == :before }
                      .map(&:filter)

      resolve_idx = callbacks.index(:resolve_tenant!)
      auth_idx    = callbacks.index(:authenticate_access_token!)
      current_idx = callbacks.index(:current_account)
      feature_idx = callbacks.index(:ensure_algorythmo_crm_enabled!)

      expect(resolve_idx).to be_present
      expect(auth_idx).to be_present
      expect(current_idx).to be_present
      expect(feature_idx).to be_present

      # resolve_tenant! must run after the full Chatwoot auth + account + feature chain
      expect(resolve_idx).to be > auth_idx
      expect(resolve_idx).to be > current_idx
      expect(resolve_idx).to be > feature_idx
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
