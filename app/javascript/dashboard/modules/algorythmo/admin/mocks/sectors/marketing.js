// algorythmo: M6.6 Marketing mock. Extrapolated from the Operação canonical
// pattern (plan 0005 §9.1). Shape: see `./contract.js`.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'marketing',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.ANCHOR.CAC_LABEL',
      value: 'R$ 187',
      delta: { glyph: '▼', text: 'R$ 14 (-7,0%)' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.ANCHOR.ROAS_LABEL',
      value: '4,2x',
      delta: { glyph: '▲', text: '0,3x' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.SECONDARY.LEADS_LABEL',
      value: '1.842',
      delta: { glyph: '▲', text: '124' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.SECONDARY.MQLS_LABEL',
      value: '387',
      delta: { glyph: '▲', text: '28' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.SECONDARY.CTR_LABEL',
      value: '2,8%',
      delta: { glyph: '▲', text: '0,2pp' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.SECONDARY.CPL_LABEL',
      value: 'R$ 23,40',
      delta: { glyph: '▼', text: 'R$ 1,80' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CHART_TITLE',
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
    data: [382, 395, 418, 407, 432, 448, 431, 455, 471, 463, 489, 492],
  },
};
