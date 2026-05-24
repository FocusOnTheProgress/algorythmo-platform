// algorythmo: feature-gate algorythmo_cut_*
// Route-tree static coverage check for the 13 cut flags.
//
// Loading the actual route files would drag in every dashboard Vue component
// (heavy + mock surface). Instead we read each `*.routes.js` as text and
// regex-scan for `algorythmoCutFlag: '...'` declarations. This is what
// catches the failure mode the adversarial reviewer flagged: a typo in the
// meta key value (e.g. `'algorythmo_cut_compaigns'`) would otherwise leave
// the surface ungated forever, with no other signal.
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

  it('every cut flag in the constant list is referenced by at least one route', () => {
    // Surfaces a stale flag (declared in JS but never wired into a route) so it
    // gets reviewed before drifting further.
    const orphans = ALGORYTHMO_CUT_FLAG_NAMES.filter(
      name => !usagesByFlag.has(`algorythmo_cut_${name}`)
    );
    expect(orphans).toEqual([]);
  });

  it('found cut flag declarations across the route tree', () => {
    // Sanity: the regex should have matched at least the 13 surfaces we know
    // about. If the count drops it means a route file lost its gate.
    const totalDeclarations = [...declarationsByFile.values()].reduce(
      (sum, arr) => sum + arr.length,
      0
    );
    expect(totalDeclarations).toBeGreaterThanOrEqual(13);
  });
});
