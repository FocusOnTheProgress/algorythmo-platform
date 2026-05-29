// algorythmo: plan 0007 M2-g — Facilities Overview mock contract.
// Guards D2/D12: one card per spend area + a consolidated total, i18n-only
// labels, allowed delta glyphs, and sparkline sanity. Catches drift before a demo.
import { describe, it, expect } from 'vitest';
import overviewCards from '../../mocks/sectors/facilities-overview';

const OVERVIEW_IDS = [
  'aluguel',
  'energia',
  'manutencao',
  'limpeza',
  'consolidado',
];
const ALLOWED_GLYPHS = ['▲', '▼', '—'];

describe('facilities overview mock — contract', () => {
  it('covers every Facilities spend area exactly once', () => {
    expect(overviewCards.map(c => c.id)).toEqual(OVERVIEW_IDS);
  });

  it('labels and chart titles are i18n keys (no raw Portuguese)', () => {
    overviewCards.forEach(card => {
      expect(card.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
      expect(card.chartTitleKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });

  it('restricts delta glyphs to the allowed set', () => {
    overviewCards.forEach(card => {
      expect(ALLOWED_GLYPHS).toContain(card.delta.glyph);
    });
  });

  it('every sparkline has at least two points', () => {
    overviewCards.forEach(card => {
      expect(card.sparkline.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('no delta text contains raw HTML', () => {
    overviewCards.forEach(card => {
      expect(card.delta.text).not.toMatch(/<[^>]+>/);
    });
  });
});
