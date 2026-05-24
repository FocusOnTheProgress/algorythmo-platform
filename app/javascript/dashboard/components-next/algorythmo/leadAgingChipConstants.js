// algorythmo: feature-gate algorythmo_crm
// Single source of truth for LeadAgingChip's accepted states + glyphs.
// Extracted so the defineProps validator (compile-time hoisted in Vue's
// <script setup>) and the runtime safeState fallback can share one list
// without duplication. CONTRACT_M1B §4 freezes both the state names and
// the glyphs — changes here are a contract bump.

export const LEAD_AGING_STATES = Object.freeze([
  'neutral',
  'green',
  'yellow',
  'red',
]);

export const LEAD_AGING_GLYPH_BY_STATE = Object.freeze({
  neutral: '—',
  green: '\u25CF', // ●
  yellow: '\u25D0', // ◐
  red: '\u25CB', // ○
});
