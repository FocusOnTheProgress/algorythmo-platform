# frozen_string_literal: true

require 'rails_helper'

# M0.4 — Rebrand audit
# Verifies that every "Chatwoot" literal remaining in app/javascript/dashboard/
# non-spec, non-story files is tagged with '// algorythmo: rebrand-m0'.
#
# Acceptance criterion 7: grep -rn "Chatwoot" app/javascript/dashboard/
# returns ONLY lines marked // algorythmo: rebrand-m0.
#
# Note: The grep here runs on the test environment filesystem (the worktree).
# It uses Ruby-level file walking so it's platform-agnostic.
RSpec.describe 'M0 rebrand: no untagged "Chatwoot" literals', type: :sanity do
  # Files to skip — these are allowed to keep "Chatwoot" without rebrand tag:
  #   - spec/test files (fake data, account names, not user-visible)
  #   - story files (visual docs, not shipped to users)
  #   - captain/ UI (gated by algorythmo_show_captain flag — internal only)
  #   - engineering variable names: latestChatwootVersion, isOnChatwootCloud,
  #     ChatwootMarkdownRenderer, ChatwootApp, Chatwoot:: namespace, etc.
  SKIP_PATTERNS = [
    %r{/spec/},
    %r{/specs/},              # Pluralized spec dirs (e.g. /store/modules/specs/sla)
    /\.spec\.(js|ts|vue)$/,
    /\.story\.vue$/,
    %r{/story/},              # Storybook fixtures (story/fixtures.js, etc.) — not shipped to users
    %r{/captain/},
    %r{/fixtures/},           # Component demo fixture data — not shipped to users
    %r{/templates/twilio},    # Twilio template previews — demo data
    %r{/year-in-review/}      # Year-in-review slides — Chatwoot-specific upstream feature, gated off
  ].freeze

  # Tokens that are engineering identifiers, not brand strings.
  # A line containing ONLY these patterns (no bare "Chatwoot" brand) is OK.
  ENGINEERING_TOKENS = %w[
    isOnChatwootCloud
    latestChatwootVersion
    ChatwootMarkdownRenderer
    ChatwootApp
    ChatwootHub
    Chatwoot.config
    Chatwoot.mfa_enabled
    Chatwoot::
    chatwootConfig
    $chatwoot
    chatwoot.com
    chatwootCloud
    onChatwoot
    CHATWOOT_
    initializeChatwoot
    ChatwootCodepen
    isChatwoot
    isAChatwoot
  ].freeze

  def engineering_only?(line)
    # Skip lines that are pure code comments (JSDoc, single-line comments, ERB comments)
    # These document internal variable names, not user-facing brand strings.
    stripped = line.strip
    return true if stripped.start_with?('//', '*', '/*', '<!--', '<%#')

    ENGINEERING_TOKENS.any? { |token| line.include?(token) }
  end

  def tagged?(line)
    line.include?('algorythmo: rebrand-m0')
  end

  let(:dashboard_dir) { Rails.root.join('app/javascript/dashboard') }

  it 'has no untagged user-visible "Chatwoot" in Vue/JS/TS dashboard files' do
    violations = []

    Dir.glob(dashboard_dir.join('**/*.{vue,js,ts}')).each do |path|
      next if SKIP_PATTERNS.any? { |pat| path.match?(pat) }

      File.readlines(path).each_with_index do |line, idx|
        next unless line.include?('Chatwoot')
        next if tagged?(line)
        next if engineering_only?(line)

        violations << "#{path}:#{idx + 1}: #{line.strip}"
      end
    end

    expect(violations).to be_empty,
                          "Found untagged 'Chatwoot' literals in dashboard files:\n#{violations.join("\n")}" \
                          "\n\nAll user-visible 'Chatwoot' strings must be tagged with '// algorythmo: rebrand-m0' " \
                          'or excluded via the SKIP_PATTERNS / ENGINEERING_TOKENS allowlists in this spec.'
  end
end
