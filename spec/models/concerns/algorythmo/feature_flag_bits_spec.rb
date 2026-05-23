# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::FeatureFlagBits do
  let(:account) { create(:account) }

  describe 'CUT_FLAG_NAMES' do
    it 'contains exactly 13 flags' do
      expect(described_class::CUT_FLAG_NAMES.size).to eq(13)
    end

    it 'is frozen' do
      expect(described_class::CUT_FLAG_NAMES).to be_frozen
    end
  end

  describe '#algorythmo_cut_enabled?' do
    it 'returns false for all 13 flags on a fresh account' do
      described_class::CUT_FLAG_NAMES.each do |flag|
        expect(account.algorythmo_cut_enabled?(flag)).to(
          be(false),
          "expected algorythmo_cut_#{flag} to be false on a new account"
        )
      end
    end

    it 'returns true after the flag is set on the account' do
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be true
    end

    it 'returns false again after disabling the flag' do
      account.algorythmo_cut_campaigns = true
      account.save!
      account.algorythmo_cut_campaigns = false
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be false
    end

    it 'accepts symbols' do
      expect(account.algorythmo_cut_enabled?(:campaigns)).to be false
    end

    it 'accepts the algorythmo_ prefix' do
      expect(account.algorythmo_cut_enabled?('algorythmo_campaigns')).to be false
    end

    it 'accepts the algorythmo_cut_ prefix' do
      expect(account.algorythmo_cut_enabled?('algorythmo_cut_campaigns')).to be false
    end

    it 'returns false for unknown flag names' do
      expect(account.algorythmo_cut_enabled?('nonexistent')).to be false
    end

    it 'is independent per flag — setting one does not affect another' do
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('macros')).to be false
    end

    it 'is independent per account' do
      other_account = create(:account)
      account.algorythmo_cut_campaigns = true
      account.save!
      expect(other_account.algorythmo_cut_enabled?('campaigns')).to be false
    end
  end

  describe '#all_algorythmo_cut_flags' do
    it 'returns a hash with all 13 flags' do
      result = account.all_algorythmo_cut_flags
      expect(result.keys).to match_array(described_class::CUT_FLAG_NAMES)
    end

    it 'returns all false on a fresh account' do
      expect(account.all_algorythmo_cut_flags.values).to all(be false)
    end
  end
end
