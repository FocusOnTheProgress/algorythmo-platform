# frozen_string_literal: true

require 'rails_helper'

# Tests the defense-in-depth MCP revocation wired into DeviseOverrides::SessionsController#destroy.
# When a user signs out via the UI, all their active MCP sessions are revoked (D-A5).
RSpec.describe DeviseOverrides::SessionsController, type: :request do
  let(:account) { create(:account) }
  let(:user)    { create(:user, account: account) }

  def create_mcp_session(for_user:, for_account:)
    Algorythmo::McpSession.create!(
      user: for_user,
      account: for_account,
      token_hash: Digest::SHA256.hexdigest(SecureRandom.hex(32)),
      scope: Algorythmo::McpScopes::READ_TRUTH,
      expires_at: 8.hours.from_now
    )
  end

  def sign_in_user(user_record)
    post '/auth/sign_in',
         params: { email: user_record.email, password: user_record.password },
         headers: { 'Content-Type' => 'application/json' }
    JSON.parse(response.body).dig('data', 'access-token')
  end

  describe 'DELETE /auth/sign_out (Devise logout)' do
    context 'when Algorythmo engine is loaded' do
      before do
        # Ensure the constant is defined (it is in test env, but guard explicitly)
        skip 'Algorythmo::McpSession not defined' unless defined?(Algorythmo::McpSession)
      end

      it 'revokes all active MCP sessions for the user on logout' do
        session = create_mcp_session(for_user: user, for_account: account)

        # Perform actual sign-out (token from a pre-created token for simplicity)
        token = user.create_token
        user.save!
        delete '/auth/sign_out',
               headers: {
                 'access-token' => token.token,
                 'token-type' => 'Bearer',
                 'client' => token.client,
                 'uid' => user.uid
               }

        expect(session.reload.revoked_at).not_to be_nil
      end

      it 'does not prevent logout when MCP revocation raises' do
        allow(Algorythmo::McpSession).to receive(:active).and_raise(StandardError, 'db error')

        token = user.create_token
        user.save!

        expect do
          delete '/auth/sign_out',
                 headers: {
                   'access-token' => token.token,
                   'token-type' => 'Bearer',
                   'client' => token.client,
                   'uid' => user.uid
                 }
        end.not_to raise_error

        # Logout must still succeed (200) even if MCP revocation failed
        expect(response).to have_http_status(:ok)
      end
    end
  end
end
