// algorythmo: Stream D — "Início" demo dataset + pure heuristics.
//
// =========================================================================
// DEMO / REAL-WIRING BOUNDARY
// =========================================================================
// EVERYTHING data-shaped in this file is illustrative front-end content. It
// exists so Início renders the full welcome (greeting → catch-up hub → smart
// actions → invisible sync) before the OS backend ships. The Vue surfaces
// consume ONLY the shapes defined here, so the real OS layer drops in by
// replacing `getInicioBriefing()` — no component touched.
//
//   TODO(real-wiring): `getInicioBriefing()` becomes a call into the OS
//     activity layer — each catch-up item is a real, human-phrased summary of
//     what changed across the company's sectors since the user's last visit
//     (projects advanced, approvals pending, deliveries due), with a route the
//     user can follow. The `tone` drives only the leading glyph, never colour
//     decoration (Cinematic OS is monochrome chrome).
//   TODO(real-wiring): the smart-action set is a ranked next-best-action list
//     from the OS — the time-of-day heuristic below is the demo stand-in.
// =========================================================================

// --- Greeting ---------------------------------------------------------------
// Pure: maps a 0–23 hour to the time-of-day greeting key. Local time decides
// the welcome — morning before noon, afternoon to 18h, evening after.
export function greetingKeyForHour(hour) {
  if (hour < 12) return 'ALGORYTHMO_ADMIN.INICIO.GREETING.MORNING';
  if (hour < 18) return 'ALGORYTHMO_ADMIN.INICIO.GREETING.AFTERNOON';
  return 'ALGORYTHMO_ADMIN.INICIO.GREETING.EVENING';
}

// Pure: the display name → a single first name. Trims, takes the first token,
// and falls back to a neutral, non-empty label so the greeting never reads
// "Bom dia, ." when the name is missing.
export function firstNameOf(
  fullName,
  fallbackKey = 'ALGORYTHMO_ADMIN.INICIO.GREETING.FALLBACK_NAME'
) {
  const trimmed = (fullName || '').trim();
  if (!trimmed) return { key: fallbackKey };
  const first = trimmed.split(/\s+/)[0];
  return { value: first };
}

// --- Catch-up Hub ("Enquanto você estava fora") -----------------------------
// Human, actionable summaries — NOT system logs. Each item: a stable id, the
// i18n key for its phrased line, a leading glyph (Lucide, stroke 1.5), a
// `tone` (semantic intent, drives the glyph only), and the route name to
// follow. `count` is interpolated into the line so the copy stays specific.
//
// TODO(real-wiring): replace this constant with the OS activity summary.
const DEMO_CATCH_UP = [
  {
    id: 'projects-advanced',
    lineKey: 'ALGORYTHMO_ADMIN.INICIO.CATCH_UP.PROJECTS_ADVANCED',
    count: 2,
    glyph: 'i-lucide-trending-up',
    tone: 'progress',
    routeName: 'algorythmo_admin_operacao',
  },
  {
    id: 'approval-pending',
    lineKey: 'ALGORYTHMO_ADMIN.INICIO.CATCH_UP.APPROVAL_PENDING',
    count: 1,
    glyph: 'i-lucide-circle-dot',
    tone: 'attention',
    routeName: 'algorythmo_admin_c_levels',
  },
  {
    id: 'leads-waiting',
    lineKey: 'ALGORYTHMO_ADMIN.INICIO.CATCH_UP.LEADS_WAITING',
    count: 4,
    glyph: 'i-lucide-users',
    tone: 'neutral',
    routeName: 'algorythmo_crm_kanban',
  },
];

// --- Smart Actions (contextual) ---------------------------------------------
// The full catalogue of next-best-actions. Each: stable id, i18n label key,
// glyph, variant (primary = the single emphasised action, ghost = secondary),
// and the route to open. The heuristic below picks 2–3 by time of day.
const SMART_ACTION_CATALOGUE = {
  reviewBoard: {
    id: 'reviewBoard',
    labelKey: 'ALGORYTHMO_ADMIN.INICIO.ACTIONS.REVIEW_BOARD',
    glyph: 'i-lucide-crown',
    variant: 'primary',
    routeName: 'algorythmo_admin_c_levels',
  },
  openPipeline: {
    id: 'openPipeline',
    labelKey: 'ALGORYTHMO_ADMIN.INICIO.ACTIONS.OPEN_PIPELINE',
    glyph: 'i-lucide-kanban',
    variant: 'ghost',
    routeName: 'algorythmo_crm_kanban',
  },
  askBrain: {
    id: 'askBrain',
    labelKey: 'ALGORYTHMO_ADMIN.INICIO.ACTIONS.ASK_BRAIN',
    glyph: 'i-lucide-brain',
    variant: 'ghost',
    routeName: 'algorythmo_brain_viewer',
  },
  checkCommercial: {
    id: 'checkCommercial',
    labelKey: 'ALGORYTHMO_ADMIN.INICIO.ACTIONS.CHECK_COMMERCIAL',
    glyph: 'i-lucide-line-chart',
    variant: 'primary',
    routeName: 'algorythmo_admin_marketing',
  },
  wrapDay: {
    id: 'wrapDay',
    labelKey: 'ALGORYTHMO_ADMIN.INICIO.ACTIONS.WRAP_DAY',
    glyph: 'i-lucide-clipboard-check',
    variant: 'primary',
    routeName: 'algorythmo_admin_administracao',
  },
};

// Pure: pick 2–3 contextual actions by hour. Morning leads with reviewing the
// board (set the day's direction); midday leans into the commercial pulse;
// evening offers wrapping the day. Always 2–3 items, the first one `primary`.
//
// TODO(real-wiring): replace with the OS-ranked next-best-action list.
export function smartActionsForHour(hour) {
  const C = SMART_ACTION_CATALOGUE;
  if (hour < 12) {
    return [C.reviewBoard, C.openPipeline, C.askBrain];
  }
  if (hour < 18) {
    return [C.checkCommercial, C.openPipeline, C.askBrain];
  }
  return [C.wrapDay, C.reviewBoard];
}

// --- Provider ---------------------------------------------------------------
// The single seam the OS replaces. Returns the briefing the screen renders.
// Kept synchronous + pure for the demo; the real version is async (a fetch)
// and the screen already treats it as data, so the swap is mechanical.
export function getInicioBriefing() {
  return {
    catchUp: DEMO_CATCH_UP,
  };
}

export { DEMO_CATCH_UP, SMART_ACTION_CATALOGUE };
