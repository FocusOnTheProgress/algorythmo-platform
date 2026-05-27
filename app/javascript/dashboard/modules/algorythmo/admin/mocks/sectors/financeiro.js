// algorythmo: M6.4 Financeiro mock. Extrapolated from the Operação canonical
// pattern (plan 0005 §9.1). Shape: see `./contract.js`.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'financeiro',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.ANCHOR.CAIXA_LABEL',
      value: 'R$ 1.247.300',
      delta: { glyph: '▲', text: 'R$ 84.200 (+7,2%)' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.ANCHOR.RECEBIVEIS_LABEL',
      value: 'R$ 612.400',
      delta: { glyph: '▲', text: 'R$ 29.800 (+5,1%)' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.SECONDARY.PAGAR_LABEL',
      value: 'R$ 387.500',
      delta: { glyph: '▲', text: 'R$ 18.400' },
    },
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.SECONDARY.INADIMPLENCIA_LABEL',
      value: '2,4%',
      delta: { glyph: '▼', text: '0,3pp' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.SECONDARY.MARGEM_LABEL',
      value: '18,7%',
      delta: { glyph: '▲', text: '0,6pp' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.SECONDARY.DSO_LABEL',
      value: '38 dias',
      delta: { glyph: '▼', text: '2 dias' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCEIRO.CHART_TITLE',
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
    data: [
      1080, 1112, 1098, 1125, 1162, 1140, 1178, 1195, 1218, 1224, 1235, 1247,
    ],
  },
};
