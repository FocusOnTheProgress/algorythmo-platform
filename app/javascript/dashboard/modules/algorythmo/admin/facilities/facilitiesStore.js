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

const KEY_PREFIX = 'algorythmo:facilities';

export function storageKey(accountId, userId) {
  return `${KEY_PREFIX}:${accountId ?? 'unknown'}:${userId ?? 'anonymous'}`;
}

const EMPTY_STATE = Object.freeze({ units: [], expenses: [] });

// Coerce whatever came out of localStorage into the expected shape. A partial
// or hand-edited blob must never crash the table — arrays default to empty.
function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') return { units: [], expenses: [] };
  return {
    units: Array.isArray(parsed.units) ? parsed.units.filter(Boolean) : [],
    expenses: Array.isArray(parsed.expenses)
      ? parsed.expenses.filter(Boolean)
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
