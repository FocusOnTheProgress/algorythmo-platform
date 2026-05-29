// algorythmo: plan 0007 M2-e — Procurement sub-tab deep views.
// Anchor + 12-week chart per sub-area, watermarked. None of these sub-tabs
// deep-link into a live upstream route — pure mocks until real KPIs land.
//
// `id` matches the SectorShellV2 sub-tab id and the Overview card id 1:1.

/**
 * @typedef {Object} SubtabDeepView
 * @property {string}   id
 * @property {string}   labelKey
 * @property {string}   value
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}   chartTitleKey
 * @property {string[]} chartLabels
 * @property {number[]} chartData
 */

const WEEK_LABELS = [
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
];

/** @type {SubtabDeepView[]} */
export default [
  {
    id: 'fornecedores',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.FORNECEDORES_LABEL',
    value: '47',
    delta: { glyph: '▲', text: '2' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.FORNECEDORES_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [40, 41, 42, 42, 43, 44, 44, 45, 45, 46, 46, 47],
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.REPOSICAO_LABEL',
    value: '23',
    delta: { glyph: '▼', text: '3' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.REPOSICAO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [32, 31, 30, 29, 28, 28, 27, 26, 25, 25, 24, 23],
  },
  {
    id: 'custo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.CUSTO_LABEL',
    value: '62,3%',
    delta: { glyph: '▼', text: '0,5pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.CUSTO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [
      63.3, 63.2, 63.1, 63.0, 62.9, 62.8, 62.7, 62.6, 62.5, 62.5, 62.4, 62.3,
    ],
  },
  {
    id: 'giro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.GIRO_LABEL',
    value: '42 dias',
    delta: { glyph: '▼', text: '3 dias' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.GIRO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [49, 48, 48, 47, 46, 46, 45, 44, 44, 43, 43, 42],
  },
];
