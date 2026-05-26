# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::McpSession, type: :model do
  let(:user)    { create(:user) }
  let(:account) { create(:account) }

  def build_session(overrides = {})
    described_class.new(
      {
        user:       user,
        account:    account,
        token_hash: Digest::SHA256.hexdigest("token-#{SecureRandom.hex(8)}"),
        scope:      Algorythmo::McpScopes::READ_TRUTH,
        expires_at: 8.hours.from_now
      }.merge(overrides)
    )
  end

  def create_session(overrides = {})
    build_session(overrides).tap(&:save!)
  end

  # ---------------------------------------------------------------------------
  # Validations
  # ---------------------------------------------------------------------------
  describe 'validations' do
    subject(:session) { build_session }

    it { is_expected.to be_valid }
    it { is_expected.to validate_presence_of(:token_hash) }
    it { is_expected.to validate_presence_of(:scope) }
    it { is_expected.to validate_presence_of(:expires_at) }
    it { is_expected.to belong_to(:user) }
    it { is_expected.to belong_to(:account) }

    it 'enforces unique token_hash' do
      hash = Digest::SHA256.hexdigest('fixed')
      create_session(token_hash: hash)
      duplicate = build_session(token_hash: hash)
      expect(duplicate).not_to be_valid
      expect(duplicate.errors[:token_hash]).not_to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # .active scope
  # ---------------------------------------------------------------------------
  describe '.active scope' do
    it 'includes sessions that are not revoked and not expired' do
      s = create_session
      expect(described_class.active).to include(s)
    end

    it 'excludes revoked sessions' do
      s = create_session
      s.update_columns(revoked_at: Time.current) # rubocop:disable Rails/SkipsModelValidations
      expect(described_class.active).not_to include(s)
    end

    it 'excludes expired sessions' do
      s = create_session(expires_at: 1.second.ago)
      expect(described_class.active).not_to include(s)
    end
  end

  # ---------------------------------------------------------------------------
  # #revoke!
  # ---------------------------------------------------------------------------
  describe '#revoke!' do
    it 'sets revoked_at to current time' do
      session = create_session
      freeze_time do
        session.revoke!
        expect(session.reload.revoked_at).to be_within(1.second).of(Time.current)
      end
    end

    it 'persists the change so the session no longer appears in .active' do
      session = create_session
      session.revoke!
      expect(described_class.active).not_to include(session)
    end
  end

  # ---------------------------------------------------------------------------
  # #touch_usage! — sliding TTL
  # ---------------------------------------------------------------------------
  describe '#touch_usage!' do
    it 'extends expires_at by 8 hours and records last_used_at' do
      session = create_session
      freeze_time do
        session.touch_usage!
        reloaded = session.reload
        expect(reloaded.expires_at).to be_within(1.second).of(8.hours.from_now)
        expect(reloaded.last_used_at).to be_within(1.second).of(Time.current)
      end
    end

    it 'is a no-op on a revoked session' do
      session = create_session
      original_expires_at = session.expires_at
      session.update_columns(revoked_at: 1.minute.ago) # rubocop:disable Rails/SkipsModelValidations
      session.touch_usage!
      expect(session.reload.expires_at).to be_within(1.second).of(original_expires_at)
    end

    it 'is a no-op on an expired session' do
      session = create_session(expires_at: 1.second.ago)
      session.touch_usage!
      # expires_at must remain in the past — it was expired at touch time
      expect(session.reload.expires_at).to be < Time.current
    end
  end

  # ---------------------------------------------------------------------------
  # No default_scope (D-A8)
  # ---------------------------------------------------------------------------
  describe 'no default_scope' do
    it 'unscoped includes revoked records' do
      session = create_session
      session.update_columns(revoked_at: Time.current) # rubocop:disable Rails/SkipsModelValidations
      expect(described_class.unscoped.where(id: session.id)).to exist
    end
  end
end
