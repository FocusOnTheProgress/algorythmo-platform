# frozen_string_literal: true

# Manages Algorythmo OS cut-surface feature flags stored in the dedicated
# accounts.algorythmo_feature_flags bigint column.
#
# Flags occupy positions 1–47 — all safely within the signed bigint range (max: 63).
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
  # Positions 27–28 — algorythmo: M2-c: reports_labels / reports_inbox.
  #   Hide the legacy Label/Inbox report tabs from the Commercial sidebar; routes stay live.
  #   Default NOT cut (visible).
  # Positions 29–34 — algorythmo: M2-d: per-sub-tab cuts for the Marketing shell.
  #   sector_marketing_{branding,campanhas,redes_sociais,trafego,crm,retencao}: hide one
  #   tab inside MarketingShell.vue. Default NOT cut (visible); Overview tab is never cut.
  # Positions 35–47 — algorythmo: M2-e: per-sub-tab cuts for the Operations,
  #   Procurement and Administration shells. Hide one tab inside its sector shell.
  #   Default NOT cut (visible); Overview tab is never cut.
  # Positions 48–57 — algorythmo: M2-f: per-sub-tab cuts for the Finance + HR shells.
  #   Finance occupies 48–53, HR occupies 54–57.
  #   sector_finance_{a_pagar,a_receber,fluxo,margem,lucro,planejamento}: hide one tab
  #   inside FinanceShell.vue. sector_hr_{contratacao,treinamento,cultura,produtividade}:
  #   hide one tab inside HrShell.vue. Default NOT cut (visible); Overview tab is never cut.
  # Positions 58–59 — algorythmo: M2-g: per-sub-tab cuts for the Facilities shell.
  #   sector_facilities_overview / sector_facilities_controle: hide one tab inside
  #   FacilitiesShell.vue. Default NOT cut (visible); the Overview tab is never cut in
  #   practice (shell contract) — the flag exists for registry symmetry.
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
    reports_labels
    reports_inbox
    sector_marketing_branding
    sector_marketing_campanhas
    sector_marketing_redes_sociais
    sector_marketing_trafego
    sector_marketing_crm
    sector_marketing_retencao
    sector_operations_estoque
    sector_operations_reposicao
    sector_operations_logistica
    sector_operations_organizacao
    sector_operations_entrega
    sector_operations_expedicao
    sector_procurement_fornecedores
    sector_procurement_reposicao
    sector_procurement_custo
    sector_procurement_giro
    sector_administration_estrategia
    sector_administration_metas
    sector_administration_indicadores
    sector_finance_a_pagar
    sector_finance_a_receber
    sector_finance_fluxo
    sector_finance_margem
    sector_finance_lucro
    sector_finance_planejamento
    sector_hr_contratacao
    sector_hr_treinamento
    sector_hr_cultura
    sector_hr_produtividade
    sector_facilities_overview
    sector_facilities_controle
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
