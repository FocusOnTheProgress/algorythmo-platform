# frozen_string_literal: true

require 'rails_helper'

# DCR = Dynamic Client Registration (RFC 7591).
# Gate: ENV['ALGORYTHMO_MCP_HTTP_ENABLED'] — OFF by default (Day-1 uses stdio).
# M3.5+ turns this ON when HTTP+OAuth transport is deployed (ADR-0014).
RSpec.describe Algorythmo::Oauth::DcrController, type: :request do
  let(:path) { '/algorythmo/oauth/clients' }

  describe 'POST /algorythmo/oauth/clients' do
    context 'when ALGORYTHMO_MCP_HTTP_ENABLED is not set (default OFF)' do
      before { allow(ENV).to receive(:fetch).and_call_original }

      it 'returns 404 (fail-closed)' do
        post path
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when ALGORYTHMO_MCP_HTTP_ENABLED=false' do
      before do
        allow(ENV).to receive(:fetch).and_call_original
        allow(ENV).to receive(:fetch).with('ALGORYTHMO_MCP_HTTP_ENABLED', 'false').and_return('false')
      end

      it 'returns 404' do
        post path
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when ALGORYTHMO_MCP_HTTP_ENABLED=true' do
      before do
        allow(ENV).to receive(:fetch).and_call_original
        allow(ENV).to receive(:fetch).with('ALGORYTHMO_MCP_HTTP_ENABLED', 'false').and_return('true')
      end

      it 'returns 200 (stub)' do
        post path
        expect(response).to have_http_status(:ok)
      end

      it 'returns a JSON body indicating dcr_stub status' do
        post path
        body = JSON.parse(response.body)
        expect(body['status']).to eq('dcr_stub')
      end
    end
  end
end
