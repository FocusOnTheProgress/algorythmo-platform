# frozen_string_literal: true

require 'rails_helper'

# M2-B1 smoke spec — fails the Ruby CI suite EARLY (before Playwright spins up)
# when the dashboard cut-flag surface drifts out of sync with the Ruby source
# of truth. Three invariants are checked:
#
#   1. Every flag in `Algorythmo::FeatureGate::ALGORYTHMO_CUT_FLAGS` (minus the
#      two "enable" flags `show_captain` and `crm`, which are handled by their
#      own surfaces and not part of the M2 cut batch) has a route declared in
#      `CUT_FLAGS_TO_ROUTE`.
#
#   2. Every cut-flag route is parameterized by `:account_id` — catches the
#      regression where a copy-pasted route forgets the account scope and
#      ends up gated globally instead of per-account.
#
#   3. Every cut flag has an i18n label key present in the English locale,
#      under the JSON file declared in `CUT_FLAGS_TO_I18N_KEY`. Catches the
#      drift case where a sidebar entry is gated by a flag but the actual
#      label was renamed/removed — the surface would gate "nothing" forever.
#
# This spec is intentionally lightweight: no DB, no factories, just pure data
# parity. Heavy assertions live in the Playwright suite in
# `spec/system/algorythmo/cuts/`. The two layers complement each other —
# RSpec fails fast on data drift; Playwright fails on actual browser behavior.
#
# Excluded from the parity check (and why):
#   - `show_captain` (position 14) and `crm` (position 15) — these are
#     "enable" flags, not cut flags. The surface is hidden by default and the
#     flag must be set to true to SHOW it (opposite semantic). Their gating
#     UX is exercised by `engines/algorythmo/spec/algorythmo/feature_flags_spec.rb`
#     and by the Captain/CRM surface specs respectively.

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'Algorythmo cut flags surface mapping' do
  # rubocop:enable RSpec/DescribeClass
  CUT_FLAGS_TO_ROUTE = {
    'campaigns' => '/app/accounts/:account_id/campaigns',
    'help_center' => '/app/accounts/:account_id/portals',
    'sla' => '/app/accounts/:account_id/settings/sla',
    'audit_logs' => '/app/accounts/:account_id/settings/audit-logs',
    'custom_roles' => '/app/accounts/:account_id/settings/custom-roles',
    'security_settings' => '/app/accounts/:account_id/settings/security',
    'billing_settings' => '/app/accounts/:account_id/settings/billing',
    'agent_bots' => '/app/accounts/:account_id/settings/agent-bots',
    'macros' => '/app/accounts/:account_id/settings/macros',
    'dashboard_apps' => '/app/accounts/:account_id/settings/integrations/dashboard_apps',
    'advanced_assignment' => '/app/accounts/:account_id/settings/assignment-policy',
    'reports_bot' => '/app/accounts/:account_id/reports/bot',
    'conversation_workflow' => '/app/accounts/:account_id/settings/conversation-workflow'
  }.freeze

  # i18n key tuples: [locale_file_name, dotted_key_path_within_that_file].
  # dashboard_apps lives in integrations.json — it's the only cut surface
  # without a sidebar entry (in-page tab inside Settings > Integrations).
  # All other 12 flags label sidebar entries declared in settings.json.
  CUT_FLAGS_TO_I18N_KEY = {
    'campaigns' => ['settings.json', 'SIDEBAR.CAMPAIGNS'],
    'help_center' => ['settings.json', 'SIDEBAR.HELP_CENTER.TITLE'],
    'sla' => ['settings.json', 'SIDEBAR.SLA'],
    'audit_logs' => ['settings.json', 'SIDEBAR.AUDIT_LOGS'],
    'custom_roles' => ['settings.json', 'SIDEBAR.CUSTOM_ROLES'],
    'security_settings' => ['settings.json', 'SIDEBAR.SECURITY'],
    'billing_settings' => ['settings.json', 'SIDEBAR.BILLING'],
    'agent_bots' => ['settings.json', 'SIDEBAR.AGENT_BOTS'],
    'macros' => ['settings.json', 'SIDEBAR.MACROS'],
    'dashboard_apps' => ['integrations.json', 'INTEGRATION_SETTINGS.DASHBOARD_APPS.TITLE'],
    'advanced_assignment' => ['settings.json', 'SIDEBAR.AGENT_ASSIGNMENT'],
    'reports_bot' => ['settings.json', 'SIDEBAR.REPORTS_BOT'],
    'conversation_workflow' => ['settings.json', 'SIDEBAR.CONVERSATION_WORKFLOW']
  }.freeze

  LOCALE_DIR = Rails.root.join('app/javascript/dashboard/i18n/locale/en').freeze

  it 'covers every flag in ALGORYTHMO_CUT_FLAGS except the two enable flags' do
    expected = (Algorythmo::FeatureGate::ALGORYTHMO_CUT_FLAGS - %w[show_captain crm]).sort
    expect(CUT_FLAGS_TO_ROUTE.keys.sort).to eq(expected)
  end

  it 'every route is account-scoped (contains :account_id)' do
    missing_scope = CUT_FLAGS_TO_ROUTE.reject { |_flag, route| route.include?(':account_id') }
    expect(missing_scope).to be_empty, "Routes missing :account_id scope: #{missing_scope.inspect}"
  end

  it 'every cut flag has a matching i18n entry present in the English locale' do
    missing = CUT_FLAGS_TO_I18N_KEY.each_with_object([]) do |(flag, (file, key)), acc|
      locale_path = LOCALE_DIR.join(file)
      unless File.exist?(locale_path)
        acc << "#{flag}: locale file #{file} not found"
        next
      end

      json = JSON.parse(File.read(locale_path))
      value = key.split('.').reduce(json) { |node, segment| node.is_a?(Hash) ? node[segment] : nil }

      acc << "#{flag}: i18n key #{key} missing in #{file}" if value.nil? || value.to_s.strip.empty?
    end

    expect(missing).to be_empty, "Cut flags missing i18n labels:\n  #{missing.join("\n  ")}"
  end

  it 'i18n parity: route map and i18n map cover exactly the same flags' do
    expect(CUT_FLAGS_TO_ROUTE.keys.sort).to eq(CUT_FLAGS_TO_I18N_KEY.keys.sort)
  end
end
