// algorythmo: M6.1-b — sidebar entry + route + redirect spec.
// Static text scan: validates wiring without mounting any real component
// or importing any Vue/Vuex dependency.
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

// ── 1. ReportsCommercialOverlay SFC exists ────────────────────────────────
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

  it('SFC file exists at the expected path', () => {
    expect(fs.existsSync(overlayPath)).toBe(true);
  });

  it('SFC references the i18n key for the title (no raw Portuguese)', () => {
    const src = fs.readFileSync(overlayPath, 'utf8');
    expect(src).toContain('ALGORYTHMO_ADMIN.COMMERCIAL.TITLE');
  });

  it('SFC references the i18n key for the placeholder body', () => {
    const src = fs.readFileSync(overlayPath, 'utf8');
    expect(src).toContain('ALGORYTHMO_ADMIN.COMMERCIAL.BODY');
  });

  it('SFC does not import SectorDashboard (content deferred to M6.1-c)', () => {
    const src = fs.readFileSync(overlayPath, 'utf8');
    expect(src).not.toContain('SectorDashboard');
  });
});

// ── 1b. i18n keys exist in pt_BR and en ───────────────────────────────────
describe('M6.1-b — i18n keys for COMMERCIAL placeholder', () => {
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

  it('pt_BR has ALGORYTHMO_ADMIN.COMMERCIAL.TITLE = "Visão Comercial"', () => {
    const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
    expect(pt.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE).toBe('Visão Comercial');
  });

  it('pt_BR has ALGORYTHMO_ADMIN.COMMERCIAL.BODY defined', () => {
    const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
    expect(typeof pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).toBe('string');
    expect(pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY.length).toBeGreaterThan(0);
  });

  it('en has ALGORYTHMO_ADMIN.COMMERCIAL.TITLE defined and != PT', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
    expect(typeof en.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE).toBe('string');
    expect(en.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE).not.toBe(
      pt.ALGORYTHMO_ADMIN.COMMERCIAL.TITLE
    );
  });

  it('en has ALGORYTHMO_ADMIN.COMMERCIAL.BODY defined and != PT', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));
    expect(typeof en.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).toBe('string');
    expect(en.ALGORYTHMO_ADMIN.COMMERCIAL.BODY).not.toBe(
      pt.ALGORYTHMO_ADMIN.COMMERCIAL.BODY
    );
  });
});

// ── 2. reports.routes.js wiring ───────────────────────────────────────────
describe('M6.1-b — reports.routes.js', () => {
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

  it('imports the real ReportsCommercialOverlay component (not the stub)', () => {
    expect(src).toContain('ReportsCommercialOverlay');
    // Stub used the template object — real import uses a dynamic import()
    expect(src).toContain('import(');
    expect(src).not.toContain("template: '<div />'");
  });

  it("route name 'commercial_reports' is declared", () => {
    expect(src).toContain("name: 'commercial_reports'");
  });

  it("cut-flag meta 'algorythmo_cut_reports_commercial' is wired on the commercial route", () => {
    expect(src).toContain(
      "algorythmoCutFlag: 'algorythmo_cut_reports_commercial'"
    );
  });

  it('redirect reads the cut flag from the accounts store getter', () => {
    expect(src).toContain('accounts/isFeatureEnabledonAccount');
    expect(src).toContain('algorythmo_cut_reports_commercial');
  });

  it('redirect can fall back to account_overview_reports', () => {
    expect(src).toContain("'account_overview_reports'");
  });

  it('redirect targets commercial_reports when not cut', () => {
    expect(src).toContain("'commercial_reports'");
  });

  it('algorythmo marker comment is present on the redirect block', () => {
    expect(src).toContain('// algorythmo:');
  });
});

// ── 3. Sidebar.vue entry ──────────────────────────────────────────────────
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

  it('uses spread-into-empty-array pattern (same as reports_bot gate)', () => {
    // Pattern: ...(algorythmoCutHidden.value.reports_commercial ? [] : [...])
    expect(src).toMatch(
      /algorythmoCutHidden\.value\.reports_commercial\s*\?\s*\[\]/
    );
  });

  it('algorythmo M6.1-b marker comment is present', () => {
    expect(src).toContain('M6.1-b');
  });
});
