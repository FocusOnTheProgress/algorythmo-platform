// algorythmo: plan 0007 M2-e — Administration Overview + sub-tab mock contract.
// Guards D2/D12: one card per sub-area, i18n-only labels, allowed glyphs, and
// chart label/data parity. Catches drift before it reaches a demo.
import { describe, it, expect } from 'vitest';
import overviewCards from '../../mocks/sectors/administration-overview';
import subtabViews from '../../mocks/sectors/administration-subtabs';

const SUBAREA_IDS = ['estrategia', 'metas', 'indicadores'];
const ALLOWED_GLYPHS = ['▲', '▼', '—'];

describe('administration overview mock — contract', () => {
  it('covers every Administration sub-area exactly once', () => {
    expect(overviewCards.map(c => c.id)).toEqual(SUBAREA_IDS);
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

describe('administration sub-tab mock — contract', () => {
  it('covers every Administration sub-area exactly once (all are mocked deep views)', () => {
    expect(subtabViews.map(v => v.id)).toEqual(SUBAREA_IDS);
  });

  it('chart labels and data have matching lengths', () => {
    subtabViews.forEach(view => {
      expect(view.chartData).toHaveLength(view.chartLabels.length);
    });
  });

  it('labels and chart titles are i18n keys', () => {
    subtabViews.forEach(view => {
      expect(view.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
      expect(view.chartTitleKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });

  it('restricts delta glyphs to the allowed set', () => {
    subtabViews.forEach(view => {
      expect(ALLOWED_GLYPHS).toContain(view.delta.glyph);
    });
  });
});
