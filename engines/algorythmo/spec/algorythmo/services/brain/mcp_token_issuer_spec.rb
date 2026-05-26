# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Brain::McpTokenIssuer do
  let(:user)    { create(:user) }
  let(:account) { create(:account) }
  let(:scope)   { Algorythmo::McpScopes::READ_TRUTH }

  # ---------------------------------------------------------------------------
  # Shared Redis stub
  # ---------------------------------------------------------------------------
  def stub_redis(conn = nil)
    conn ||= begin
      c = instance_double(Redis::Namespace)
      allow(c).to receive(:setex)
      c
    end
    pool = instance_double(ConnectionPool)
    # redis_pool is a private instance method — stub via allow_any_instance_of
    allow_any_instance_of(described_class).to receive(:redis_pool).and_return(pool)
    allow(pool).to receive(:with).and_yield(conn)
    conn
  end

  describe '.call — happy path' do
    before { stub_redis }

    it 'returns a non-empty raw token' do
      result = described_class.call(user: user, account: account, scope: scope)
      expect(result[:token]).to be_a(String).and(be_present)
    end

    it 'generates a 43-char URLSafe Base64 token (32 bytes, no padding)' do
      result = described_class.call(user: user, account: account, scope: scope)
      # URLSafe Base64 of 32 bytes = ceil(32 * 4/3) = 43 chars (no padding)
      expect(result[:token]).to match(/\A[A-Za-z0-9\-_]{43}\z/)
    end

    it 'does NOT persist the raw token — only the SHA-256 hash' do
      result  = described_class.call(user: user, account: account, scope: scope)
      session = result[:session]
      expect(session.token_hash).to eq(Digest::SHA256.hexdigest(result[:token]))
      expect(session.token_hash).not_to eq(result[:token])
    end

    it 'sets expires_at approximately 8 hours from now' do
      freeze_time do
        result = described_class.call(user: user, account: account, scope: scope)
        expect(result[:expires_at]).to be_within(1.second).of(8.hours.from_now)
      end
    end

    it 'returns the session object persisted to DB' do
      result = described_class.call(user: user, account: account, scope: scope)
      expect(result[:session]).to be_a(Algorythmo::McpSession)
      expect(result[:session]).to be_persisted
    end

    it 'returns token_file_path pointing to ~/.algorythmo/mcp/' do
      result = described_class.call(user: user, account: account, scope: scope)
      expect(result[:token_file_path]).to include('.algorythmo/mcp/token-')
    end

    it 'returns command using --auth-file (token NEVER in CLI arg)' do
      result = described_class.call(user: user, account: account, scope: scope)
      expect(result[:command]).to include('--auth-file')
      expect(result[:command]).not_to include(result[:token])
    end
  end

  # ---------------------------------------------------------------------------
  # Redis cache population
  # ---------------------------------------------------------------------------
  describe 'Redis cache' do
    it 'populates mcp:token:<hash> with a 5-minute TTL' do
      conn = instance_double(Redis::Namespace)
      allow(conn).to receive(:setex)
      stub_redis(conn)

      result = described_class.call(user: user, account: account, scope: scope)
      expected_key = "mcp:token:#{Digest::SHA256.hexdigest(result[:token])}"

      expect(conn).to have_received(:setex).with(
        expected_key,
        Algorythmo::Brain::McpTokenIssuer::REDIS_CACHE_TTL,
        kind_of(String)
      )
    end

    it 'stores user_id, account_id, scope, expires_at in cache payload' do
      payload_written = nil
      conn = instance_double(Redis::Namespace)
      allow(conn).to receive(:setex) { |_key, _ttl, payload| payload_written = payload }
      stub_redis(conn)

      described_class.call(user: user, account: account, scope: scope)

      parsed = JSON.parse(payload_written)
      expect(parsed['user_id']).to    eq(user.id)
      expect(parsed['account_id']).to eq(account.id)
      expect(parsed['scope']).to      eq(scope)
    end

    it 'issues the token even when Redis is down' do
      pool = instance_double(ConnectionPool)
      allow_any_instance_of(described_class).to receive(:redis_pool).and_return(pool)
      allow(pool).to receive(:with).and_raise(Redis::CannotConnectError, 'redis down')

      expect do
        described_class.call(user: user, account: account, scope: scope)
      end.not_to raise_error
    end
  end

  # ---------------------------------------------------------------------------
  # Scope validation
  # ---------------------------------------------------------------------------
  describe 'scope validation' do
    it 'raises InvalidScope for unknown scope' do
      expect do
        described_class.call(user: user, account: account, scope: 'bogus:scope')
      end.to raise_error(described_class::InvalidScope)
    end

    it 'accepts all valid scopes without raising' do
      stub_redis
      Algorythmo::McpScopes::ALL.each do |valid_scope|
        expect do
          described_class.call(user: user, account: account, scope: valid_scope)
        end.not_to raise_error
      end
    end
  end
end
