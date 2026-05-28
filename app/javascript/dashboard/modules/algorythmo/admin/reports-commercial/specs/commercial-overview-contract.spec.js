// algorythmo: plan 0007 M2-c — Overview + sub-tab mock contracts.
// Guards D2/D12: one card per sub-area, i18n-only labels, allowed glyphs, and
// chart label/data length parity. Catches drift before it reaches a demo.
import { describe, it, expect } from 'vitest';
import overviewCards from '../../mocks/sectors/commercial-overview';
import subtabViews from '../../mocks/sectors/commercial-subtabs';

const SUBAREA_IDS = [
  'operations',
  'conversation',
  'agents',
  'teams',
  'sla',
  'csat',
];
const ALLOWED_GLYPHS = ['▲', '▼', '—'];

describe('commercial overview mock — contract', () => {
  it('covers every Commercial sub-area exactly once', () => {
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

describe('commercial sub-tab mock — contract', () => {
  it('covers the same sub-areas in the same order as the overview', () => {
    expect(subtabViews.map(v => v.id)).toEqual(SUBAREA_IDS);
  });

  it('chart labels and data have matching lengths', () => {
    subtabViews.forEach(view => {
      expect(view.chartData).toHaveLength(view.chartLabels.length);
    });
  });

  it('every deep view links to a live upstream report route', () => {
    const expected = {
      // algorythmo: M2-c founder decision — inbox_reports_index (per-channel
      // operational breakdown) replaces account_overview_reports (rejected:
      // too similar to the SectorShellV2 Overview tab). Route stays live even
      // though reports_inbox is sidebar-cut; deep-link from sub-tab is by design.
      operations: 'inbox_reports_index',
      conversation: 'conversation_reports',
      agents: 'agent_reports_index',
      teams: 'team_reports_index',
      sla: 'sla_reports',
      csat: 'csat_reports',
    };
    subtabViews.forEach(view => {
      expect(view.routeName).toBe(expected[view.id]);
    });
  });

  it('labels and chart titles are i18n keys', () => {
    subtabViews.forEach(view => {
      expect(view.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
      expect(view.chartTitleKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });
});
