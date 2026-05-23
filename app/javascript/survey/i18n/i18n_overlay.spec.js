/**
 * algorythmo: survey-i18n-overlay
 *
 * Verifies that the Algorythmo OS brand overlay is applied correctly to the
 * survey locale messages. After the deep-merge, POWERED_BY in en and pt_BR
 * must not contain the literal "Chatwoot".
 */

import { deepMerge } from 'engines/algorythmo/app/javascript/i18n/deepMerge';
import enBase from './locale/en.json';
import ptBRBase from './locale/pt_BR.json';
import enOverrides from 'engines/algorythmo/app/javascript/survey-i18n/overrides/en.json';
import ptBROverrides from 'engines/algorythmo/app/javascript/survey-i18n/overrides/pt_BR.json';

const en = deepMerge(enBase, enOverrides);
const pt_BR = deepMerge(ptBRBase, ptBROverrides);

describe('Algorythmo OS survey i18n overlay — en', () => {
  it('POWERED_BY does not mention Chatwoot', () => {
    expect(en.POWERED_BY).not.toContain('Chatwoot');
  });

  it('POWERED_BY mentions Algorythmo OS', () => {
    expect(en.POWERED_BY).toContain('Algorythmo OS');
  });

  it('upstream keys not in overrides are still present (deepMerge preserves base)', () => {
    // Spot-check a key from the upstream survey locale not in overrides.
    // Validates deepMerge does not wipe the entire base.
    expect(en.SURVEY.RATING.LABEL).toBeDefined();
  });
});

describe('Algorythmo OS survey i18n overlay — pt_BR', () => {
  it('POWERED_BY does not mention Chatwoot', () => {
    expect(pt_BR.POWERED_BY).not.toContain('Chatwoot');
  });

  it('POWERED_BY mentions Algorythmo OS', () => {
    expect(pt_BR.POWERED_BY).toContain('Algorythmo OS');
  });
});
