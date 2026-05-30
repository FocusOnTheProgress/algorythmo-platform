// algorythmo: M6.1-b — sidebar entry + route + redirect spec.
// Mixed static-text scan + behavioral coverage of the default-redirect guard.
// Behavioral block imports the resolver module directly (no transitive Vue /
// amplitude / tslib chain), so the suite runs in any CI env without hoisting.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, vi } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

// ── 1. ReportsCommercialOverlay SFC ───────────────────────────────────────
// M6.1-b shipped a Tailwind placeholder; M6.1-c replaced it with a
// SectorDashboard + commercialMock composition; M2-c (plan 0007) migrates it to
// SectorShellV2 via CommercialShell. This block asserts the contract that
// survives every milestone: the SFC exists at the route-loader path and
// resolves to the current Commercial composition.
describe('M6.1-b — ReportsCommercialOverlay component', () => {
  const overlayPath = path.join(
    REPO_ROOT,
    'app',
    'javascript',
    'dashboard',
    'modules',
    'algorythmo',
    'admin',
    'reports-commercial',
    'ReportsCommercialOverlay.vue'
  );

  let src;
  beforeAll(() => {
    src = fs.readFileSync(overlayPath, 'utf8');
  });

  it('SFC file exists at the expected path', () => {
    expect(fs.existsSync(overlayPath)).toBe(true);
  });

  it('SFC delegates to CommercialShell (M2-c — SectorShellV2 migration)', () => {
    expect(src).toContain('CommercialShell');
  });
});

// ── 2. i18n keys for the COMMERCIAL placeholder ───────────────────────────
describe('M6.1-b — i18n keys', () => {
  const ptPath = path.join(
    REPO_ROOT,
    'engines',
    'algorythmo',
    'app',
    'javascript',
    'i18n',
    'overrides',
    'pt_BR.json'
  );
  const enPath = path.join(
    REPO_ROOT,
    'engines',
    'algorythmo',
    'app',
    'javascript',
    'i18n',
    'overrides',
    'en.json'
  );

  let pt;
  let en;
  beforeAll(() => {
    pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
    en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  });

  it('pt_BR reuses ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING for the title', () => {
    expect(pt.ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING).toBe(
      'Visão Comercial'
    );
  });

  it('en mirrors SECTORS.COMMERCIAL.HEADING with a distinct, non-empty string', () => {
    expect(typeof en.ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING).toBe(
      'string'
    );
    expect(
      en.ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING.length
    ).toBeGreaterThan(0);
    expect(en.ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING).not.toBe(
      pt.ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING
    );
  });

  // The top-level ALGORYTHMO_ADMIN.COMMERCIAL placeholder block was retired
  // in M6.1-d cleanup — the overlay reads headingKey/contextKey from
  // commercialMock + ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.* now. The block
  // should NOT come back; if it does, someone is reintroducing a dead key.
  it('ALGORYTHMO_ADMIN.COMMERCIAL placeholder block is fully retired (PT + EN)', () => {
    expect(pt.ALGORYTHMO_ADMIN.COMMERCIAL).toBeUndefined();
    expect(en.ALGORYTHMO_ADMIN.COMMERCIAL).toBeUndefined();
  });
});

// ── 3. reports.routes.js wiring (static) ──────────────────────────────────
describe('M6.1-b — reports.routes.js wiring', () => {
  const routesPath = path.join(
    REPO_ROOT,
    'app',
    'javascript',
    'dashboard',
    'routes',
    'dashboard',
    'settings',
    'reports',
    'reports.routes.js'
  );

  let src;
  beforeAll(() => {
    src = fs.readFileSync(routesPath, 'utf8');
  });

  it('uses the real ReportsCommercialOverlay (not the M6.1-a stub)', () => {
    expect(src).toContain('ReportsCommercialOverlay');
    expect(src).toContain('import(');
    expect(src).not.toContain("template: '<div />'");
  });

  it("declares route name 'commercial_reports'", () => {
    expect(src).toContain("name: 'commercial_reports'");
  });

  it('does NOT gate the commercial route with a route-level cut-flag (reachability)', () => {
    // The cut flag lives only in the algorythmo_feature_flags bigint column and
    // was never registered in config/features.yml, so on a tenant whose account
    // payload omits algorythmo_cut_flags the getter returns undefined and the
    // fail-closed route guard (cutEnabled !== false) blocked the route, bouncing
    // /reports/commercial to /dashboard. The route-level cut was removed so the
    // Commercial surface (and its Customer Support tab) is always reachable for
    // admins. The cut is still honoured at the sidebar entry + the raw report
    // tabs. Guard against regression: the route must NOT re-introduce the gate.
    expect(src).not.toContain(
      "algorythmoCutFlag: 'algorythmo_cut_reports_commercial'"
    );
  });

  it('uses beforeEnter (not redirect:) so Vue Router awaits the async resolver', () => {
    // Vue Router 4 awaits beforeEnter; it does NOT await the redirect option.
    // This is the only wiring that makes the hard-reload race fix actually fire.
    expect(src).toContain('beforeEnter: defaultReportsBeforeEnter');
    expect(src).toContain("from './reports.redirect'");
  });
});

// ── 4. resolveDefaultReportsRedirect + beforeEnter — BEHAVIOR ────────────
// Vitest hoists vi.mock to the top of the file. Mocking 'dashboard/store'
// lets us load the resolver module without booting Vuex. The redirect
// module imports ONLY dashboard/store — no transitive Vue SFCs, no
// amplitude, no tslib — so this block runs anywhere.
vi.mock('dashboard/store', () => ({
  default: {
    getters: {
      'accounts/isFeatureEnabledonAccount': () => undefined,
    },
    dispatch: vi.fn(() => Promise.resolve()),
  },
}));

