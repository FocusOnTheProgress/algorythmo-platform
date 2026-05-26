# frozen_string_literal: true

require 'rails_helper'
require 'yaml'

# Gate spec for ADR-0013: no *_external key in gbrain_dream_cycle.yml may be true.
# If any external enrichment flag is flipped, this spec fails CI before the PR merges.
RSpec.describe 'gbrain_dream_cycle.yml' do
  let(:config_path) do
    Algorythmo::Engine.root.join('config', 'gbrain_dream_cycle.yml')
  end

  let(:config) { YAML.safe_load(File.read(config_path)) }

  it 'exists at the expected path' do
    expect(File).to exist(config_path)
  end

  it 'is valid YAML' do
    expect { config }.not_to raise_error
  end

  it 'enables auto_link' do
    expect(config['auto_link']).to be(true)
  end

  it 'enables dedup_entities' do
    expect(config['dedup_entities']).to be(true)
  end

  describe 'external enrichment gate (ADR-0013 hard line — M5 only)' do
    it 'has no *_external key set to true' do
      external_keys = config.keys.select { |k| k.end_with?('_external') }
      enabled = external_keys.select { |k| config[k] == true }

      expect(enabled).to be_empty,
                         "Found *_external flags set to true: #{enabled.join(', ')}. " \
                         'External enrichment is M5-only (ADR-0013). ' \
                         'Write a new ADR before enabling any *_external feature.'
    end
  end
end
