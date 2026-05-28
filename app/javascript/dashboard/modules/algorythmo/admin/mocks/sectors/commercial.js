// algorythmo: M6.1-c — Commercial sector mock. Founder-locked values (D8,
// D11 — confirmed 2026-05-27). Shape: see `./contract.js` (SectorMock typedef).
// Boundary: meio/fundo de funil (pipeline, conversão, receita, ciclo, ticket,
// canal de fechamento). Top-of-funnel lives in marketing.js — zero overlap.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'commercial',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.ANCHOR.RECEITA_LABEL',
      value: 'R$ 184.720',
      delta: { glyph: '▲', text: 'R$ 12.400 (+7,2%)' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.ANCHOR.CONVERSAO_LABEL',
      value: '18,4%',
      delta: { glyph: '▲', text: '1,1pp' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.SECONDARY.LEADS_LABEL',
      value: '412',
      delta: { glyph: '▲', text: '38' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.SECONDARY.CICLO_LABEL',
      value: '11,2 dias',
      delta: { glyph: '▼', text: '0,8 dia' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.SECONDARY.TICKET_LABEL',
      value: 'R$ 484,90',
      delta: { glyph: '▲', text: 'R$ 28,30' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.SECONDARY.CANAL_LABEL',
      value: 'WhatsApp · 48%',
      delta: { glyph: '▲', text: '3pp' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CHART_TITLE',
    labels: [
      'S1',
      'S2',
      'S3',
      'S4',
      'S5',
      'S6',
      'S7',
      'S8',
      'S9',
      'S10',
      'S11',
      'S12',
    ],
    data: [38, 42, 45, 41, 48, 52, 49, 54, 51, 56, 58, 62],
  },
};
