# frozen_string_literal: true

require 'rails_helper'

# Route audit spec — plan §6 + §4 T0 "Route audit spec (NOVO v5)".
#
# Two concerns validated here:
#   A. Structural: every Brain route is handled by a controller that inherits
#      Algorythmo::Api::V1::Brain::BaseController (ensuring TenantResolution is always applied).
#   B. Behavioural: request specs for each Brain route — non-founder → 403, founder → 501
#      (stub responds 501 until T1-T4 land).
RSpec.describe 'Brain routes', type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:headers) { { 'api_access_token' => admin.access_token.token } }

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
  end

  # ---------------------------------------------------------------------------
  # A. Structural audit — every Brain controller inherits Brain::BaseController
  # ---------------------------------------------------------------------------
  describe 'controller inheritance audit' do
    it 'every /brain route controller inherits Algorythmo::Api::V1::Brain::BaseController' do
      brain_routes = Algorythmo::Engine.routes.routes.select do |route|
        route.defaults[:controller].to_s.include?('algorythmo/api/v1/brain')
      end

      expect(brain_routes).not_to be_empty,
                                  'Expected at least one brain route to exist in the router'

      brain_routes.each do |route|
        controller_name = route.defaults[:controller].to_s
        # Rails uses underscored controller names in route defaults
        controller_class = "#{controller_name.camelize}Controller".constantize

        expect(controller_class.ancestors).to include(
          Algorythmo::Api::V1::Brain::BaseController
        ), "#{controller_class} does not inherit Brain::BaseController"
      end
    end
  end

  # ---------------------------------------------------------------------------
  # B. Behavioural — non-founder → 403, founder → 501 (stub)
  # ---------------------------------------------------------------------------

  # Helper: set up ENV so TenantResolution passes for `account`
  def with_primary_account
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
    yield
  end

  # Helper: set ENV to a different account so TenantResolution returns 403
  def without_primary_account_match
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return('0')
    yield
  end

  shared_examples 'a brain route that enforces tenant gate' do |method:, path_template:|
    context 'when the authenticated account is NOT the primary account (non-founder)' do
      it 'returns 403' do
        without_primary_account_match do
          path = path_template.gsub(':account_id', account.id.to_s)
          send(method, "/algorythmo#{path}", headers: headers)
          expect(response).to have_http_status(:forbidden)
        end
      end
    end

    context 'when the authenticated account IS the primary account (founder)' do
      it 'returns 501 (stub not yet implemented)' do
        with_primary_account do
          path = path_template.gsub(':account_id', account.id.to_s)
          send(method, "/algorythmo#{path}", headers: headers)
          expect(response).to have_http_status(:not_implemented)
        end
      end
    end
  end

  describe 'GET /brain/compiled_truth' do
    it_behaves_like 'a brain route that enforces tenant gate',
                    method: :get,
                    path_template: '/api/v1/accounts/:account_id/brain/compiled_truth'
  end

  describe 'GET /brain/timeline' do
    it_behaves_like 'a brain route that enforces tenant gate',
                    method: :get,
                    path_template: '/api/v1/accounts/:account_id/brain/timeline'
  end

  describe 'POST /brain/adjustments' do
    it_behaves_like 'a brain route that enforces tenant gate',
                    method: :post,
                    path_template: '/api/v1/accounts/:account_id/brain/adjustments'
  end

  describe 'GET /brain/snapshots' do
    it_behaves_like 'a brain route that enforces tenant gate',
                    method: :get,
                    path_template: '/api/v1/accounts/:account_id/brain/snapshots'
  end

  # POST /brain/copilot/ask — implemented in Fatia 6.
  # Read-only operator consultant; still behind the tenant gate (non-founder → 403).
  describe 'POST /brain/copilot/ask' do
    context 'when non-founder' do
      it 'returns 403' do
        without_primary_account_match do
          post "/algorythmo/api/v1/accounts/#{account.id}/brain/copilot/ask", headers: headers, params: { question: 'q?' }
          expect(response).to have_http_status(:forbidden)
        end
      end
    end
  end

  # POST /brain/mcp_token — implemented in PR M3-5 (T3).
  # Tenant gate still tested; happy-path response is 201 (not 501 stub).
  describe 'POST /brain/mcp_token' do
    context 'when non-founder' do
      it 'returns 403' do
        without_primary_account_match do
          post "/algorythmo/api/v1/accounts/#{account.id}/brain/mcp_token", headers: headers
          expect(response).to have_http_status(:forbidden)
        end
      end
    end
  end

  # DELETE /brain/mcp_sessions — implemented in PR M3-5 (T3).
  # Tenant gate still tested; happy-path response is 200 (not 501 stub).
  describe 'DELETE /brain/mcp_sessions' do
    context 'when non-founder' do
      it 'returns 403' do
        without_primary_account_match do
          delete "/algorythmo/api/v1/accounts/#{account.id}/brain/mcp_sessions", headers: headers
          expect(response).to have_http_status(:forbidden)
        end
      end
    end
  end
end
