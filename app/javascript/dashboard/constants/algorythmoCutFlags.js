// algorythmo: feature-gate algorythmo_cut_*
// Authoritative list of cut flag NAMES (without the `algorythmo_cut_` prefix)
// recognised by the dashboard. Must stay aligned with the Ruby source of truth
// at `app/models/concerns/algorythmo/feature_flag_bits.rb::CUT_FLAG_NAMES`.
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
]);

// Full flag keys (with the `algorythmo_cut_` prefix) for direct equality checks
// against `meta.algorythmoCutFlag` values declared on routes.
export const ALGORYTHMO_CUT_FLAG_KEYS = Object.freeze(
  ALGORYTHMO_CUT_FLAG_NAMES.map(name => `algorythmo_cut_${name}`)
);

export const isKnownAlgorythmoCutFlag = key =>
  ALGORYTHMO_CUT_FLAG_KEYS.includes(key);
