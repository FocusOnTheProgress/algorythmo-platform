# frozen_string_literal: true

require 'rails_helper'
require 'json'

# M0 rebrand: frontend i18n overlay audit
#
# Verifies that the Algorythmo OS i18n overlay files:
#   1. Are valid JSON.
#   2. Contain ZERO remaining "Chatwoot" literals in their values — every
#      value that was "Chatwoot" in upstream must have been replaced.
#   3. Cover all 30 known upstream Chatwoot string positions (spot-checked
#      by key path presence in the overlay files).
#
# The deep-merge runtime behaviour (that overlay values win over base) is
# validated separately by Vitest in:
#   app/javascript/dashboard/i18n/i18n_overlay.spec.js
RSpec.describe 'M0 rebrand: frontend i18n overlay files', type: :sanity do
  OVERRIDE_DIR = Rails.root.join(
    'engines/algorythmo/app/javascript/i18n/overrides'
  ).freeze

  # Returns all string values (leaves) from a nested hash.
  def collect_string_values(obj, path = '')
    values = []
    case obj
    when Hash
      obj.each do |k, v|
        values.concat(collect_string_values(v, "#{path}.#{k}"))
      end
    when String
      values << { path: path.delete_prefix('.'), value: obj }
    end
    values
  end

  shared_examples 'a clean override file' do |locale|
    let(:file_path) { OVERRIDE_DIR.join("#{locale}.json") }
    let(:parsed) { JSON.parse(File.read(file_path)) }

    it 'is valid JSON' do
      expect { parsed }.not_to raise_error
    end

    it 'has no "Chatwoot" in any override value' do
      # Strip template variables like {latestChatwootVersion} — those are
      # interpolation placeholders bound to upstream code, not user-visible text.
      violations = collect_string_values(parsed).select do |entry|
        stripped = entry[:value].gsub(/\{[^}]*\}/, '')
        stripped.include?('Chatwoot')
      end

      expect(violations).to be_empty,
                            "Override file #{locale}.json still contains 'Chatwoot' in values:\n" \
                            "#{violations.map { |v| "  #{v[:path]}: #{v[:value][0, 120]}" }.join("\n")}"
    end

    it 'overrides GENERAL_SETTINGS.UPDATE_CHATWOOT' do
      expect(parsed.dig('GENERAL_SETTINGS', 'UPDATE_CHATWOOT')).to be_present
    end

    it 'overrides INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT' do
      expect(parsed.dig('INBOX_MGMT', 'WIDGET_BUILDER', 'BRANDING_TEXT')).to be_present
    end

    it 'overrides LOGIN.TITLE' do
      expect(parsed.dig('LOGIN', 'TITLE')).to be_present
    end

    it 'overrides REGISTER.GET_STARTED' do
      expect(parsed.dig('REGISTER', 'GET_STARTED')).to be_present
    end

    it 'overrides INTEGRATION_SETTINGS.WEBHOOK.SIDEBAR_TXT' do
      expect(parsed.dig('INTEGRATION_SETTINGS', 'WEBHOOK', 'SIDEBAR_TXT')).to be_present
    end

    it 'overrides LABEL_MGMT.SUGGESTIONS.POWERED_BY' do
      expect(parsed.dig('LABEL_MGMT', 'SUGGESTIONS', 'POWERED_BY')).to be_present
    end
  end

  describe 'en.json' do
    it_behaves_like 'a clean override file', 'en'

    it 'replaces Chatwoot with Algorythmo OS in the branding text' do
      parsed = JSON.parse(File.read(OVERRIDE_DIR.join('en.json')))
      expect(parsed.dig('INBOX_MGMT', 'WIDGET_BUILDER', 'BRANDING_TEXT'))
        .to include('Algorythmo OS')
    end
  end

  describe 'pt_BR.json' do
    it_behaves_like 'a clean override file', 'pt_BR'

    it 'replaces Chatwoot with Algorythmo OS in the branding text (pt-BR)' do
      parsed = JSON.parse(File.read(OVERRIDE_DIR.join('pt_BR.json')))
      expect(parsed.dig('INBOX_MGMT', 'WIDGET_BUILDER', 'BRANDING_TEXT'))
        .to include('Algorythmo OS')
    end
  end
end
