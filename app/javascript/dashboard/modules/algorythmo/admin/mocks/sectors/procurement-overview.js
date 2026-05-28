// algorythmo: plan 0007 M2-e — Procurement Overview aggregate (D2 + D12).
// Dense data central: ONE anchor KPI + ONE mini sparkline per Procurement
// sub-area. Every card carries the "DADOS DE DEMONSTRAÇÃO" watermark so the
// mock never reads as a real source of truth. Numbers extrapolate the M6.2
// Compras canonical (plan 0005 §9.1) for the same hypothetical PME.
//
// `id` matches the SectorShellV2 sub-tab id 1:1.

/**
 * @typedef {Object} OverviewCard
 * @property {string}                id
 * @property {string}                labelKey
 * @property {string}                value
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}                chartTitleKey
 * @property {number[]}              sparkline
 */

/** @type {OverviewCard[]} */
export default [
  {
    id: 'fornecedores',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.FORNECEDORES_LABEL',
    value: '47',
    delta: { glyph: '▲', text: '+2' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.FORNECEDORES_CHART',
    sparkline: [41, 42, 43, 44, 45, 45, 46, 47],
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.REPOSICAO_LABEL',
    value: '23',
    delta: { glyph: '▼', text: '3' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.REPOSICAO_CHART',
    sparkline: [31, 29, 28, 27, 26, 25, 24, 23],
  },
  {
    id: 'custo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.CUSTO_LABEL',
    value: '62,3%',
    delta: { glyph: '▼', text: '0,5pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.CUSTO_CHART',
    sparkline: [63.2, 63.0, 62.9, 62.8, 62.6, 62.5, 62.4, 62.3],
  },
  {
    id: 'giro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.GIRO_LABEL',
    value: '42 dias',
    delta: { glyph: '▼', text: '3 dias (mais rápido)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.GIRO_CHART',
    sparkline: [48, 47, 46, 45, 44, 44, 43, 42],
  },
];
