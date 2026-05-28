// algorythmo: feature-gate algorythmo_cut_*
// Route-tree static coverage check for cut flags.
//
// Loading the actual route files would drag in every dashboard Vue component
// (heavy + mock surface). Instead we read each `*.routes.js` as text and
// regex-scan for `algorythmoCutFlag: '...'` declarations. This is what
// catches the failure mode the adversarial reviewer flagged: a typo in the
// meta key value (e.g. `'algorythmo_cut_compaigns'`) would otherwise leave
// the surface ungated forever, with no other signal.
//
// algorythmo: M2-a — added SIDEBAR_ONLY_FLAGS: flags that gate sidebar visibility
// only (no route-level Policy enforcement). These are exempt from the
// "every flag must appear in a route" check — they live in Sidebar.vue directly.
import fs from 'node:fs';
import path from 'node:path';

import {
  ALGORYTHMO_CUT_FLAG_KEYS,
  ALGORYTHMO_CUT_FLAG_NAMES,
} from '../../constants/algorythmoCutFlags';

const ROUTES_ROOT = path.resolve(__dirname, '..', 'dashboard');

const collectRouteFiles = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    if (entry.isFile() && entry.name.endsWith('.routes.js')) return [full];
    return [];
  });

const ROUTE_FILES = collectRouteFiles(ROUTES_ROOT);

const CUT_FLAG_DECL = /algorythmoCutFlag:\s*['"]([^'"\n]+)['"]/g;

const declarationsByFile = new Map(
  ROUTE_FILES.map(file => [
    file,
    [...fs.readFileSync(file, 'utf8').matchAll(CUT_FLAG_DECL)].map(m => m[1]),
  ])
);

const usagesByFlag = [...declarationsByFile.entries()].reduce(
  (acc, [file, flags]) => {
    flags.forEach(flag => {
      const list = acc.get(flag) || [];
      list.push(path.relative(ROUTES_ROOT, file));
      acc.set(flag, list);
    });
    return acc;
  },
  new Map()
);

// algorythmo: M2-a — sidebar-only flags gate sidebar entry visibility in Sidebar.vue.
// They do NOT appear in route meta because they don't enforce Policy-level access control —
// the underlying routes remain accessible via URL when the sidebar entry is hidden.
// Adding a flag here requires a code comment in Sidebar.vue explaining why it's sidebar-only.
const SIDEBAR_ONLY_FLAGS = new Set([
  'campaigns_top_level',
  'help_center_top_level',
  'sector_commercial',
  'sector_marketing',
  'sector_operations',
  'sector_procurement',
  'sector_hr',
  'sector_facilities',
  'sector_finance',
  'sector_administration',
  // algorythmo: M2-c — Label/Inbox report tabs hidden from the Commercial sidebar.
  // Sidebar-only (no route meta): the report routes stay live and URL-reachable.
  'reports_labels',
  'reports_inbox',
]);

describe('algorythmo cut flag route coverage', () => {
  it('every declared algorythmoCutFlag is a known cut flag key', () => {
    const known = new Set(ALGORYTHMO_CUT_FLAG_KEYS);
    const unknown = [...usagesByFlag.entries()]
      .filter(([flag]) => !known.has(flag))
      .map(([flag, files]) => ({ flag, files }));

    expect(unknown).toEqual([]);
  });

  it('declared cut flags use only the `algorythmo_cut_<name>` prefix', () => {
    const malformed = [...usagesByFlag.keys()].filter(
      flag => !flag.startsWith('algorythmo_cut_')
    );
    expect(malformed).toEqual([]);
  });

  it('every non-sidebar-only cut flag in the constant list is referenced by at least one route', () => {
    // Surfaces a stale flag (declared in JS but never wired into a route) so it
    // gets reviewed before drifting further.
    // SIDEBAR_ONLY_FLAGS are exempt — they gate sidebar entries in Sidebar.vue, not routes.
    const orphans = ALGORYTHMO_CUT_FLAG_NAMES.filter(
      name =>
        !SIDEBAR_ONLY_FLAGS.has(name) &&
        !usagesByFlag.has(`algorythmo_cut_${name}`)
    );
    expect(orphans).toEqual([]);
  });

  it('sidebar-only flags are all accounted for in the SIDEBAR_ONLY_FLAGS set', () => {
    // Guard: every name in SIDEBAR_ONLY_FLAGS must exist in ALGORYTHMO_CUT_FLAG_NAMES.
    // Prevents phantom entries in the set that no longer match the registry.
    const registered = new Set(ALGORYTHMO_CUT_FLAG_NAMES);
    const phantoms = [...SIDEBAR_ONLY_FLAGS].filter(
      name => !registered.has(name)
    );
    expect(phantoms).toEqual([]);
  });

  it('found cut flag declarations across the route tree', () => {
    // Exact count guard: any addition or removal must update this number intentionally.
    // Current tally (verified 2026-05-28, M2-a): 24 declarations across all *.routes.js files.
    // Sidebar-only flags are not counted here (they live in Sidebar.vue, not routes).
    // To recount: grep -r "algorythmoCutFlag:" app/javascript/dashboard/routes/dashboard/ | wc -l
    const totalDeclarations = [...declarationsByFile.values()].reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    expect(totalDeclarations).toBe(24);
  });
});
