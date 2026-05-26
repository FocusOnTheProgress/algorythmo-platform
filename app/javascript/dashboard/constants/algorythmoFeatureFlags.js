// algorythmo: feature-gate enable / opt-in flags (Captain, CRM)
// Authoritative list of OPT-IN feature flags consumed by the Vue router guard via
// `meta.algorythmoFeatureFlag`. These differ from `algorythmoCutFlag` in semantic:
// the surface is hidden by DEFAULT and must be turned on explicitly per-account.
//
// Mirrors the typo-guard pattern of `algorythmoCutFlags.js` — a route author
// who writes `meta.algorythmoFeatureFlag: 'algorythmo_show_capitain'` (typo)
// would otherwise get a silent permanent block in prod with no signal, since the
// getter returns undefined → fail-closed-blocked. The allowlist + dev warn keeps
// that mistake loud during development.
export const ALGORYTHMO_FEATURE_FLAG_KEYS = Object.freeze([
  'algorythmo_show_captain',
  'algorythmo_crm',
  'algorythmo_brain',
]);

export const isKnownAlgorythmoFeatureFlag = key =>
  ALGORYTHMO_FEATURE_FLAG_KEYS.includes(key);
