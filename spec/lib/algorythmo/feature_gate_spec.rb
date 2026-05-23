# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::FeatureGate do
  let(:account) { create(:account) }

  # All algorythmo_* cut flags default to false (fail-closed by features.yml repurpose).
  describe '.feature_enabled?' do
    it 'returns false for a flag that is disabled by default' do
      expect(described_class.feature_enabled?(account, 'campaigns')).to be false
    end

    it 'returns false for all 13 CUT flags by default' do
      described_class::ALGORYTHMO_CUT_FLAGS.each do |flag|
        expect(described_class.feature_enabled?(account, flag)).to(
          be(false),
          "expected algorythmo_#{flag} to be false by default"
        )
      end
    end

    it 'returns true after enabling the flag on the account' do
      account.enable_features!('algorythmo_campaigns')
      expect(described_class.feature_enabled?(account, 'campaigns')).to be true
    end

    it 'returns false again after disabling the flag' do
      account.enable_features!('algorythmo_campaigns')
      account.disable_features!('algorythmo_campaigns')
      expect(described_class.feature_enabled?(account, 'campaigns')).to be false
    end

    it 'accepts symbol flag names' do
      expect(described_class.feature_enabled?(account, :campaigns)).to be false
    end

    it 'returns false for nil account (fail-closed, no NoMethodError)' do
      expect(described_class.feature_enabled?(nil, 'campaigns')).to be false
    end

    it 'returns false for nil flag name (fail-closed)' do
      expect(described_class.feature_enabled?(account, nil)).to be false
    end

    it 'returns false for blank flag name' do
      expect(described_class.feature_enabled?(account, '')).to be false
    end

    it 'returns false for unknown flag name (not in ALGORYTHMO_CUT_FLAGS)' do
      expect(described_class.feature_enabled?(account, 'nonexistent')).to be false
    end

    it 'returns false when caller accidentally passes the full algorythmo_ prefix' do
      # Prevents double-prefix: algorythmo_algorythmo_campaigns — not in allowlist
      expect(described_class.feature_enabled?(account, 'algorythmo_campaigns')).to be false
    end

    it 'is independent per account' do
      other_account = create(:account)
      account.enable_features!('algorythmo_campaigns')
      expect(described_class.feature_enabled?(other_account, 'campaigns')).to be false
    end
  end

  # CI guard: ensures all algorythmo cut flags fit within the signed bigint range.
  # The feature_flags column is bigint (signed 64-bit). FlagShihTzu assigns positions
  # by YAML order (1-based). Bit 2^(pos-1) must fit in 63 bits of signed bigint.
  # Positions 1–63 are safe. Position 64+ overflows (known pre-existing issue for
  # algorythmo_show_captain and algorythmo_crm — tracked for separate migration).
  describe 'bigint safety — ALGORYTHMO_CUT_FLAGS positions' do
    let(:all_features) { YAML.safe_load(Rails.root.join('config/features.yml').read) }
    let(:flag_positions) do
      all_features.each_with_index.filter_map do |feature, idx|
        [feature['name'], idx + 1] if feature['name'].start_with?('algorythmo_') &&
                                       described_class::ALGORYTHMO_CUT_FLAGS.include?(
                                         feature['name'].sub('algorythmo_', '')
                                       )
      end.to_h
    end

    it 'all 13 cut flags occupy bit positions ≤ 63 (safe bigint range)' do
      flag_positions.each do |name, pos|
        expect(pos).to(
          be <= 63,
          "#{name} is at position #{pos} which overflows signed bigint (2^#{pos - 1})"
        )
      end
    end

    it 'all 13 cut flags are present in features.yml' do
      expect(flag_positions.size).to eq(13)
    end
  end
end
