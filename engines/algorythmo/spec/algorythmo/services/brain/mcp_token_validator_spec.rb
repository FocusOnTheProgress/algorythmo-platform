# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Brain::McpTokenValidator do
  let(:raw_token)  { Base64.urlsafe_encode64(SecureRandom.bytes(32), padding: false) }
  let(:token_hash) { Digest::SHA256.hexdigest(raw_token) }
  let(:user)       { create(:user) }
  let(:account)    { create(:account) }

  let(:session) do
    Algorythmo::McpSession.create!(
      user: user,
      account: account,
      token_hash: token_hash,
      scope: Algorythmo::McpScopes::READ_TRUTH,
      expires_at: 8.hours.from_now
    )
  end

  let(:redis_key) { "mcp:token:#{token_hash}" }

  # ---------------------------------------------------------------------------
  # Shared Redis stub helpers
  # ---------------------------------------------------------------------------
  def stub_redis_get(value)
    conn = instance_double(Redis::Namespace)
    allow(conn).to receive(:get).with(redis_key).and_return(value)
    allow(conn).to receive(:setex)
    pool = instance_double(ConnectionPool)
    # redis_pool is a private instance method — stub via allow_any_instance_of
    allow_any_instance_of(described_class).to receive(:redis_pool).and_return(pool)
    allow(pool).to receive(:with).and_yield(conn)
    conn
  end

  def stub_redis_down
    pool = instance_double(ConnectionPool)
    allow_any_instance_of(described_class).to receive(:redis_pool).and_return(pool)
    allow(pool).to receive(:with).and_raise(Redis::CannotConnectError, 'redis down')
  end

  def cached_payload
    JSON.generate(
      user_id: user.id,
      account_id: account.id,
      scope: Algorythmo::McpScopes::READ_TRUTH,
      expires_at: 8.hours.from_now.iso8601
    )
  end

  # ---------------------------------------------------------------------------
  # Redis hit
  # ---------------------------------------------------------------------------
  describe 'Redis cache hit' do
    before { session } # ensure DB session exists for touch_usage!

    it 'returns session info from Redis cache payload' do
      stub_redis_get(cached_payload)

      result = described_class.call(token: raw_token)
      expect(result[:user_id]).to    eq(user.id)
      expect(result[:account_id]).to eq(account.id)
      expect(result[:scope]).to      eq(Algorythmo::McpScopes::READ_TRUTH)
    end
  end

  # ---------------------------------------------------------------------------
  # Redis miss → DB hit
  # ---------------------------------------------------------------------------
  describe 'Redis miss + DB hit' do
    it 'returns session info from DB' do
      session
      stub_redis_get(nil)

      result = described_class.call(token: raw_token)
      expect(result[:user_id]).to eq(user.id)
    end

    it 'repopulates Redis cache with 5-min TTL' do
      session
      conn = stub_redis_get(nil)

      described_class.call(token: raw_token)

      expect(conn).to have_received(:setex).with(
        redis_key,
        Algorythmo::Brain::McpTokenValidator::REDIS_CACHE_TTL,
        kind_of(String)
      )
    end

    it 'calls touch_usage! to slide the TTL' do
      session
      stub_redis_get(nil)

      expect_any_instance_of(Algorythmo::McpSession).to receive(:touch_usage!)
      described_class.call(token: raw_token)
    end
  end

  # ---------------------------------------------------------------------------
  # Redis miss + DB miss → McpAuthExpired
  # ---------------------------------------------------------------------------
  describe 'Redis miss + DB miss' do
    it 'raises McpAuthExpired' do
      stub_redis_get(nil)
      # No session created — DB has no matching record
      expect do
        described_class.call(token: raw_token)
      end.to raise_error(described_class::McpAuthExpired)
    end
  end

  # ---------------------------------------------------------------------------
  # Redis down + DB hit → repopulate + success
  # ---------------------------------------------------------------------------
  describe 'Redis down + DB hit' do
    it 'falls back to DB and returns session info' do
      session
      stub_redis_down

      expect do
        result = described_class.call(token: raw_token)
        expect(result[:user_id]).to eq(user.id)
      end.not_to raise_error
    end
  end

  # ---------------------------------------------------------------------------
  # Redis down + DB down → McpAuthUnavailable
  # ---------------------------------------------------------------------------
  describe 'Redis down + DB down' do
    it 'raises McpAuthUnavailable' do
      stub_redis_down
      allow(Algorythmo::McpSession).to receive(:active).and_raise(ActiveRecord::StatementInvalid, 'db down')

      expect do
        described_class.call(token: raw_token)
      end.to raise_error(described_class::McpAuthUnavailable)
    end
  end

  # ---------------------------------------------------------------------------
  # Revoked session → McpAuthExpired
  # ---------------------------------------------------------------------------
  describe 'revoked session' do
    it 'raises McpAuthExpired even if Redis has a stale cache hit' do
      # Revoke the session in DB
      session.update_columns(revoked_at: 1.minute.ago) # rubocop:disable Rails/SkipsModelValidations
      # Redis miss (revocation cleared cache)
      stub_redis_get(nil)

      expect do
        described_class.call(token: raw_token)
      end.to raise_error(described_class::McpAuthExpired)
    end
  end

  # ---------------------------------------------------------------------------
  # Expired session → McpAuthExpired
  # ---------------------------------------------------------------------------
  describe 'expired session' do
    it 'raises McpAuthExpired' do
      session.update_columns(expires_at: 1.second.ago) # rubocop:disable Rails/SkipsModelValidations
      stub_redis_get(nil)

      expect do
        described_class.call(token: raw_token)
      end.to raise_error(described_class::McpAuthExpired)
    end
  end

  # ---------------------------------------------------------------------------
  # Sliding TTL extends expires_at on DB hit
  # ---------------------------------------------------------------------------
  describe 'sliding TTL' do
    it 'extends expires_at after a DB-path validation' do
      session
      stub_redis_get(nil)

      freeze_time do
        described_class.call(token: raw_token)
        expect(session.reload.expires_at).to be_within(1.second).of(8.hours.from_now)
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Primary-account guard (Day-1 single-account invariant)
  # ---------------------------------------------------------------------------
  describe 'primary account guard' do
    let(:other_account) { create(:account) }

    it 'raises McpAuthExpired when session.account_id does not match ENV primary' do
      session
      stub_redis_get(nil)
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(other_account.id.to_s)

      expect do
        described_class.call(token: raw_token)
      end.to raise_error(described_class::McpAuthExpired, /account_id/)
    end

    it 'passes when session.account_id matches ENV primary' do
      session
      stub_redis_get(nil)
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)

      expect do
        described_class.call(token: raw_token)
      end.not_to raise_error
    end

    it 'is a no-op when ENV primary is unset (M3.5 multi-tenant path)' do
      session
      stub_redis_get(nil)
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(nil)

      expect do
        described_class.call(token: raw_token)
      end.not_to raise_error
    end
  end

  # ---------------------------------------------------------------------------
  # Sentry breadcrumb on failure
  # ---------------------------------------------------------------------------
  describe 'Sentry breadcrumb' do
    it 'adds a breadcrumb when McpAuthExpired is raised' do
      stub_redis_get(nil)

      breadcrumb_klass = Class.new do
        def initialize(**); end
      end
      sentry_module = Module.new do
        def self.add_breadcrumb(_); end
      end
      sentry_module.const_set(:Breadcrumb, breadcrumb_klass)

      stub_const('Sentry', sentry_module)
      allow(Sentry).to receive(:add_breadcrumb)

      expect { described_class.call(token: raw_token) }.to raise_error(described_class::McpAuthExpired)
      expect(Sentry).to have_received(:add_breadcrumb)
    end
  end
end
