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

// OKLCH stage hues (REF CRM). Each drives the COLOURED HEADER BLOCK that crowns
// its column — blue / yellow / purple / orange, matching the reference. Tones
// are calibrated so white (or, for the bright yellow, dark) ink holds AA
// contrast. A regression here is a brand bug.
const EXPECTED_ACCENTS = {
  'demo-novo': 'oklch(0.62 0.15 245)',
  'demo-qualificado': 'oklch(0.78 0.15 88)',
  'demo-proposta': 'oklch(0.62 0.16 300)',
  'demo-negociacao': 'oklch(0.68 0.16 48)',
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

  it('uses the exact REF CRM OKLCH accent per stage', () => {
    DEMO_STAGES.forEach(stage => {
      expect(stage.accent).toBe(EXPECTED_ACCENTS[stage.id]);
    });
  });

  it('marks only the bright (yellow) stage for dark header ink (AA contrast)', () => {
    // The yellow "Qualificado" header is too bright for white ink; it carries an
    // explicit accent_ink:"dark". Every other stage takes the default (light).
    const byId = Object.fromEntries(DEMO_STAGES.map(s => [s.id, s]));
    expect(byId['demo-qualificado'].accent_ink).toBe('dark');
    ['demo-novo', 'demo-proposta', 'demo-negociacao'].forEach(id => {
      expect(byId[id].accent_ink).toBeUndefined();
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

  it('carries the rich lead-panel profile on every demo lead (round-3)', () => {
    DEMO_LEADS.forEach(lead => {
      expect(typeof lead.company).toBe('string');
      expect(typeof lead.role).toBe('string');
      expect(Array.isArray(lead.channels)).toBe(true);
      expect(lead.channels.length).toBeGreaterThan(0);
      expect(Array.isArray(lead.social)).toBe(true);
      expect(typeof lead.summary).toBe('string');
      expect(Array.isArray(lead.qualification)).toBe(true);
      expect(lead.qualification.length).toBeGreaterThan(0);
      expect(Array.isArray(lead.timeline)).toBe(true);
      expect(lead.timeline.length).toBeGreaterThan(0);
      // conversation_id powers the "Ver conversa" CTA — must be a real number.
      expect(Number.isFinite(lead.conversation_id)).toBe(true);
      // due_label is optional (null for non-urgent), but when present must be a
      // string paired with a known tone.
      if (lead.due_label != null) {
        expect(typeof lead.due_label).toBe('string');
        expect(['today', 'soon']).toContain(lead.due_tone);
      }
    });
  });

  it('every timeline entry is stage-history shaped (id, to_stage_name, changed_at)', () => {
    DEMO_LEADS.forEach(lead => {
      lead.timeline.forEach(entry => {
        expect(entry.id).toBeTruthy();
        expect(entry.to_stage_name).toBeTruthy();
        expect(entry.changed_at).toBeTruthy();
        // First entry is the system "created" node (from null).
      });
      expect(lead.timeline[0].from_stage_id).toBeNull();
    });
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