describe('M6.1-b — default redirect behavior', () => {
  let resolveDefaultReportsRedirect;
  let defaultReportsBeforeEnter;
  let store;

  beforeAll(async () => {
    ({ resolveDefaultReportsRedirect, defaultReportsBeforeEnter } =
      await import('../dashboard/settings/reports/reports.redirect.js'));
    store = (await import('dashboard/store')).default;
  });

  const buildTo = (accountId = '1') => ({ params: { accountId } });

  it('redirects to commercial_reports when cut-flag is NOT set (D13 default)', () => {
    const getter = () => false;
    const result = resolveDefaultReportsRedirect(buildTo('42'), getter);
    expect(result.name).toBe('commercial_reports');
    expect(result.params.accountId).toBe('42');
  });

  it('redirects to account_overview_reports when cut-flag is set (upstream fallback)', () => {
    const getter = () => true;
    const result = resolveDefaultReportsRedirect(buildTo('42'), getter);
    expect(result.name).toBe('account_overview_reports');
    expect(result.params.accountId).toBe('42');
  });

  it('treats non-boolean truthy values as NOT cut (strict === true check)', () => {
    [undefined, null, 0, '', 'true', 1].forEach(v => {
      const getter = () => v;
      const result = resolveDefaultReportsRedirect(buildTo('42'), getter);
      expect(result.name).toBe('commercial_reports');
    });
  });

  it('preserves all to.params (not just accountId)', () => {
    const to = { params: { accountId: '7', extra: 'x' } };
    const result = resolveDefaultReportsRedirect(to, () => false);
    expect(result.params).toEqual({ accountId: '7', extra: 'x' });
  });

  it('passes numeric accountId to the getter (not string)', () => {
    const getter = vi.fn(() => false);
    resolveDefaultReportsRedirect(buildTo('99'), getter);
    expect(getter).toHaveBeenCalledWith(
      99,
      'algorythmo_cut_reports_commercial'
    );
  });

  // beforeEnter contract: hydrate when state unknown, skip when known.
  // The hydrate-when-unknown path is what fixes the hard-reload race.
  // The skip-when-known path is what avoids the double accounts/get on warm nav.
  it('beforeEnter dispatches accounts/get with explicit accountId when flag state is unknown', async () => {
    store.dispatch.mockClear();
    store.getters['accounts/isFeatureEnabledonAccount'] = () => undefined;
    const result = await defaultReportsBeforeEnter(buildTo('55'));
    expect(store.dispatch).toHaveBeenCalledWith('accounts/get', {
      silent: true,
      accountId: 55,
    });
    expect(result.name).toBe('commercial_reports');
  });

  it('beforeEnter SKIPS dispatch when flag state is already known (warm nav, no double-fetch)', async () => {
    store.dispatch.mockClear();
    store.getters['accounts/isFeatureEnabledonAccount'] = () => false;
    const result = await defaultReportsBeforeEnter(buildTo('55'));
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(result.name).toBe('commercial_reports');
  });

  it('beforeEnter skips dispatch when accountId is not finite', async () => {
    store.dispatch.mockClear();
    store.getters['accounts/isFeatureEnabledonAccount'] = () => undefined;
    await defaultReportsBeforeEnter({ params: { accountId: 'oops' } });
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it('beforeEnter returns account_overview_reports when cut-flag is explicitly true', async () => {
    store.dispatch.mockClear();
    store.getters['accounts/isFeatureEnabledonAccount'] = () => true;
    const result = await defaultReportsBeforeEnter(buildTo('55'));
    expect(result.name).toBe('account_overview_reports');
  });
});

// ── 5. Sidebar.vue entry ──────────────────────────────────────────────────
describe('M6.1-b — Sidebar.vue', () => {
  const sidebarPath = path.join(
    REPO_ROOT,
    'app',
    'javascript',
    'dashboard',
    'components-next',
    'sidebar',
    'Sidebar.vue'
  );

  let src;
  beforeAll(() => {
    src = fs.readFileSync(sidebarPath, 'utf8');
  });

  // algorythmo: rodada 3 — F-C flattened the Commercial sector. It is no longer
  // an expandable group whose first child carried SIDEBAR.RELATORIOS_COMERCIAIS_VISAO
  // and the reports_commercial child cut-flag. It is now a single flat entry — like
  // the other sector items — labelled SIDEBAR.ALG_SECTOR_COMMERCIAL, gated by the
  // whole-sector cut-flag sector_commercial, routing to commercial_reports.
  it("uses the flat sector label key 'SIDEBAR.ALG_SECTOR_COMMERCIAL'", () => {
    expect(src).toContain('SIDEBAR.ALG_SECTOR_COMMERCIAL');
  });

  it("references route name 'commercial_reports' in the Commercial entry", () => {
    expect(src).toContain("'commercial_reports'");
  });

  it('gates the Commercial entry behind the sector_commercial cut-flag', () => {
    expect(src).toContain('algorythmoCutHidden.value.sector_commercial');
  });

  it("declares activeOn including 'commercial_reports' (matches sister entries)", () => {
    expect(src).toMatch(/activeOn:\s*\[[^\]]*['"]commercial_reports['"]/);
  });
});
