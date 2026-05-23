# Reopens Algorythmo::FeatureGate (defined in engines/algorythmo/app/services/algorythmo/feature_gate.rb)
# to add the `enabled?` convenience method used by M2 cut-gate callers.
#
# The engine module provides `feature_enabled?(account, full_flag_name)` with a 30s cache.
# This extension adds:
#   - ALGORYTHMO_CUT_FLAGS — explicit allowlist of the 13 M2 surfaces (docs/plans/cuts.md)
#   - enabled?(account, short_name) — caller passes 'campaigns', not 'algorythmo_campaigns'
#   - Fail-closed for nil account, nil/blank flag, or unknown flag name
#
# All 13 cut flags occupy safe bigint positions (4–57) via slot repurposing.
# See config/features.yml for per-flag position annotations.
module Algorythmo
  module FeatureGate
    # Short names (WITHOUT algorythmo_ prefix) of all 13 M2 cut surfaces.
    # docs/plans/cuts.md
    ALGORYTHMO_CUT_FLAGS = %w[
      campaigns
      help_center
      sla
      audit_logs
      custom_roles
      security_settings
      billing_settings
      agent_bots
      macros
      dashboard_apps
      advanced_assignment
      reports_bot
      conversation_workflow
    ].freeze

    # Returns true if the given Algorythmo cut feature flag is enabled for the account.
    #
    # @param account [Account] the Chatwoot account record (nil → false, fail-closed)
    # @param flag_name [String, Symbol] short name WITHOUT the algorythmo_ prefix
    #   e.g. 'campaigns', :help_center
    # @return [Boolean]
    #
    # Delegates to the engine's feature_enabled? which wraps Account#feature_enabled?
    # with a 30-second per-account per-flag Rails.cache entry.
    def self.enabled?(account, flag_name)
      return false if account.nil?

      name = flag_name.to_s
      return false if name.blank?
      return false unless ALGORYTHMO_CUT_FLAGS.include?(name)

      feature_enabled?(account, "algorythmo_#{name}")
    end
  end
end
