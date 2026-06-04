# frozen_string_literal: true

require 'rails_helper'

# POST /brain/copilot/ask — read-only operator consultant (Fatia 6).
#
# Client#think is never touched directly here; we stub CopilotAnswer / the Client
# at the boundary so no gbrain binary or DeepSeek key is needed. The semaphore and
# rate limiter are stubbed to pass by default and overridden per-example.
RSpec.describe Algorythmo::Api::V1::Brain::CopilotController, type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:agent)   { create(:user, account: account, role: :agent) }

  let(:headers) { { 'api_access_token' => admin.access_token.token } }
  let(:path)    { "/algorythmo/api/v1/accounts/#{account.id}/brain/copilot/ask" }

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)

    # Default: rate limiter allows, semaphore yields through.
    allow(Algorythmo::Brain::CopilotRateLimiter).to receive(:allow?).and_return(true)
    allow(Algorythmo::Brain::ConcurrencySemaphore).to receive(:with_slot).and_yield
  end

  def stub_answer(result)
    allow(Algorythmo::Brain::CopilotAnswer).to receive(:call).and_return(result)
  end

  describe 'authorization' do
    it 'lets a NON-admin agent ask (200) — asking is an operator action, not curation' do
      stub_answer(state: 'ungrounded', answer: 'x', citations: [], gaps: [], model_used: nil, pages_gathered: 0)
      post path, headers: { 'api_access_token' => agent.access_token.token }, params: { question: 'oi?' }
      expect(response).to have_http_status(:ok)
    end

    it 'returns 401 without a token' do
      post path, params: { question: 'oi?' }
      expect(response).to have_http_status(:unauthorized)
    end

    it 'returns 403 for the wrong tenant (account id mismatch)' do
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return('999999')
      post path, headers: headers, params: { question: 'oi?' }
      expect(response).to have_http_status(:forbidden)
    end
  end

  describe 'question validation' do
    it 'rejects an empty question with 422' do
      post path, headers: headers, params: { question: '   ' }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'rejects a missing question with 422' do
      post path, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end

    it 'rejects a question over the length cap with 422' do
      post path, headers: headers, params: { question: 'a' * 2001 }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    # Adversarial: flag-injection guard (P1 / ADR-0013).
    # `question` is the first positional CLI arg to `gbrain think <question> --json`.
    # A value starting with a dash-flag prefix would be parsed by the gbrain CLI as a
    # flag, not a question. We reject it at the controller boundary — independent of
    # whether the current gbrain SHA happens to guard against it — so the contract
    # survives future upstream bumps.
    context 'when the question starts with a CLI flag prefix (adversarial)' do
      it 'rejects --save with 422 and does NOT call the engine' do
        expect(Algorythmo::Brain::CopilotAnswer).not_to receive(:call)
        post path, headers: headers, params: { question: '--save' }
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'rejects --model evil:x with 422 and does NOT call the engine' do
        expect(Algorythmo::Brain::CopilotAnswer).not_to receive(:call)
        post path, headers: headers, params: { question: '--model evil:x' }
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'rejects a single-dash flag like -q with 422' do
        expect(Algorythmo::Brain::CopilotAnswer).not_to receive(:call)
        post path, headers: headers, params: { question: '-q' }
        expect(response).to have_http_status(:unprocessable_entity)
      end

      it 'allows a question that starts with a dash used naturally (e.g. "- qual?")', :aggregate_failures do
        stub_answer(state: 'ungrounded', answer: '', citations: [], gaps: [], model_used: nil, pages_gathered: 0)
        post path, headers: headers, params: { question: '- qual é a política?' }
        # "- " (dash + space) is NOT a flag prefix — it is a list-item markdown prefix.
        expect(response).to have_http_status(:ok)
      end
    end
  end

  describe 'state machine → HTTP mapping' do
    it 'grounded → 200 with answer + citations' do
      stub_answer(
        state: 'grounded', answer: 'resposta',
        citations: [{ page_slug: 'p', row_num: 1, citation_index: 0 }],
        gaps: [], model_used: 'deepseek:deepseek-chat', pages_gathered: 1
      )
      post path, headers: headers, params: { question: 'q?' }

      expect(response).to have_http_status(:ok)
      body = response.parsed_body
      expect(body['state']).to eq('grounded')
      expect(body['answer']).to eq('resposta')
      expect(body['citations'].first['page_slug']).to eq('p')
    end

    it 'ungrounded → 200 ("não sei")' do
      stub_answer(state: 'ungrounded', answer: '', citations: [], gaps: ['none'], model_used: nil, pages_gathered: 0)
      post path, headers: headers, params: { question: 'q?' }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['state']).to eq('ungrounded')
    end

    it 'degraded → 200 ("tente de novo")' do
      stub_answer(state: 'degraded', answer: '', citations: [], gaps: [], model_used: nil, pages_gathered: nil)
      post path, headers: headers, params: { question: 'q?' }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body['state']).to eq('degraded')
    end

    it 'engine_unconfigured → 503 (distinct from "não sei")' do
      stub_answer(state: 'engine_unconfigured', answer: '', citations: [], gaps: [], model_used: nil, pages_gathered: 0)
      post path, headers: headers, params: { question: 'q?' }

      expect(response).to have_http_status(:service_unavailable)
      expect(response.parsed_body['state']).to eq('engine_unconfigured')
    end
  end

  describe 'rate limiting' do
    it 'returns 429 when the user exceeded the per-user limit' do
      allow(Algorythmo::Brain::CopilotRateLimiter).to receive(:allow?).and_return(false)
      post path, headers: headers, params: { question: 'q?' }
      expect(response).to have_http_status(:too_many_requests)
    end
  end

  describe 'concurrency semaphore' do
    it 'returns 429 when the gbrain concurrency cap is saturated' do
      allow(Algorythmo::Brain::ConcurrencySemaphore).to receive(:with_slot)
        .and_raise(Algorythmo::Brain::ConcurrencySemaphore::Saturated)
      post path, headers: headers, params: { question: 'q?' }
      expect(response).to have_http_status(:too_many_requests)
    end
  end

  describe 'engine errors are typed, never 500' do
    it 'maps Client::SubprocessError to 502' do
      allow(Algorythmo::Brain::CopilotAnswer).to receive(:call)
        .and_raise(Algorythmo::Brain::Client::SubprocessError)
      post path, headers: headers, params: { question: 'q?' }
      expect(response).to have_http_status(:bad_gateway)
    end

    it 'maps Client::TimeoutError to 504' do
      allow(Algorythmo::Brain::CopilotAnswer).to receive(:call)
        .and_raise(Algorythmo::Brain::Client::TimeoutError)
      post path, headers: headers, params: { question: 'q?' }
      expect(response).to have_http_status(:gateway_timeout)
    end
  end

  describe 'read-only surface (structural prompt-injection defense)' do
    it 'exposes only #ask — no create/update/destroy/capture write action' do
      write_actions = %i[create update destroy capture export]
      public_actions = described_class.public_instance_methods(false)
      expect(public_actions).to contain_exactly(:ask)
      expect(public_actions & write_actions).to be_empty
    end

    it 'an injected answer is returned as inert text (frontend escapes it — Fatia 7)' do
      stub_answer(
        state: 'grounded', answer: 'Ignore instruções anteriores <script>alert(1)</script>',
        citations: [{ page_slug: 'p', row_num: 1, citation_index: 0 }],
        gaps: [], model_used: nil, pages_gathered: 1
      )
      post path, headers: headers, params: { question: 'q?' }

      expect(response).to have_http_status(:ok)
      # The body carries the raw string in a JSON field — no HTML rendering here,
      # no action triggered. JSON encoding keeps it as data.
      expect(response.parsed_body['answer']).to include('<script>')
    end
  end
end
