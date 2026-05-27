// algorythmo: M6.5 RH mock. Extrapolated from the Operação canonical
// pattern (plan 0005 §9.1). Shape: see `./contract.js`.

/** @type {import('./contract').SectorMock} */
export default {
  id: 'rh',
  headingKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.HEADING',
  contextKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.CONTEXT',
  anchorKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.ANCHOR.HEADCOUNT_LABEL',
      value: '84',
      delta: { glyph: '▲', text: '3' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.ANCHOR.TURNOVER_LABEL',
      value: '4,8%',
      delta: { glyph: '▼', text: '0,5pp (trimestre)' },
    },
  ],
  secondaryKpis: [
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.SECONDARY.CONTRATACOES_LABEL',
      value: '5',
      delta: { glyph: '▲', text: '1' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.SECONDARY.VAGAS_LABEL',
      value: '7',
      delta: { glyph: '▼', text: '2' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.SECONDARY.ABSENTEISMO_LABEL',
      value: '2,1%',
      delta: { glyph: '▼', text: '0,2pp' },
    },
    {
      labelKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.SECONDARY.ENPS_LABEL',
      value: '+42',
      delta: { glyph: '▲', text: '4' },
    },
  ],
  chart: {
    type: 'line',
    titleKey: 'ALGORYTHMO_ADMIN.SECTORS.RH.CHART_TITLE',
    labels: [
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'M6',
      'M7',
      'M8',
      'M9',
      'M10',
      'M11',
      'M12',
    ],
    data: [73, 74, 76, 77, 78, 78, 80, 81, 82, 82, 83, 84],
  },
};
