// algorythmo: feature-gate algorythmo_crm
//
// Locale parity guard for the CRM dashboard messages. The component specs stub
// `t(key) => key`, so a key that exists in one locale but not the other still
// renders "green" in unit tests while shipping raw key paths (and broken
// aria-labels) to users in the missing locale — exactly the defect adversarial
// review #111 caught. This spec is the structural guard: en and pt_BR
// `algorythmoCrm.json` MUST expose an identical key set (recursively). Adding a
// key to one locale without the other fails CI here.
//
// It asserts STRUCTURE, not copy: values are expected to differ per language;
// only the key graph must match. Empty-string values are flagged separately so
// a key can never be "present but blank".
import { describe, it, expect } from 'vitest';
import en from 'dashboard/i18n/locale/en/algorythmoCrm.json';
import ptBR from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

// Flatten a nested message object into a sorted list of dotted leaf paths.
// Leaves are non-object values (strings). Arrays are not used in these files;
// if one ever appears we treat it as a leaf so the diff still surfaces it.
function leafPaths(obj, prefix = '') {
  const out = [];
  Object.entries(obj).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...leafPaths(value, path));
    } else {
      out.push(path);
    }
  });
  return out.sort();
}

const enPaths = leafPaths(en);
const ptPaths = leafPaths(ptBR);

describe('algorythmoCrm locale parity (en ↔ pt_BR)', () => {
  it('en and pt_BR expose the identical key graph', () => {
    const enSet = new Set(enPaths);
    const ptSet = new Set(ptPaths);
    const missingInEn = ptPaths.filter(p => !enSet.has(p));
    const missingInPt = enPaths.filter(p => !ptSet.has(p));
    // Surface the actual offending keys in the failure message, not just a count.
    expect(
      { missingInEn, missingInPt },
      `locale key graphs diverge — missingInEn=${JSON.stringify(
        missingInEn
      )} missingInPt=${JSON.stringify(missingInPt)}`
    ).toEqual({ missingInEn: [], missingInPt: [] });
  });

  it('every leaf value is a non-empty string in both locales', () => {
    const blanks = [];
    const walk = (obj, locale, prefix = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          walk(value, locale, path);
        } else if (typeof value !== 'string' || value.trim() === '') {
          blanks.push(`${locale}:${path}`);
        }
      });
    };
    walk(en, 'en');
    walk(ptBR, 'pt_BR');
    expect(blanks).toEqual([]);
  });

  it('covers the keys round-4 (Stream C) added so a regression here is loud', () => {
    // Spot-check the keys the CRM round-4 work introduced — if any of these is
    // dropped from either locale the first test already fails, but pinning them
    // by name documents the contract and guards against a careless rename.
    const required = [
      'KANBAN.CONFIGURE_PIPELINE',
      'KANBAN.CONFIG_CLOSE',
      'DRAWER.BLOCK_LABEL.INTELLIGENCE',
      'DRAWER.INTELLIGENCE.CAPTION',
      'DRAWER.INTELLIGENCE.PENDING_BADGE',
      'DRAWER.INTELLIGENCE.RESEARCH_LABEL',
      'DRAWER.INTELLIGENCE.MEMORY_LABEL',
      'DRAWER.INTELLIGENCE.EMPTY',
      'PIPELINE_CONFIG.STAGES_LABEL',
      'PIPELINE_CONFIG.EDIT_SOON',
    ].map(p => `ALGORYTHMO_CRM.${p}`);
    const enSet = new Set(enPaths);
    const ptSet = new Set(ptPaths);
    required.forEach(path => {
      expect(enSet.has(path), `en missing ${path}`).toBe(true);
      expect(ptSet.has(path), `pt_BR missing ${path}`).toBe(true);
    });
  });
});
