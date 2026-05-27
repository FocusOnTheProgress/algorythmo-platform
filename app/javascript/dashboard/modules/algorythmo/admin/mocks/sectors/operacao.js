// algorythmo: M6 PR-6b — Operação mock. Founder-locked numbers (plan 0005
// §9.1) used as canonical reference for the other 6 sectors.
// Shape: see `./contract.js` (SectorMock typedef). Hard rules:
//   - 2 anchors, 4 secondaries, no HTML in delta.text.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'operacao',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.ANCHOR.ESTOQUE_LABEL',
      value: 'R$ 487.300',
      delta: { glyph: '▲', text: 'R$ 19.100 (+4,1%)' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.ANCHOR.GIRO_LABEL',
      value: '42 dias',
      delta: { glyph: '▼', text: '3 dias (mais rápido)' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.SECONDARY.SKUS_LABEL',
      value: '1.247',
      delta: { glyph: '▲', text: '12' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.SECONDARY.RUPTURA_LABEL',
      value: '3,8%',
      delta: { glyph: '▼', text: '0,4pp' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.SECONDARY.EXPEDICAO_LABEL',
      value: '2,4h',
      delta: { glyph: '▼', text: '0,1h' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.SECONDARY.CMV_LABEL',
      value: '62,3%',
      delta: { glyph: '▲', text: '0,8pp' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.CHART_TITLE',
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
    data: [412, 398, 425, 441, 423, 458, 467, 449, 472, 488, 475, 487],
  },
};
