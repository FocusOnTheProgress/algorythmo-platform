// algorythmo: M6.2 Compras mock. Extrapolated from the Operação canonical
// pattern (plan 0005 §9.1) for the same hypothetical PME (varejo/distribuição,
// ~R$10M/yr revenue). Shape: see `./contract.js`.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'compras',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.ANCHOR.PENDENTES_LABEL',
      value: 'R$ 156.800',
      delta: { glyph: '▼', text: 'R$ 12.400 (-7,3%)' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.ANCHOR.LEAD_TIME_LABEL',
      value: '8,4 dias',
      delta: { glyph: '▼', text: '0,6 dia (mais rápido)' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.SECONDARY.FORNECEDORES_LABEL',
      value: '47',
      delta: { glyph: '▲', text: '2' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.SECONDARY.PEDIDOS_LABEL',
      value: '23',
      delta: { glyph: '▼', text: '3' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.SECONDARY.COTACOES_LABEL',
      value: '11',
      delta: { glyph: '▲', text: '2' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.SECONDARY.ECONOMIA_LABEL',
      value: '4,2%',
      delta: { glyph: '▲', text: '0,3pp' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMPRAS.CHART_TITLE',
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
    data: [78, 82, 75, 88, 91, 84, 79, 96, 87, 93, 89, 85],
  },
};
