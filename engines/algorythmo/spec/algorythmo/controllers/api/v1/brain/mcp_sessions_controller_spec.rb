# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Api::V1::Brain::McpSessionsController, type: :request do
  let(:account)       { create(:account) }
  let(:user)          { create(:user, account: account, role: :administrator) }
  let(:other_account) { create(:account) }
  let(:other_user)    { create(:user, account: other_account, role: :administrator) }
  let(:headers)       { { 'api_access_token' => user.access_token.token } }

  let(:base_path) do
    "/algorythmo/api/v1/accounts/#{account.id}/brain/mcp_sessions"
  end

  let(:redis_conn) do
    conn = instance_double(Redis::Namespace)
    allow(conn).to receive(:del)
    conn
  end

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
    allow($alfred).to receive(:with).and_yield(redis_conn) # rubocop:disable Style/GlobalVars
  end

  def create_active_session(for_user:, for_account:)
    Algorythmo::McpSession.create!(
      user: for_user,
      account: for_account,
      token_hash: Digest::SHA256.hexdigest(SecureRandom.hex(32)),
      scope: Algorythmo::McpScopes::READ_TRUTH,
      expires_at: 8.hours.from_now
    )
  end

  describe 'DELETE /brain/mcp_sessions' do
    context 'with active sessions for current user + account' do
      it 'revokes all active sessions' do
        s1 = create_active_session(for_user: user, for_account: account)
        s2 = create_active_session(for_user: user, for_account: account)

        delete base_path, headers: headers

        expect(response).to have_http_status(:ok)
        expect(s1.reload.revoked_at).not_to be_nil
        expect(s2.reload.revoked_at).not_to be_nil
      end

      it 'returns { revoked: true }' do
        create_active_session(for_user: user, for_account: account)
        delete base_path, headers: headers
        expect(JSON.parse(response.body)['revoked']).to be(true)
      end

      it 'calls Redis DEL on each session cache key' do
        s = create_active_session(for_user: user, for_account: account)
        expected_key = "mcp:token:#{s.token_hash}"

        delete base_path, headers: headers

        expect(redis_conn).to have_received(:del).with(expected_key)
      end
    end

    context 'cross-user isolation — user A cannot revoke user B sessions' do
      it 'only revokes sessions belonging to current_user' do
        own_session   = create_active_session(for_user: user,       for_account: account)
        other_session = create_active_session(for_user: other_user, for_account: other_account)

        delete base_path, headers: headers

        expect(own_session.reload.revoked_at).not_to be_nil
        # other_user's session must remain untouched
        expect(other_session.reload.revoked_at).to be_nil
      end
    end

    context 'when Redis DEL fails' do
      it 'still revokes DB sessions (best-effort Redis)' do
        conn = instance_double(Redis::Namespace)
        allow(conn).to receive(:del).and_raise(Redis::CannotConnectError, 'redis down')
        allow($alfred).to receive(:with).and_yield(conn) # rubocop:disable Style/GlobalVars

        s = create_active_session(for_user: user, for_account: account)
        delete base_path, headers: headers

        expect(response).to have_http_status(:ok)
        expect(s.reload.revoked_at).not_to be_nil
      end
    end

    context 'when unauthenticated' do
      it 'returns 401' do
        delete base_path
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when no active sessions exist' do
      it 'returns 200 with revoked: true (idempotent)' do
        delete base_path, headers: headers
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['revoked']).to be(true)
      end
    end
  end
end
