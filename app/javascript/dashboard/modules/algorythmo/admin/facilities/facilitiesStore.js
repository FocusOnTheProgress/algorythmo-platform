// algorythmo: plan 0007 M2-g — Facilities Controle client-side store (D9).
// v0 persistence lives entirely in localStorage; there is no backend yet (the
// plan ships Facilities frontend-only). When the founder asks for multi-user
// persistence this module is the seam to swap for an API client.
//
// The storage key is scoped by BOTH accountId and userId so data never leaks
// across tenants or users sharing a browser (M2-a localStorage convention).
// All reads are defensive: a missing key, unavailable localStorage (private
// mode / SSR), or corrupted JSON degrades to empty collections rather than
// throwing into the render.
//
// Expense categories use STABLE KEYS (not translated labels) so stored data
// survives a locale switch or a label copy-edit without corruption. Unknown
// legacy keys (free-text from v0 before the picklist was introduced) fall back
// to 'outros' on read.

const KEY_PREFIX = 'algorythmo:facilities';

// Ordered list of canonical expense category keys. Order matches the founder's
// brief (2026-05-28). These keys are what is written to localStorage; the
// component resolves the label via i18n at render time.
export const EXPENSE_CATEGORY_KEYS = Object.freeze([
  'aluguel',
  'energia',
  'agua',
  'manutencao',
  'limpeza',
  'internet_telefone',
  'outros',
]);

// Coerce a stored category value to a known key, or fall back to 'outros'.
// Handles three cases:
//   1. Already a valid key (normal case).
//   2. A key from a future extension that this version doesn't know — 'outros'.
//   3. Legacy free-text (v0 before the picklist shipped) — 'outros'.
export function normalizeCategoryKey(raw) {
  if (typeof raw === 'string' && EXPENSE_CATEGORY_KEYS.includes(raw)) {
    return raw;
  }
  return 'outros';
}

export function storageKey(accountId, userId) {
  return `${KEY_PREFIX}:${accountId ?? 'unknown'}:${userId ?? 'anonymous'}`;
}

const EMPTY_STATE = Object.freeze({ units: [], expenses: [] });

// Coerce whatever came out of localStorage into the expected shape. A partial
// or hand-edited blob must never crash the table — arrays default to empty,
// and legacy free-text category values are mapped to 'outros'.
function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') return { units: [], expenses: [] };
  return {
    units: Array.isArray(parsed.units) ? parsed.units.filter(Boolean) : [],
    expenses: Array.isArray(parsed.expenses)
      ? parsed.expenses.filter(Boolean).map(e => ({
          ...e,
          category: normalizeCategoryKey(e.category),
        }))
      : [],
  };
}

export function readState(accountId, userId) {
  try {
    const raw = localStorage.getItem(storageKey(accountId, userId));
    if (!raw) return { ...EMPTY_STATE, units: [], expenses: [] };
    return normalize(JSON.parse(raw));
  } catch {
    // Unavailable storage or corrupted JSON — start clean rather than throw.
    return { units: [], expenses: [] };
  }
}

export function writeState(accountId, userId, state) {
  try {
    localStorage.setItem(
      storageKey(accountId, userId),
      JSON.stringify(normalize(state))
    );
    return true;
  } catch {
    // Storage unavailable — caller keeps the in-memory copy; nothing persists.
    return false;
  }
}

// crypto.randomUUID is available in every browser this dashboard targets; the
// fallback keeps unit tests (jsdom without crypto) and old WebViews working.
export function createId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
