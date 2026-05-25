// algorythmo: feature-gate opt-in flags (Captain, CRM)
// Route-tree static coverage check, mirror of algorythmoCutFlagCoverage.spec.js.
// Catches typos like `algorythmoFeatureFlag: 'algorythmo_show_capitain'` that
// would otherwise produce a silent permanent block in prod (getter returns
// undefined → !undefined = true → blocked forever, no signal).
import fs from 'node:fs';
import path from 'node:path';

import { ALGORYTHMO_FEATURE_FLAG_KEYS } from '../../constants/algorythmoFeatureFlags';

const ROUTES_ROOT = path.resolve(__dirname, '..', 'dashboard');

const collectRouteFiles = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    if (entry.isFile() && entry.name.endsWith('.routes.js')) return [full];
    return [];
  });

const ROUTE_FILES = collectRouteFiles(ROUTES_ROOT);

const FEATURE_FLAG_DECL = /algorythmoFeatureFlag:\s*['"]([^'"\n]+)['"]/g;

const declarationsByFile = new Map(
  ROUTE_FILES.map(file => [
    file,
    [...fs.readFileSync(file, 'utf8').matchAll(FEATURE_FLAG_DECL)].map(
      m => m[1]
    ),
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

describe('algorythmo feature flag route coverage', () => {
  it('every declared algorythmoFeatureFlag is a known enable flag key', () => {
    const known = new Set(ALGORYTHMO_FEATURE_FLAG_KEYS);
    const unknown = [...usagesByFlag.entries()]
      .filter(([flag]) => !known.has(flag))
      .map(([flag, files]) => ({ flag, files }));

    expect(unknown).toEqual([]);
  });

  it('every enable flag in the constant list is referenced by at least one route', () => {
    // Surfaces a stale flag (declared in JS but never wired into a route).
    const orphans = ALGORYTHMO_FEATURE_FLAG_KEYS.filter(
      key => !usagesByFlag.has(key)
    );
    expect(orphans).toEqual([]);
  });

  it('found enable flag declarations across the route tree', () => {
    const totalDeclarations = [...declarationsByFile.values()].reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    // Captain has 3 (parent + 2 child) + CRM has 2 = 5 minimum. Pin to 5 so
    // accidentally deleting 3 of the 5 declarations gets caught here, not in
    // a "why can't I open Captain?" support ticket six weeks later.
    expect(totalDeclarations).toBeGreaterThanOrEqual(5);
  });
});
