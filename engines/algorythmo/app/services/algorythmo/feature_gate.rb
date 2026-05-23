# frozen_string_literal: true

# Feature gate for Algorythmo OS feature flags.
#
# This module wraps Chatwoot's existing `Account#feature_enabled?` with a
# per-request in-process cache (Rails.cache with a 30-second TTL) to avoid
# hammering Redis on every controller action when the same flag is checked
# multiple times within a single request cycle.
#
# Decision T7 / P2 rationale:
#   Rails.cache with a 30s TTL is intentional:
#   - In the MVP (single-server, laptop), this is in-memory MemoryStore — zero network.
#   - In a future multi-tenant deploy, this becomes a shared Redis/Memcache entry.
#   - 30 seconds is short enough that a flag toggle takes effect within one minute
#     across all workers — acceptable for a feature flag (not a security boundary).
#   - Alternative of a pure per-request memoization (@ivar) would be lost after
#     each Sidekiq job hop; Rails.cache survives across job boundaries within the window.
#   - We do NOT use pub/sub invalidation per P2 (over-engineered for the laptop MVP).
module Algorythmo::FeatureGate
  # Short names of the 13 M2 surfaces that can be cut per-account.
  # These flags live in accounts.algorythmo_feature_flags (dedicated bigint column),
  # NOT in accounts.feature_flags — zero conflict with Chatwoot upstream bits.
  # Positions 1–13 in the new column: all safely within signed bigint range.
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

  # Returns true if the given Algorythmo feature flag is enabled for the account.
  # Results are cached per-account per-flag for 30 seconds to avoid N Redis round-trips
  # when multiple before_actions or nested service calls check the same flag.
  #
  # @param account [Account] the Chatwoot account record
  # @param flag_name [String] the feature flag name (e.g. 'algorythmo_show_captain')
  # @return [Boolean]
  def self.feature_enabled?(account, flag_name)
    # Fail-closed: missing account or flag → feature is disabled.
    # Defensive — Captain::BaseController inherits current_account from
    # Api::V1::Accounts::BaseController, so account should be non-nil here.
    # But a misconfigured listener or service hop could pass nil, and we'd
    # rather return false than raise NoMethodError on a security boundary.
    return false if account.nil? || flag_name.blank?

    cache_key = "algorythmo:gate:#{account.id}:#{flag_name}"

    Rails.cache.fetch(cache_key, expires_in: 30.seconds) do
      account.feature_enabled?(flag_name)
    end
  end

  # Returns true if the given M2 cut-surface flag is enabled for the account.
  # Reads from accounts.algorythmo_feature_flags (dedicated bigint column).
  #
  # Accepts BOTH short names ('campaigns') and full names ('algorythmo_campaigns') —
  # the algorythmo_ prefix is stripped before the allowlist check.
  #
  # @param account [Account] the Chatwoot account record (nil → false, fail-closed)
  # @param cut_flag_name [String, Symbol] short name or full name with algorythmo_ prefix
  # @return [Boolean]
  def self.cut_enabled?(account, cut_flag_name)
    return false if account.nil?

    name = cut_flag_name.to_s.delete_prefix('algorythmo_cut_').delete_prefix('algorythmo_')
    return false if name.blank?
    return false unless ALGORYTHMO_CUT_FLAGS.include?(name)

    cache_key = "algorythmo:cut:#{account.id}:#{name}"
    Rails.cache.fetch(cache_key, expires_in: 30.seconds) do
      account.algorythmo_cut_enabled?(name)
    end
  end
end
