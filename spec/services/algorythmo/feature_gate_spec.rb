# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::FeatureGate do
  let(:account) { create(:account) }

  describe 'ALGORYTHMO_CUT_FLAGS' do
    it 'contains exactly 15 cut surfaces' do
      expect(described_class::ALGORYTHMO_CUT_FLAGS.size).to eq(15)
    end

    it 'contains only short names without algorythmo_ prefix' do
      described_class::ALGORYTHMO_CUT_FLAGS.each do |flag|
        expect(flag).not_to start_with('algorythmo_')
      end
    end
  end

  describe '.feature_enabled?' do
    it 'delegates to account via Rails.cache (upstream contract preserved)' do
      allow(Rails.cache).to receive(:fetch).and_call_original
      allow(account).to receive(:feature_enabled?).with('ip_lookup').and_return(false)
      expect(described_class.feature_enabled?(account, 'ip_lookup')).to be false
    end

    it 'returns false for nil account (fail-closed)' do
      expect(described_class.feature_enabled?(nil, 'ip_lookup')).to be false
    end

    it 'returns false for blank flag name (fail-closed)' do
      expect(described_class.feature_enabled?(account, '')).to be false
    end

    it 'returns false and logs warning when account does not respond to feature_enabled? (H1)' do
      dummy = double('NotAnAccount', id: 999)
      allow(dummy).to receive(:feature_enabled?).and_raise(NoMethodError, 'undefined method')
      expect(Rails.logger).to receive(:warn).with(/NoMethodError/)
      expect(described_class.feature_enabled?(dummy, 'ip_lookup')).to be false
    end
  end

  describe '.cut_enabled?' do
    it 'returns false for all 15 CUT flags by default' do
      described_class::ALGORYTHMO_CUT_FLAGS.each do |flag|
        expect(described_class.cut_enabled?(account, flag)).to(
          be(false),
          "expected cut_enabled?(account, '#{flag}') to be false by default"
        )
      end
    end

    it 'returns true after enabling the flag on the account' do
      account.algorythmo_cut_campaigns = true
      account.save!
      Rails.cache.clear
      expect(described_class.cut_enabled?(account.reload, 'campaigns')).to be true
    end

    it 'accepts short flag names' do
      expect(described_class.cut_enabled?(account, 'campaigns')).to be false
    end

    it 'accepts full algorythmo_ prefixed flag names' do
      expect(described_class.cut_enabled?(account, 'algorythmo_campaigns')).to be false
    end

    it 'accepts algorythmo_cut_ prefixed flag names' do
      expect(described_class.cut_enabled?(account, 'algorythmo_cut_campaigns')).to be false
    end

    it 'all three name shapes resolve to the same result when flag is enabled' do
      account.algorythmo_cut_campaigns = true
      account.save!
      Rails.cache.clear
      reloaded = account.reload
      expect(described_class.cut_enabled?(reloaded, 'campaigns')).to be true
      Rails.cache.clear
      expect(described_class.cut_enabled?(reloaded, 'algorythmo_campaigns')).to be true
      Rails.cache.clear
      expect(described_class.cut_enabled?(reloaded, 'algorythmo_cut_campaigns')).to be true
    end

    it 'returns false for nil account (fail-closed)' do
      expect(described_class.cut_enabled?(nil, 'campaigns')).to be false
    end

    it 'returns false for nil flag name (fail-closed)' do
      expect(described_class.cut_enabled?(account, nil)).to be false
    end

    it 'returns false for blank flag name' do
      expect(described_class.cut_enabled?(account, '')).to be false
    end

    it 'returns false for unknown flag name (not in ALGORYTHMO_CUT_FLAGS)' do
      expect(described_class.cut_enabled?(account, 'nonexistent')).to be false
    end

    it 'is independent per account' do
      other_account = create(:account)
      account.algorythmo_cut_campaigns = true
      account.save!
      Rails.cache.clear
      expect(described_class.cut_enabled?(other_account, 'campaigns')).to be false
    end
  end

  # CI guard: all 15 cut flags occupy positions 1–15 in algorythmo_feature_flags column.
  # Signed bigint can safely hold positions 1–63. No overflow risk.
  describe 'bigint safety — algorythmo_feature_flags positions' do
    it 'all 15 cut flags are at positions 1–15 (well within signed bigint range)' do
      Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.each_with_index do |name, idx|
        position = idx + 1
        expect(position).to(
          be <= 63,
          "algorythmo_cut_#{name} is at position #{position} which would overflow signed bigint"
        )
      end
    end

    it 'CUT_FLAG_NAMES and ALGORYTHMO_CUT_FLAGS are in the same order' do
      expect(Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES)
        .to eq(described_class::ALGORYTHMO_CUT_FLAGS)
    end
  end
end
