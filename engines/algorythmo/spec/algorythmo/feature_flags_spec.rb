# frozen_string_literal: true

require 'spec_helper'

# M0.6 — Feature flag tests
RSpec.describe 'Algorythmo feature flags', type: :model do
  describe 'algorythmo_show_captain' do
    it 'is defined in config/features.yml' do
      features = YAML.load_file(Rails.root.join('config/features.yml'))
      flag = features.find { |f| f['name'] == 'algorythmo_show_captain' }
      expect(flag).not_to be_nil
    end

    it 'defaults to false' do
      features = YAML.load_file(Rails.root.join('config/features.yml'))
      flag = features.find { |f| f['name'] == 'algorythmo_show_captain' }
      expect(flag['enabled']).to eq(false)
    end
  end
end
