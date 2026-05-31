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

// --- Role routing contract --------------------------------------------------
// Routes reachable by role. Administrator reaches everything; agent/custom_role
// only reach surfaces that declare those roles in their route meta.permissions.
// This table must stay in sync with the route meta.permissions declarations:
//   - algorythmo_admin_c_levels       -> ['administrator']
//   - algorythmo_admin_operacao        -> ['administrator']
//   - algorythmo_admin_marketing       -> ['administrator']
//   - algorythmo_admin_administracao   -> ['administrator']
//   - algorythmo_crm_kanban            -> ['administrator', 'agent', 'custom_role']
//   - algorythmo_brain_viewer          -> ['administrator', 'agent', 'custom_role']
const ADMIN_ONLY_ROUTES = new Set([
  'algorythmo_admin_c_levels',
  'algorythmo_admin_operacao',
  'algorythmo_admin_marketing',
  'algorythmo_admin_administracao',
  'algorythmo_admin_financeiro',
  'algorythmo_admin_rh',
  'algorythmo_admin_compras',
  'algorythmo_admin_facilities',
  'algorythmo_admin_marketplace',
]);

// Pure: returns true when a route is reachable by the given role.
export function isRouteReachableFor(routeName, role) {
  if (role === 'administrator') return true;
  return !ADMIN_ONLY_ROUTES.has(routeName);
}

// --- Catch-up Hub ("Enquanto voce estava fora") -----------------------------
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
// and the route to open. The heuristic below picks 2-3 by time of day.
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

// Pure: pick 2-3 contextual actions by hour. Morning leads with reviewing the
// board (set the day's direction); midday leans into the commercial pulse;
// evening offers wrapping the day. Always 2-3 items, the first one `primary`.
//
// TODO(real-wiring): replace with the OS-ranked next-best-action list.
function smartActionsForHourAll(hour) {
  const C = SMART_ACTION_CATALOGUE;
  if (hour < 12) {
    return [C.reviewBoard, C.openPipeline, C.askBrain];
  }
  if (hour < 18) {
    return [C.checkCommercial, C.openPipeline, C.askBrain];
  }
  return [C.wrapDay, C.reviewBoard];
}

// Pure: filters the action list to only items the viewer can reach, then
// ensures the first item is always `primary`. If the filtered list is empty,
// the universally-reachable `askBrain` action is the fallback.
export function smartActionsForHour(hour, role = 'administrator') {
  const all = smartActionsForHourAll(hour);
  const reachable = all.filter(a => isRouteReachableFor(a.routeName, role));

  if (!reachable.length) {
    // Brain is always reachable; use it as a safe fallback.
    return [{ ...SMART_ACTION_CATALOGUE.askBrain, variant: 'primary' }];
  }

  // Guarantee the first item is `primary` even if the admin-only primary was
  // filtered out (e.g. agent sees morning set without reviewBoard).
  if (reachable[0].variant !== 'primary') {
    return [{ ...reachable[0], variant: 'primary' }, ...reachable.slice(1)];
  }

  return reachable;
}

// --- Provider ---------------------------------------------------------------
// The single seam the OS replaces. Returns the briefing the screen renders.
// Kept synchronous + pure for the demo; the real version is async (a fetch)
// and the screen already treats it as data, so the swap is mechanical.
//
// `role` is used to filter catch-up items to only those the viewer can follow.
export function getInicioBriefing(role = 'administrator') {
  const catchUp = DEMO_CATCH_UP.filter(item =>
    isRouteReachableFor(item.routeName, role)
  );
  return { catchUp };
}

export { DEMO_CATCH_UP, SMART_ACTION_CATALOGUE };
