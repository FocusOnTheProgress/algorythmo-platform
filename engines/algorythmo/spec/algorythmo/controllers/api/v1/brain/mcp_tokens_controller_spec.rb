# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Api::V1::Brain::McpTokensController, type: :request do
  let(:account) { create(:account) }
  let(:user)    { create(:user, account: account, role: :administrator) }
  let(:headers) { { 'api_access_token' => user.access_token.token } }

  let(:base_path) do
    "/algorythmo/api/v1/accounts/#{account.id}/brain/mcp_token"
  end

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
  end

  # Stub filesystem writes so specs don't create actual files
  before do
    allow(FileUtils).to receive(:mkdir_p)
    allow_any_instance_of(File).to receive(:chmod) # rubocop:disable RSpec/AnyInstance
    allow_any_instance_of(File).to receive(:write) # rubocop:disable RSpec/AnyInstance
    allow(File).to receive(:open).and_call_original
    allow(File).to receive(:open).with(a_string_including('.algorythmo/mcp/'), 'w').and_yield(
      instance_double(File, chmod: nil, write: nil)
    )
  end

  # Stub Redis
  before do
    conn = instance_double(Redis::Namespace, setex: nil)
    pool = instance_double(ConnectionPool)
    # redis_pool is a private instance method on McpTokenIssuer
    allow_any_instance_of(Algorythmo::Brain::McpTokenIssuer).to receive(:redis_pool).and_return(pool) # rubocop:disable RSpec/AnyInstance
    allow(pool).to receive(:with).and_yield(conn)
  end

  describe 'POST /brain/mcp_token' do
    context 'with valid scope' do
      it 'returns 201 with token_file_path, command, expires_at, mode' do
        post base_path, headers: headers, params: { scope: 'read:truth' }
        expect(response).to have_http_status(:created)
        body = JSON.parse(response.body)
        expect(body).to include('token_file_path', 'command', 'expires_at', 'mode')
      end

      it 'creates a McpSession in the database' do
        expect do
          post base_path, headers: headers, params: { scope: 'read:truth' }
        end.to change(Algorythmo::McpSession, :count).by(1)
      end

      it 'returns mode: "stdio"' do
        post base_path, headers: headers, params: { scope: 'read:truth' }
        body = JSON.parse(response.body)
        expect(body['mode']).to eq('stdio')
      end

      it 'does NOT include raw token in the response body' do
        post base_path, headers: headers, params: { scope: 'read:truth' }
        body = JSON.parse(response.body)
        expect(body).not_to have_key('token')
        # The token file path is present but not the token value itself
        expect(body['token_file_path']).to include('.algorythmo/mcp/token-')
      end

      it 'creates token file with chmod 0600 semantics' do
        file_double = instance_double(File, chmod: nil, write: nil)
        allow(File).to receive(:open).with(a_string_including('.algorythmo/mcp/'), 'w').and_yield(file_double)

        post base_path, headers: headers, params: { scope: 'read:truth' }

        expect(file_double).to have_received(:chmod).with(0o600)
      end
    end

    context 'with invalid scope' do
      it 'returns 422' do
        post base_path, headers: headers, params: { scope: 'invalid:scope' }
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context 'without scope (defaults to read:truth)' do
      it 'returns 201' do
        post base_path, headers: headers
        expect(response).to have_http_status(:created)
      end
    end

    context 'when unauthenticated' do
      it 'returns 401' do
        post base_path, params: { scope: 'read:truth' }
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
