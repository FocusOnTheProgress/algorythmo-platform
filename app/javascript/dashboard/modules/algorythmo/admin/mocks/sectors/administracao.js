// algorythmo: M6.3 Administração mock. Extrapolated from the Operação
// canonical pattern (plan 0005 §9.1). Shape: see `./contract.js`.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'administracao',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.ANCHOR.CONTRATOS_LABEL',
      value: '138',
      delta: { glyph: '▲', text: '4' },
    },
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.ANCHOR.RENOVACOES_LABEL',
      value: '9',
      delta: { glyph: '▲', text: '2 em 30 dias' },
    },
  ],
  secondaryKpis: [
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.SECONDARY.DOCUMENTOS_LABEL',
      value: '24',
      delta: { glyph: '▼', text: '6' },
    },
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.SECONDARY.APROVACOES_LABEL',
      value: '7',
      delta: { glyph: '▼', text: '1' },
    },
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.SECONDARY.CADASTROS_LABEL',
      value: '18',
      delta: { glyph: '▲', text: '4' },
    },
    {
      labelKey:
        'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.SECONDARY.AUDITORIAS_LABEL',
      value: '3',
      delta: { glyph: '—', text: 'sem variação' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRACAO.CHART_TITLE',
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
    data: [42, 38, 45, 51, 47, 54, 49, 58, 52, 49, 55, 51],
  },
};
