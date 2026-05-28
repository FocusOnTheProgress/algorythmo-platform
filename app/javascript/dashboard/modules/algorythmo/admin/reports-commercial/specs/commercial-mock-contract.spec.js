// algorythmo: M6.1-c — commercial.js contract validation.
// Asserts that commercial.js satisfies the SectorMock typedef from contract.js:
// 2 anchors, 4 secondaries, chart with matching label/data lengths, headingKey.
// If contract.js ever extends the typedef, this spec will catch drift.
import { describe, it, expect } from 'vitest';
import commercialMock from '../../mocks/sectors/commercial';

describe('commercial mock — contract conformance', () => {
  it('has a stable id slug', () => {
    expect(commercialMock.id).toBe('commercial');
  });

  it('has i18n headingKey (no raw Portuguese)', () => {
    expect(commercialMock.headingKey).toMatch(/^ALGORYTHMO_ADMIN\./);
  });

  it('has i18n contextKey (no raw Portuguese)', () => {
    expect(commercialMock.contextKey).toMatch(/^ALGORYTHMO_ADMIN\./);
  });

  it('has exactly 2 anchor KPIs', () => {
    expect(commercialMock.anchorKpis).toHaveLength(2);
  });

  it('anchor[0] — Receita fechada matches D8 founder-locked value', () => {
    expect(commercialMock.anchorKpis[0].value).toBe('R$ 184.720');
    expect(commercialMock.anchorKpis[0].delta.glyph).toBe('▲');
  });

  it('anchor[1] — Conversão matches D8 founder-locked value', () => {
    expect(commercialMock.anchorKpis[1].value).toBe('18,4%');
    expect(commercialMock.anchorKpis[1].delta.glyph).toBe('▲');
  });

  it('has exactly 4 secondary KPIs', () => {
    expect(commercialMock.secondaryKpis).toHaveLength(4);
  });

  it('secondary KPI labelKeys are all i18n keys', () => {
    commercialMock.secondaryKpis.forEach(kpi => {
      expect(kpi.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });

  it('anchor KPI labelKeys are all i18n keys', () => {
    commercialMock.anchorKpis.forEach(kpi => {
      expect(kpi.labelKey).toMatch(/^ALGORYTHMO_ADMIN\./);
    });
  });

  it('chart is defined with type line', () => {
    expect(commercialMock.chart).toBeDefined();
    expect(commercialMock.chart.type).toBe('line');
  });

  it('chart has 12 weekly labels', () => {
    expect(commercialMock.chart.labels).toHaveLength(12);
    expect(commercialMock.chart.labels[0]).toBe('S1');
    expect(commercialMock.chart.labels[11]).toBe('S12');
  });

  it('chart data has 12 entries matching labels length', () => {
    expect(commercialMock.chart.data).toHaveLength(
      commercialMock.chart.labels.length
    );
  });

  it('chart data matches D8 founder-locked weekly Receita values', () => {
    expect(commercialMock.chart.data).toEqual([
      38, 42, 45, 41, 48, 52, 49, 54, 51, 56, 58, 62,
    ]);
  });

  it('chart has i18n titleKey', () => {
    expect(commercialMock.chart.titleKey).toMatch(/^ALGORYTHMO_ADMIN\./);
  });

  it('no delta.text contains raw HTML', () => {
    [...commercialMock.anchorKpis, ...commercialMock.secondaryKpis].forEach(
      kpi => {
        if (kpi.delta) {
          expect(kpi.delta.text).not.toMatch(/<[^>]+>/);
        }
      }
    );
  });

  it('delta glyphs are restricted to the allowed set (▲ / ▼ / —)', () => {
    [...commercialMock.anchorKpis, ...commercialMock.secondaryKpis].forEach(
      kpi => {
        if (kpi.delta) {
          expect(['▲', '▼', '—']).toContain(kpi.delta.glyph);
        }
      }
    );
  });
});
