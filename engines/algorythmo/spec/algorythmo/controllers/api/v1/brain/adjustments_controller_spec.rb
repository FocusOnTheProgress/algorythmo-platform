# frozen_string_literal: true

require 'rails_helper'

# Request spec for Algorythmo::Api::V1::Brain::AdjustmentsController#create
# (plan 0012 §6, PR4 — "colar conhecimento" / pasted-text adjustments).
#
# Salvaguardas:
#   1. Admin + valid content        → 201, Document created, worker enqueued
#   2. Non-admin agent              → 401/403, no document, no enqueue
#   3. Unauthenticated              → 401, no enqueue
#   4. Non-primary-tenant account   → 403 fail-closed
#   5. Empty content                → 422
#   6. Missing content param        → 422
#   7. Content > 1 MiB              → 422
#   8. Worker is NOT called sync    — enqueued, not executed inline
#   9. Document attrs               → category "ajuste", content_type "text/markdown",
#                                     status pending, filename matches "ajuste-*.md"
#
# Active Storage is tested via attached blob (io: StringIO) — real attach, no mocking.
# BrainDocumentIngestionWorker is stubbed to confirm enqueue without actually running.
# Model.create! is used for setup; no factory_bot factories for adjustment records.
RSpec.describe Algorythmo::Api::V1::Brain::AdjustmentsController, type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:agent)   { create(:user, account: account, role: :agent) }

  let(:headers_admin) { { 'api_access_token' => admin.access_token.token } }
  let(:headers_agent) { { 'api_access_token' => agent.access_token.token } }

  let(:path) { "/algorythmo/api/v1/accounts/#{account.id}/brain/adjustments" }

  let(:valid_content) { "# Política de Devolução\n\nOs clientes têm 30 dias para devolver itens." }

  before do
    # Feature gate: crm must be enabled for Brain::BaseController to pass.
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    # Stub the worker — we verify enqueue by message expectation, not by running it.
    allow(Algorythmo::Brain::BrainDocumentIngestionWorker).to receive(:perform_async)
  end

  def stub_primary_account
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
  end

  def stub_wrong_account
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return('0')
  end

  # ---------------------------------------------------------------------------
  # 1. Happy path — admin pastes valid content
  # ---------------------------------------------------------------------------
  describe 'POST /brain/adjustments — admin with valid content' do
    before { stub_primary_account }

    it 'returns 201' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(response).to have_http_status(:created)
    end

    it 'creates exactly one Document record' do
      expect do
        post path, params: { content: valid_content }, headers: headers_admin
      end.to change(Algorythmo::Brain::Document, :count).by(1)
    end

    it 'sets document category to "ajuste"' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last.category).to eq('ajuste')
    end

    it 'sets document content_type to "text/markdown"' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last.content_type).to eq('text/markdown')
    end

    it 'sets document status to pending' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last).to be_status_pending
    end

    it 'sets filename matching the ajuste-*.md pattern' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last.filename).to match(/\Aajuste-.+\.md\z/)
    end

    it 'attaches the content as a blob' do
      post path, params: { content: valid_content }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last.file).to be_attached
    end

    it 'enqueues BrainDocumentIngestionWorker with the new document id' do
      expect(Algorythmo::Brain::BrainDocumentIngestionWorker).to receive(:perform_async)
        .with(account.id, kind_of(Integer))

      post path, params: { content: valid_content }, headers: headers_admin
    end

    it 'does NOT call the worker synchronously (returns before ingestion completes)' do
      # perform_async is stubbed — if the worker ran inline, capture would have
      # been called; verify it is never called during the request.
      expect_any_instance_of(Algorythmo::Brain::Client).not_to receive(:capture)

      post path, params: { content: valid_content }, headers: headers_admin
    end

    it 'uses the title as the filename slug when title is provided' do
      post path, params: { content: valid_content, title: 'Política de Preços' }, headers: headers_admin
      expect(Algorythmo::Brain::Document.last.filename).to start_with('ajuste-pol')
    end

    it 'returns the document JSON shape' do
      post path, params: { content: valid_content }, headers: headers_admin
      body = JSON.parse(response.body)
      expect(body).to include('id', 'filename', 'content_type', 'category', 'status', 'created_at')
    end
  end

  # ---------------------------------------------------------------------------
  # 2. Role gate — non-admin agent is rejected
  # ---------------------------------------------------------------------------
  describe 'POST /brain/adjustments — non-admin agent' do
    before { stub_primary_account }

    it 'returns 401 (Pundit maps NotAuthorizedError → render_unauthorized)' do
      post path, params: { content: valid_content }, headers: headers_agent
      expect(response).to have_http_status(:unauthorized)
    end

    it 'does not create any document' do
      expect do
        post path, params: { content: valid_content }, headers: headers_agent
      end.not_to change(Algorythmo::Brain::Document, :count)
    end

    it 'does not enqueue the ingestion worker' do
      expect(Algorythmo::Brain::BrainDocumentIngestionWorker).not_to receive(:perform_async)
      post path, params: { content: valid_content }, headers: headers_agent
    end
  end

  # ---------------------------------------------------------------------------
  # 3. Unauthenticated request → 401
  # ---------------------------------------------------------------------------
  describe 'POST /brain/adjustments — unauthenticated' do
    before { stub_primary_account }

    it 'returns 401 before reaching the controller action' do
      post path, params: { content: valid_content }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'does not enqueue the ingestion worker' do
      expect(Algorythmo::Brain::BrainDocumentIngestionWorker).not_to receive(:perform_async)
      post path, params: { content: valid_content }
    end
  end

  # ---------------------------------------------------------------------------
  # 4. Wrong tenant → 403 fail-closed
  # ---------------------------------------------------------------------------
  describe 'POST /brain/adjustments — non-primary-tenant account' do
    before { stub_wrong_account }

    it 'returns 403 without creating any record' do
      expect do
        post path, params: { content: valid_content }, headers: headers_admin
      end.not_to change(Algorythmo::Brain::Document, :count)

      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # 5-7. Input validation — all as primary-tenant admin
  # ---------------------------------------------------------------------------
  context 'when authenticated as the primary-tenant admin' do
    before { stub_primary_account }

    describe 'content validation' do
      it 'returns 422 when content is an empty string' do
        post path, params: { content: '' }, headers: headers_admin
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'does not create a document or enqueue a worker for empty content' do
        expect(Algorythmo::Brain::BrainDocumentIngestionWorker).not_to receive(:perform_async)
        expect do
          post path, params: { content: '' }, headers: headers_admin
        end.not_to change(Algorythmo::Brain::Document, :count)
      end

      it 'returns 422 when the content param is missing' do
        post path, params: {}, headers: headers_admin
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'does not create a document when the content param is missing' do
        expect do
          post path, params: {}, headers: headers_admin
        end.not_to change(Algorythmo::Brain::Document, :count)
      end

      it 'returns 422 when content exceeds 1 MiB' do
        giant = 'x' * (1 * 1024 * 1024 + 1)
        post path, params: { content: giant }, headers: headers_admin
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'does not create a document when content is too large' do
        giant = 'x' * (1 * 1024 * 1024 + 1)
        expect do
          post path, params: { content: giant }, headers: headers_admin
        end.not_to change(Algorythmo::Brain::Document, :count)
      end

      it 'accepts content exactly at the 1 MiB limit' do
        boundary = 'x' * (1 * 1024 * 1024)
        expect do
          post path, params: { content: boundary }, headers: headers_admin
        end.to change(Algorythmo::Brain::Document, :count).by(1)

        expect(response).to have_http_status(:created)
      end

      it 'scrubs invalid UTF-8 bytes and still succeeds' do
        # Append a lone continuation byte — after scrub it becomes a replacement char.
        content_with_bad_bytes = "valid text\xFF"
        post path, params: { content: content_with_bad_bytes }, headers: headers_admin
        expect(response).to have_http_status(:created)
        expect(Algorythmo::Brain::Document.last.filename).to match(/\Aajuste-.+\.md\z/)
      end
    end
  end
end
