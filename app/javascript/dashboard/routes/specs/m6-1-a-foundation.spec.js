// algorythmo: M6.1-a — foundation spec
// Asserts that the cut-flag registry entry exists and that all i18n keys for
// the Commercial overlay are non-empty strings (regression guard for missing
// translation keys — edge case 5 in plan 0006).
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  ALGORYTHMO_CUT_FLAG_NAMES,
  ALGORYTHMO_CUT_FLAG_KEYS,
  isKnownAlgorythmoCutFlag,
} from '../../constants/algorythmoCutFlags';

const COMMERCIAL_FLAG_NAME = 'reports_commercial';
const COMMERCIAL_FLAG_KEY = `algorythmo_cut_${COMMERCIAL_FLAG_NAME}`;

// Resolve i18n override files relative to the worktree root.
// From: <worktree>/app/javascript/dashboard/routes/specs
// Up 5 levels reaches the worktree root (which has the full file tree).
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

const i18nBase = path.join(
  REPO_ROOT,
  'engines',
  'algorythmo',
  'app',
  'javascript',
  'i18n',
  'overrides'
);

// Sanity: fail fast if the derived path doesn't exist rather than letting
// JSON.parse silently receive an empty string.
if (!fs.existsSync(i18nBase)) {
  throw new Error(`i18n override dir not found at: ${i18nBase}`);
}

const ptBR = JSON.parse(
  fs.readFileSync(path.join(i18nBase, 'pt_BR.json'), 'utf8')
);
const en = JSON.parse(fs.readFileSync(path.join(i18nBase, 'en.json'), 'utf8'));

describe('M6.1-a — cut-flag registry', () => {
  it('reports_commercial is in ALGORYTHMO_CUT_FLAG_NAMES', () => {
    expect(ALGORYTHMO_CUT_FLAG_NAMES).toContain(COMMERCIAL_FLAG_NAME);
  });

  it('algorythmo_cut_reports_commercial is in ALGORYTHMO_CUT_FLAG_KEYS', () => {
    expect(ALGORYTHMO_CUT_FLAG_KEYS).toContain(COMMERCIAL_FLAG_KEY);
  });

  it('isKnownAlgorythmoCutFlag recognises the new key', () => {
    expect(isKnownAlgorythmoCutFlag(COMMERCIAL_FLAG_KEY)).toBe(true);
  });
});

describe('M6.1-a — pt_BR i18n keys', () => {
  const sectors = ptBR.ALGORYTHMO_ADMIN?.SECTORS ?? {};
  const commercial = sectors.COMMERCIAL ?? {};
  const sidebar = ptBR.SIDEBAR ?? {};

  it('SIDEBAR.RELATORIOS_COMERCIAIS_VISAO is a non-empty string', () => {
    expect(typeof sidebar.RELATORIOS_COMERCIAIS_VISAO).toBe('string');
    expect(sidebar.RELATORIOS_COMERCIAIS_VISAO.length).toBeGreaterThan(0);
  });

  it('COMMERCIAL.HEADING is a non-empty string', () => {
    expect(typeof commercial.HEADING).toBe('string');
    expect(commercial.HEADING.length).toBeGreaterThan(0);
  });

  it('COMMERCIAL.CONTEXT is a non-empty string', () => {
    expect(typeof commercial.CONTEXT).toBe('string');
    expect(commercial.CONTEXT.length).toBeGreaterThan(0);
  });

  it('COMMERCIAL.CHART_TITLE is a non-empty string', () => {
    expect(typeof commercial.CHART_TITLE).toBe('string');
    expect(commercial.CHART_TITLE.length).toBeGreaterThan(0);
  });

  it.each([
    ['ANCHOR.RECEITA_LABEL', commercial.ANCHOR?.RECEITA_LABEL],
    ['ANCHOR.CONVERSAO_LABEL', commercial.ANCHOR?.CONVERSAO_LABEL],
    ['SECONDARY.LEADS_LABEL', commercial.SECONDARY?.LEADS_LABEL],
    ['SECONDARY.CICLO_LABEL', commercial.SECONDARY?.CICLO_LABEL],
    ['SECONDARY.TICKET_LABEL', commercial.SECONDARY?.TICKET_LABEL],
    ['SECONDARY.CANAL_LABEL', commercial.SECONDARY?.CANAL_LABEL],
  ])('%s is a non-empty string (pt_BR)', (_key, value) => {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });
});

describe('M6.1-a — en i18n keys', () => {
  const sectors = en.ALGORYTHMO_ADMIN?.SECTORS ?? {};
  const commercial = sectors.COMMERCIAL ?? {};
  const sidebar = en.SIDEBAR ?? {};

  it('SIDEBAR.RELATORIOS_COMERCIAIS_VISAO is a non-empty string', () => {
    expect(typeof sidebar.RELATORIOS_COMERCIAIS_VISAO).toBe('string');
    expect(sidebar.RELATORIOS_COMERCIAIS_VISAO.length).toBeGreaterThan(0);
  });

  it('COMMERCIAL.HEADING is a non-empty string', () => {
    expect(typeof commercial.HEADING).toBe('string');
    expect(commercial.HEADING.length).toBeGreaterThan(0);
  });

  it.each([
    ['ANCHOR.RECEITA_LABEL', commercial.ANCHOR?.RECEITA_LABEL],
    ['ANCHOR.CONVERSAO_LABEL', commercial.ANCHOR?.CONVERSAO_LABEL],
    ['SECONDARY.LEADS_LABEL', commercial.SECONDARY?.LEADS_LABEL],
    ['SECONDARY.CICLO_LABEL', commercial.SECONDARY?.CICLO_LABEL],
    ['SECONDARY.TICKET_LABEL', commercial.SECONDARY?.TICKET_LABEL],
    ['SECONDARY.CANAL_LABEL', commercial.SECONDARY?.CANAL_LABEL],
  ])('%s is a non-empty string (en)', (_key, value) => {
    expect(typeof value).toBe('string');
    expect(value.length).toBeGreaterThan(0);
  });
});
