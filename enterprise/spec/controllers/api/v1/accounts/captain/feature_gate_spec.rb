# frozen_string_literal: true

require 'rails_helper'

# M0.5 — Camada 2: Captain controller feature gate (shared across all 9 controllers)
#
# Every Captain API endpoint must return 403 when algorythmo_show_captain is off,
# and proceed normally when it's on.
#
# The gate is applied via Api::V1::Accounts::Captain::BaseController which includes
# Algorythmo::FeatureGate::ControllerConcern. These specs verify the contract once
# per representative endpoint rather than duplicating the full CRUD matrix for each
# controller — integration-level gate coverage; unit coverage lives in concern specs.
RSpec.describe 'Captain API feature gate (algorythmo_show_captain)', type: :request do
  let(:account) { create(:account) }
  let(:admin) { create(:user, account: account, role: :administrator) }
  let(:headers) { admin.create_new_auth_token }

  # Helper to simulate the flag state
  def set_captain_flag(enabled)
    allow_any_instance_of(Account).to receive(:feature_enabled?)
      .with('algorythmo_show_captain')
      .and_return(enabled)
    # Also stub Rails.cache.fetch to bypass caching in tests
    allow(Rails.cache).to receive(:fetch).and_call_original
    allow(Rails.cache).to receive(:fetch)
      .with(/algorythmo:gate:#{account.id}:algorythmo_show_captain/, anything)
      .and_yield
  end

  shared_examples 'gated by algorythmo_show_captain' do |http_method, path_template|
    let(:path) { path_template.gsub(':account_id', account.id.to_s) }

    context 'when algorythmo_show_captain is disabled (default)' do
      before { set_captain_flag(false) }

      it 'returns 403 Forbidden' do
        send(http_method, path, headers: headers, as: :json)
        expect(response).to have_http_status(:forbidden)
        expect(JSON.parse(response.body)['error']).to eq('Feature not enabled')
      end
    end
  end

  # AssistantsController
  describe 'AssistantsController' do
    it_behaves_like 'gated by algorythmo_show_captain', :get,
                    '/api/v1/accounts/:account_id/captain/assistants'
  end

  # AssistantResponsesController
  describe 'AssistantResponsesController' do
    it_behaves_like 'gated by algorythmo_show_captain', :get,
                    '/api/v1/accounts/:account_id/captain/assistant_responses'
  end

  # BulkActionsController
  describe 'BulkActionsController' do
    it_behaves_like 'gated by algorythmo_show_captain', :post,
                    '/api/v1/accounts/:account_id/captain/bulk_actions'
  end

  # CopilotThreadsController
  describe 'CopilotThreadsController' do
    it_behaves_like 'gated by algorythmo_show_captain', :get,
                    '/api/v1/accounts/:account_id/captain/copilot_threads'
  end

  # CustomToolsController
  describe 'CustomToolsController' do
    it_behaves_like 'gated by algorythmo_show_captain', :get,
                    '/api/v1/accounts/:account_id/captain/custom_tools'
  end

  # DocumentsController
  describe 'DocumentsController' do
    it_behaves_like 'gated by algorythmo_show_captain', :get,
                    '/api/v1/accounts/:account_id/captain/documents'
  end

  # InboxesController — requires assistant_id nested route
  describe 'InboxesController' do
    let(:assistant) { create(:captain_assistant, account: account) }

    context 'when algorythmo_show_captain is disabled' do
      before { set_captain_flag(false) }

      it 'returns 403 on GET /captain/assistants/:id/inboxes' do
        get "/api/v1/accounts/#{account.id}/captain/assistants/#{assistant.id}/inboxes",
            headers: headers, as: :json
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  # ScenariosController — requires assistant_id nested route
  describe 'ScenariosController' do
    let(:assistant) { create(:captain_assistant, account: account) }

    context 'when algorythmo_show_captain is disabled' do
      before { set_captain_flag(false) }

      it 'returns 403 on GET /captain/assistants/:id/scenarios' do
        get "/api/v1/accounts/#{account.id}/captain/assistants/#{assistant.id}/scenarios",
            headers: headers, as: :json
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  # CopilotMessagesController — requires copilot_thread_id nested route.
  # The gate fires as a before_action before the thread is looked up, so a
  # synthetic ID is sufficient — 403 must arrive before any DB lookup.
  describe 'CopilotMessagesController' do
    context 'when algorythmo_show_captain is disabled' do
      before { set_captain_flag(false) }

      it 'returns 403 on GET /captain/copilot_threads/:id/copilot_messages' do
        get "/api/v1/accounts/#{account.id}/captain/copilot_threads/999999/copilot_messages",
            headers: headers, as: :json
        expect(response).to have_http_status(:forbidden)
      end
    end
  end

  # Positive case: gate on → proceeds to actual controller logic (auth still applies)
  describe 'when algorythmo_show_captain is enabled' do
    before { set_captain_flag(true) }

    it 'allows the request through to AssistantsController (returns 200 or domain error, not 403)' do
      get "/api/v1/accounts/#{account.id}/captain/assistants",
          headers: headers, as: :json
      expect(response).not_to have_http_status(:forbidden)
    end
  end
end
