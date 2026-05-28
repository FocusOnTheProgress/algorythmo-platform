// algorythmo: M6.1-b — sidebar entry + route + redirect spec.
// Mixed static-text scan + behavioral coverage of the default-redirect logic.
// Behavioral block imports the resolver module directly (no transitive Vue /
// amplitude / tslib chain), so the suite runs in any CI env without hoisting.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll, vi } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

// ── 1. ReportsCommercialOverlay SFC ───────────────────────────────────────
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

  it('SFC references the i18n key for the title (no raw Portuguese)', () => {
    expect(src).toContain('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING');
  });

  it('SFC references the i18n key for the placeholder body', () => {
    expect(src).toContain('ALGORYTHMO_ADMIN.COMMERCIAL.BODY');
  });

  it('SFC styles use Tailwind utilities (no <style> block per AGENTS.md)', () => {
    expect(src).not.toMatch(/<style\b/);
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

  it('pt_BR has ALGORYTHMO_ADMIN.COMMERCIAL.BODY defined', () => {
    expect(typeof pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).toBe('string');
    expect(pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY.length).toBeGreaterThan(0);
  });

  it('en has ALGORYTHMO_ADMIN.COMMERCIAL.BODY defined and != PT', () => {
    expect(typeof en.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).toBe('string');
    expect(en.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).not.toBe(
      pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY
    );
  });

  it('does not duplicate the title in ALGORYTHMO_ADMIN.COMMERCIAL.TITLE', () => {
    expect(pt.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE).toBeUndefined();
    expect(en.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE).toBeUndefined();
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

  it('wires algorythmo_cut_reports_commercial meta on the commercial route', () => {
    expect(src).toContain(
      "algorythmoCutFlag: 'algorythmo_cut_reports_commercial'"
    );
  });

  it('uses the async defaultReportsRedirectHandler for the index redirect', () => {
    // Hydrating accounts/get inside the redirect is the only way a cut user
    // reloading /reports lands on /reports/overview instead of /dashboard.
    expect(src).toContain('defaultReportsRedirectHandler');
    expect(src).toContain("from './reports.redirect'");
  });

  it('re-exports resolveDefaultReportsRedirect from the redirect module', () => {
    expect(src).toContain('export { resolveDefaultReportsRedirect }');
  });
});

// ── 4. resolveDefaultReportsRedirect — BEHAVIOR ──────────────────────────
// Vitest hoists vi.mock to the top of the file. Mocking 'dashboard/store'
// lets us load the resolver module without booting Vuex. The new
// reports.redirect.js module imports ONLY dashboard/store — no transitive
// Vue SFCs, no amplitude, no tslib — so this block runs anywhere.
vi.mock('dashboard/store', () => ({
  default: {
    getters: {
      'accounts/isFeatureEnabledonAccount': () => false,
    },
    dispatch: vi.fn(() => Promise.resolve()),
  },
}));

describe('M6.1-b — resolveDefaultReportsRedirect behavior', () => {
  let resolveDefaultReportsRedirect;
  let defaultReportsRedirectHandler;

  beforeAll(async () => {
    ({ resolveDefaultReportsRedirect, defaultReportsRedirectHandler } =
      await import('../dashboard/settings/reports/reports.redirect.js'));
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
    // Defensive: getter could return undefined/null/0 for missing accounts.
    // None of those should accidentally trigger the upstream fallback.
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

  it('async handler awaits accounts/get with explicit accountId before resolving', async () => {
    const store = (await import('dashboard/store')).default;
    store.dispatch.mockClear();
    const result = await defaultReportsRedirectHandler(buildTo('55'));
    expect(store.dispatch).toHaveBeenCalledWith('accounts/get', {
      silent: true,
      accountId: 55,
    });
    expect(result.name).toBe('commercial_reports');
  });

  it('async handler skips dispatch when accountId is not finite', async () => {
    const store = (await import('dashboard/store')).default;
    store.dispatch.mockClear();
    await defaultReportsRedirectHandler({ params: { accountId: 'oops' } });
    expect(store.dispatch).not.toHaveBeenCalled();
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

  it("references i18n key 'SIDEBAR.RELATORIOS_COMERCIAIS_VISAO'", () => {
    expect(src).toContain('SIDEBAR.RELATORIOS_COMERCIAIS_VISAO');
  });

  it("references route name 'commercial_reports' in sidebar children", () => {
    expect(src).toContain("'commercial_reports'");
  });

  it('gates entry behind reports_commercial cut-flag', () => {
    expect(src).toContain('algorythmoCutHidden.value.reports_commercial');
  });

  it("declares activeOn including 'commercial_reports' (matches sister entries)", () => {
    // Tolerate additional active route names + single/double quotes —
    // the load-bearing invariant is that commercial_reports lights the row.
    expect(src).toMatch(/activeOn:\s*\[[^\]]*['"]commercial_reports['"]/);
  });
});
