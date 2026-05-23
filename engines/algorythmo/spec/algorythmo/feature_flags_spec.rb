# frozen_string_literal: true

require 'rails_helper'

# M0.6 — Feature flag tests
RSpec.describe 'Algorythmo feature flags', type: :model do
  let(:features) { YAML.load_file(Rails.root.join('config/features.yml')) }

  describe 'algorythmo_show_captain' do
    it 'is defined in config/features.yml' do
      flag = features.find { |f| f['name'] == 'algorythmo_show_captain' }
      expect(flag).not_to be_nil
    end

    it 'defaults to false' do
      flag = features.find { |f| f['name'] == 'algorythmo_show_captain' }
      expect(flag['enabled']).to eq(false)
    end
  end

  # M1/A.9 — algorythmo_crm feature flag
  describe 'algorythmo_crm' do
    it 'is defined in config/features.yml' do
      flag = features.find { |f| f['name'] == 'algorythmo_crm' }
      expect(flag).not_to be_nil
    end

    it 'defaults to false (fail-closed)' do
      flag = features.find { |f| f['name'] == 'algorythmo_crm' }
      expect(flag['enabled']).to eq(false)
    end

    it 'has the algorythmo_ prefix (ADR-0002 Q2 naming convention)' do
      crm_flags = features.select { |f| f['name'].start_with?('algorythmo_') }
      expect(crm_flags.map { |f| f['name'] }).to include('algorythmo_crm')
    end
  end
end
