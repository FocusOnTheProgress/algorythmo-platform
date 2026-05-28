// algorythmo: feature-gate algorythmo_cut_*
// Authoritative list of cut flag NAMES (without the `algorythmo_cut_` prefix)
// recognised by the dashboard. Must stay aligned with the Ruby source of truth
// at `app/models/concerns/algorythmo/feature_flag_bits.rb::CUT_FLAG_NAMES`.
//
// IMPORTANT: this list is NAMES only — it does NOT encode bit-positions.
// Bit-positions live exclusively in the Ruby CUT_FLAG_NAMES array (order is
// immutable; reordering corrupts existing bigint data in `algorythmo_feature_flags`).
// The JS and Ruby lists must contain the same names, but the ORDER here is
// irrelevant to bit encoding. The coverage spec asserts the two sets agree.
//
// Adding a flag here without adding it to the Ruby bit-map (or vice versa)
// would cause silent UX drift, so the route-tree validation spec in
// `routes/specs/algorythmoCutFlagCoverage.spec.js` asserts both ends agree.
export const ALGORYTHMO_CUT_FLAG_NAMES = Object.freeze([
  'campaigns',
  'help_center',
  'sla',
  'audit_logs',
  'custom_roles',
  'security_settings',
  'billing_settings',
  'agent_bots',
  'macros',
  'dashboard_apps',
  'advanced_assignment',
  'reports_bot',
  'conversation_workflow',
  // algorythmo: M6.1-a — Relatórios Comerciais overlay. Default NOT cut (visible).
  // Route wired in M6.1-b; flag added here first so the registry is the
  // single source of truth for known cut-flag names.
  'reports_commercial',
  // algorythmo: M2-a — top-level sidebar entries deliberately cut (hidden by default).
  // Convention INVERTED here: cut ACTIVE = surface HIDDEN. These are top-level
  // Campaigns and Help Center entries that have been replaced by sub-tabs in M2-d
  // (Campaigns → Marketing > Campanhas) and M2-c (Help Center → Commercial > Customer Support).
  // Rotas permanecem vivas via URL direta — só a entrada top-level some da sidebar.
  'campaigns_top_level',
  'help_center_top_level',
  // algorythmo: M2-a — per-sector cut flags. Default OFF = sector visible.
  // EXCEPTION: sector_facilities default ON (cut active = hidden) until M2-g ships the route.
  'sector_commercial',
  'sector_marketing',
  'sector_operations',
  'sector_procurement',
  'sector_hr',
  'sector_facilities',
  'sector_finance',
  'sector_administration',
  // algorythmo: M2-c — hide the legacy Chatwoot Label/Inbox report tabs from the
  // Commercial sidebar (D10). Sidebar-only cuts (mirror reports_bot's intent but
  // without route-level enforcement): the underlying report routes stay live and
  // reachable by URL. Convention: cut ACTIVE = hidden; default OFF = visible.
  'reports_labels',
  'reports_inbox',
  // algorythmo: M2-d — per-sub-tab cut flags for the Marketing shell (D10).
  // Each gates one tab inside MarketingShell.vue (NOT a sidebar entry):
  // cut ACTIVE = tab hidden; default OFF = tab visible. The Overview tab is
  // never cut. These are sidebar/shell-only cuts (no route-level Policy) — see
  // SIDEBAR_ONLY_FLAGS in algorythmoCutFlagCoverage.spec.js.
  'sector_marketing_branding',
  'sector_marketing_campanhas',
  'sector_marketing_redes_sociais',
  'sector_marketing_trafego',
  'sector_marketing_crm',
  'sector_marketing_retencao',
]);

// Full flag keys (with the `algorythmo_cut_` prefix) for direct equality checks
// against `meta.algorythmoCutFlag` values declared on routes.
export const ALGORYTHMO_CUT_FLAG_KEYS = Object.freeze(
  ALGORYTHMO_CUT_FLAG_NAMES.map(name => `algorythmo_cut_${name}`)
);

export const isKnownAlgorythmoCutFlag = key =>
  ALGORYTHMO_CUT_FLAG_KEYS.includes(key);
