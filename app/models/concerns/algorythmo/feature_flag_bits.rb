# frozen_string_literal: true

# Manages Algorythmo OS cut-surface feature flags stored in the dedicated
# accounts.algorythmo_feature_flags bigint column.
#
# Flags occupy positions 1–26 — all safely within the signed bigint range (max: 63).
# Zero collision with Chatwoot upstream accounts.feature_flags column.
#
# Include in Account via `include Algorythmo::FeatureFlagBits`.
module Algorythmo::FeatureFlagBits
  extend ActiveSupport::Concern

  # Short names of the cut surfaces, in bit-position order (1-based).
  # Position N = array index N-1. Order is IMMUTABLE — reordering corrupts existing data.
  # Positions 14–15 migrated from features.yml (algorythmo_show_captain pos 64, algorythmo_crm pos 65)
  # to this dedicated column to eliminate signed bigint overflow risk.
  # Position 16 — algorythmo: M6.1-a: reports_commercial (Relatórios Comerciais overlay).
  #   Default NOT cut (= overlay visible for all accounts until explicitly disabled).
  # Positions 17–26 — algorythmo: M2-a: top-level cuts + per-sector cuts.
  #   campaigns_top_level / help_center_top_level: top-level sidebar entries hidden by default.
  #   sector_*: per-sector sidebar cuts; default NOT cut (visible) except sector_facilities
  #   which is cut (hidden) until M2-g ships the Facilities route.
  CUT_FLAG_NAMES = %w[
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
    show_captain
    crm
    reports_commercial
    campaigns_top_level
    help_center_top_level
    sector_commercial
    sector_marketing
    sector_operations
    sector_procurement
    sector_hr
    sector_facilities
    sector_finance
    sector_administration
  ].freeze

  # Positions 14–15: "enable flags" — check means SHOW the feature (opposite semantic from cut flags).
  # Explicit list (not last(2)) so appending further cut flags doesn't silently corrupt the split.
  ENABLE_FLAG_NAMES = %w[show_captain crm].freeze
  raise 'ENABLE_FLAG_NAMES must be a subset of CUT_FLAG_NAMES' \
    unless (ENABLE_FLAG_NAMES - CUT_FLAG_NAMES).empty?

  # FlagShihTzu flag map: position (1-based) => method name symbol.
  CUT_FLAG_MAP = CUT_FLAG_NAMES
                 .each_with_index
                 .to_h { |name, i| [i + 1, :"algorythmo_cut_#{name}"] }
                 .freeze

  included do
    include FlagShihTzu
    has_flags CUT_FLAG_MAP.merge(
      column: 'algorythmo_feature_flags',
      flag_query_mode: :bit_operator,
      check_for_column: false
    )
  end

  # Returns true if the named cut flag is enabled for this account.
  # @param flag_name [String, Symbol] short name WITHOUT algorythmo_ prefix
  def algorythmo_cut_enabled?(flag_name)
    name = flag_name.to_s.delete_prefix('algorythmo_cut_').delete_prefix('algorythmo_')
    return false unless CUT_FLAG_NAMES.include?(name)

    send(:"algorythmo_cut_#{name}?")
  end

  # Returns a hash of all cut flags and their enabled state for this account.
  def all_algorythmo_cut_flags
    CUT_FLAG_NAMES.index_with { |name| algorythmo_cut_enabled?(name) }
  end
end
