// algorythmo: plan 0007 M2-d — Marketing Overview + sub-tab + campaign mocks.
// Guards D2/D12/D8: one card per sub-area, i18n-only labels, allowed glyphs,
// chart label/data parity, and live campaign route names. Catches drift before
// it reaches a demo.
import { describe, it, expect } from 'vitest';
import overviewCards from '../../mocks/sectors/marketing-overview';
import subtabViews from '../../mocks/sectors/marketing-subtabs';
import campaignLinks from '../../mocks/sectors/marketing-campaigns';

// Overview covers all six sub-areas; sub-tab deep views cover the five that are
// mocked (Campanhas is a live composition, not a mocked deep view).
const OVERVIEW_IDS = [
  'branding',
  'campanhas',
  'redes_sociais',
  'trafego',
  'crm',
  'retencao',
];
const DEEP_VIEW_IDS = [
  'branding',
  'redes_sociais',
  'trafego',
  'crm',
  'retencao',
];
const ALLOWED_GLYPHS = ['▲', '▼', '—'];

describe('marketing overview mock — contract', () => {
  it('covers every Marketing sub-area exactly once', () => {
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

describe('marketing sub-tab mock — contract', () => {
  it('covers the five mocked sub-areas (Campanhas is a live composition)', () => {
    expect(subtabViews.map(v => v.id)).toEqual(DEEP_VIEW_IDS);
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

describe('marketing campaign links — contract (D8)', () => {
  it('surfaces the two live campaign route families (ongoing + one_off)', () => {
    const expected = {
      ongoing: 'campaigns_ongoing_index',
      one_off: 'campaigns_one_off_index',
    };
    campaignLinks.forEach(link => {
      expect(link.routeName).toBe(expected[link.id]);
    });
    expect(campaignLinks.map(l => l.id)).toEqual(['ongoing', 'one_off']);
  });

  it('labels and descriptions are i18n keys', () => {
    campaignLinks.forEach(link => {
      expect(link.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
      expect(link.descKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });
});
