# frozen_string_literal: true

require 'rails_helper'
require 'tempfile'

# Covers the DocumentsController contract (plan 0012 §6, PR3):
#   - auth fail-closed: no token → 401; wrong account → 403
#   - role gate (P1-A): non-admin agent → 403 on both index and create
#   - create: valid upload → 201 + record + worker enqueued
#   - create: hostile upload (exe renamed .pdf) → 422, no record, no enqueue
#   - create: bad category → 422
#   - index: paginated, newest-first, scoped to the account
RSpec.describe Algorythmo::Api::V1::Brain::DocumentsController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:agent)   { create(:user, account: account, role: :agent) }

  PDF_BYTES = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
  EXE_BYTES = "MZ\x90\x00\x03\x00\x00\x00".b

  # Write content to a file named exactly `filename` inside a tmpdir so that
  # fixture_file_upload's original_filename == filename (not a random tempfile name).
  def upload_for(content, filename:)
    dir  = Dir.mktmpdir('doc_upload_spec_')
    path = File.join(dir, filename)
    File.binwrite(path, content.respond_to?(:b) ? content.b : content)
    fixture_file_upload(path, 'application/octet-stream')
  end

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).with(anything, 'crm').and_return(true)
  end

  describe 'auth (fail-closed)' do
    it 'returns 401 with no token' do
      get :index, params: { account_id: account.id }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 403 when the account is not the configured primary tenant' do
      other = create(:account)
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', other.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token

      get :index, params: { account_id: account.id }
      expect(response).to have_http_status(:forbidden)
    end
  end

  # P1-A: role gate — Brain curation is admin-only; agents can only read via Copilot.
  # Pundit::NotAuthorizedError is rescued by RequestExceptionHandler#render_unauthorized
  # which returns 401 (matching the behaviour of LeadsController#destroy for agents).
  describe 'role gate (admin-only)' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', account.id.to_s)
      request.headers['api_access_token'] = agent.access_token.token
    end

    it 'returns 401 for GET #index when called by a non-admin agent' do
      get :index, params: { account_id: account.id }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 401 for POST #create when called by a non-admin agent' do
      post :create, params: {
        account_id: account.id,
        file: upload_for("# doc\nbody", filename: 'doc.md'),
        category: 'manuals'
      }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'does not create a document record when the agent is rejected' do
      expect do
        post :create, params: {
          account_id: account.id,
          file: upload_for("# doc\nbody", filename: 'doc.md'),
          category: 'manuals'
        }
      end.not_to change(Algorythmo::Brain::Document, :count)
    end
  end

  context 'when authenticated as the primary-tenant admin' do
    before do
      stub_env('ALGORYTHMO_PRIMARY_ACCOUNT_ID', account.id.to_s)
      request.headers['api_access_token'] = admin.access_token.token
    end

    describe 'POST #create' do
      it 'accepts a valid .md upload, persists it, and enqueues ingestion' do
        expect(Algorythmo::Brain::BrainDocumentIngestionWorker).to receive(:perform_async)
          .with(account.id, kind_of(Integer))

        expect do
          post :create, params: {
            account_id: account.id,
            file: upload_for("# manual\nbody", filename: 'manual.md'),
            category: 'manuals'
          }
        end.to change(Algorythmo::Brain::Document, :count).by(1)

        aggregate_failures do
          expect(response).to have_http_status(:created)
          doc = Algorythmo::Brain::Document.last
          expect(doc.filename).to eq('manual.md')
          expect(doc.category).to eq('manuals')
          expect(doc).to be_status_pending
          expect(doc.file).to be_attached
        end
      end

      it 'rejects a Windows executable renamed to .pdf without persisting or enqueueing' do
        expect(Algorythmo::Brain::BrainDocumentIngestionWorker).not_to receive(:perform_async)

        expect do
          post :create, params: {
            account_id: account.id,
            file: upload_for(EXE_BYTES, filename: 'invoice.pdf'),
            category: 'manuals'
          }
        end.not_to change(Algorythmo::Brain::Document, :count)

        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'rejects an unknown category' do
        post :create, params: {
          account_id: account.id,
          file: upload_for('body', filename: 'manual.md'),
          category: 'not_a_category'
        }
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'rejects a missing file' do
        post :create, params: { account_id: account.id, category: 'manuals' }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    describe 'GET #index' do
      it 'lists the account documents newest-first with pagination meta' do
        create(:algorythmo_brain_document, account: account, filename: 'older.md', created_at: 2.days.ago)
        create(:algorythmo_brain_document, account: account, filename: 'newer.md', created_at: 1.hour.ago)

        get :index, params: { account_id: account.id }

        body = response.parsed_body
        aggregate_failures do
          expect(response).to have_http_status(:ok)
          expect(body['documents'].map { |d| d['filename'] }).to eq(%w[newer.md older.md])
          expect(body['meta']['total_count']).to eq(2)
        end
      end

      it 'does not leak documents from another account' do
        other = create(:account)
        create(:algorythmo_brain_document, account: other, filename: 'foreign.md')

        get :index, params: { account_id: account.id }

        expect(response.parsed_body['documents']).to be_empty
      end
    end
  end

  def stub_env(key, value)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with(key).and_return(value)
  end
end
