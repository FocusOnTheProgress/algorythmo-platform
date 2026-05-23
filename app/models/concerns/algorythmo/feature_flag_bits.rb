# frozen_string_literal: true

# Manages Algorythmo OS cut-surface feature flags stored in the dedicated
# accounts.algorythmo_feature_flags bigint column.
#
# Flags occupy positions 1–13 — all safely within the signed bigint range (max: 63).
# Zero collision with Chatwoot upstream accounts.feature_flags column.
#
# Include in Account via `include Algorythmo::FeatureFlagBits`.
module Algorythmo
  module FeatureFlagBits
    extend ActiveSupport::Concern

    # Short names of the 13 M2 cut surfaces, in bit-position order (1-based).
    # Position N = array index N-1. Order is IMMUTABLE — reordering corrupts existing data.
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
    ].freeze

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

    # Returns a hash of all 13 cut flags and their enabled state for this account.
    def all_algorythmo_cut_flags
      CUT_FLAG_NAMES.index_with { |name| algorythmo_cut_enabled?(name) }
    end
  end
end
