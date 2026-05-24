# frozen_string_literal: true

require 'rails_helper'

# M0.6 — Feature flag tests
# algorythmo_show_captain and algorythmo_crm were migrated from config/features.yml
# (positions 64/65 — signed bigint overflow) to the dedicated algorythmo_feature_flags
# column at positions 14 and 15. Tests now verify the new column-based storage.
RSpec.describe 'Algorythmo feature flags', type: :model do
  let(:account) { create(:account) }

  describe 'show_captain (formerly algorythmo_show_captain)' do
    it 'is in CUT_FLAG_NAMES at position 14' do
      expect(Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.index('show_captain') + 1).to eq(14)
    end

    it 'defaults to false on a new account (fail-closed)' do
      expect(account.algorythmo_cut_enabled?('show_captain')).to be false
    end

    it 'can be enabled via algorythmo_feature_flags column' do
      account.algorythmo_cut_show_captain = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('show_captain')).to be true
    end
  end

  describe 'crm (formerly algorythmo_crm)' do
    it 'is in CUT_FLAG_NAMES at position 15' do
      expect(Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.index('crm') + 1).to eq(15)
    end

    it 'defaults to false on a new account (fail-closed)' do
      expect(account.algorythmo_cut_enabled?('crm')).to be false
    end

    it 'can be enabled via algorythmo_feature_flags column' do
      account.algorythmo_cut_crm = true
      account.save!
      expect(account.reload.algorythmo_cut_enabled?('crm')).to be true
    end

    it 'uses the algorythmo_feature_flags column (not the upstream feature_flags column)' do
      account.algorythmo_cut_crm = true
      account.save!
      expect(account.reload.algorythmo_feature_flags).to be_positive
    end
  end

  describe 'no Algorythmo flags remain in config/features.yml' do
    let(:features) { YAML.load_file(Rails.root.join('config/features.yml')) }

    it 'has no algorythmo_ prefixed entries (all migrated to dedicated column)' do
      algorythmo_flags = features.select { |f| f['name'].start_with?('algorythmo_') }
      expect(algorythmo_flags).to be_empty
    end
  end
end
