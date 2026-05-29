// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import {
  DEMO_STAGES,
  DEMO_SUMMARY,
  DEMO_STAGE_COUNTS,
  DEMO_METRICS_BY_STAGE,
  DEMO_LEADS,
  buildDemoLeads,
} from '../demoData.js';

// Exact OKLCH hues locked in DESIGN-DELTA-0009. The 2px top bar + count-pill
// tint must use these and only these — a regression here is a brand bug.
const EXPECTED_ACCENTS = {
  'demo-novo': 'oklch(0.55 0.10 235)',
  'demo-qualificado': 'oklch(0.62 0.11 85)',
  'demo-proposta': 'oklch(0.55 0.12 295)',
  'demo-negociacao': 'oklch(0.55 0.11 35)',
};

describe('CRM demo data', () => {
  it('ships exactly the four locked stages in funnel order', () => {
    expect(DEMO_STAGES.map(s => s.name)).toEqual([
      'Novo Lead',
      'Qualificado',
      'Proposta Enviada',
      'Negociação',
    ]);
    DEMO_STAGES.forEach((stage, idx) => {
      expect(stage.position).toBe(idx + 1);
      expect(stage.kind).toBe('open');
    });
  });

  it('uses the exact DESIGN-DELTA-0009 OKLCH accent per stage', () => {
    DEMO_STAGES.forEach(stage => {
      expect(stage.accent).toBe(EXPECTED_ACCENTS[stage.id]);
    });
  });

  it('every stage has a positive aging coefficient so chips can age', () => {
    DEMO_STAGES.forEach(stage => {
      expect(stage.aging_coefficient).toBeGreaterThan(0);
    });
  });

  it('spreads ~16 demo leads across all four stages', () => {
    expect(DEMO_LEADS).toHaveLength(16);
    DEMO_STAGES.forEach(stage => {
      const inStage = DEMO_LEADS.filter(l => l.stage_id === stage.id);
      expect(inStage.length).toBeGreaterThan(0);
    });
  });

  it('every demo lead carries the fields the presenter transform needs', () => {
    const stageIds = new Set(DEMO_STAGES.map(s => s.id));
    DEMO_LEADS.forEach(lead => {
      expect(typeof lead.id).toBe('string');
      expect(stageIds.has(lead.stage_id)).toBe(true);
      expect(lead.channel_origin).toBeTruthy();
      expect(lead.stage_entered_at).toBeTruthy();
      expect(lead.contact?.name).toBeTruthy();
      // owner is either null or a {id,name} object — both are valid.
      expect(
        lead.owner === null ||
          (typeof lead.owner.id === 'string' && !!lead.owner.name)
      ).toBe(true);
    });
  });

  it('exercises every channel chip variant from the mockup', () => {
    const channels = new Set(DEMO_LEADS.map(l => l.channel_origin));
    ['whatsapp', 'email', 'instagram', 'tiktok'].forEach(ch => {
      expect(channels.has(ch)).toBe(true);
    });
  });

  it('reports per-stage funnel counts and a coherent summary', () => {
    DEMO_STAGES.forEach(stage => {
      expect(DEMO_STAGE_COUNTS[stage.id]).toBeGreaterThan(0);
      const metrics = DEMO_METRICS_BY_STAGE[stage.id];
      expect(metrics.lead_count).toBe(DEMO_STAGE_COUNTS[stage.id]);
    });
    expect(DEMO_SUMMARY.open_leads).toBeGreaterThan(0);
    expect(DEMO_SUMMARY.conversion_rate).toBeGreaterThan(0);
    expect(DEMO_SUMMARY.conversion_rate).toBeLessThanOrEqual(1);
  });

  it('terminal stage has null conversion_rate_to_next', () => {
    expect(
      DEMO_METRICS_BY_STAGE['demo-negociacao'].conversion_rate_to_next
    ).toBeNull();
  });

  it('buildDemoLeads returns a fresh, mutable copy each call', () => {
    const a = buildDemoLeads();
    const b = buildDemoLeads();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    a[0].stage_id = 'mutated';
    expect(DEMO_LEADS[0].stage_id).not.toBe('mutated');
    expect(b[0].stage_id).not.toBe('mutated');
  });
});
