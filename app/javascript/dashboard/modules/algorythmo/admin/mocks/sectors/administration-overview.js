// algorythmo: plan 0007 M2-e — Administration Overview aggregate (D2 + D12).
// Dense data central: ONE anchor KPI + ONE mini sparkline per Administration
// sub-area. Every card carries the "DADOS DE DEMONSTRAÇÃO" watermark. Numbers
// extrapolate the M6.3 Administração canonical (plan 0005 §9.1) toward the
// strategy/goals/indicators framing of this sector's new sub-tabs.
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
    id: 'estrategia',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.ESTRATEGIA_LABEL',
    value: '12',
    delta: { glyph: '▲', text: '+2' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.ESTRATEGIA_CHART',
    sparkline: [8, 9, 9, 10, 10, 11, 11, 12],
  },
  {
    id: 'metas',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.METAS_LABEL',
    value: '83,5%',
    delta: { glyph: '▲', text: '+3,2pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.METAS_CHART',
    sparkline: [74, 76, 77, 79, 80, 81, 82, 83],
  },
  {
    id: 'indicadores',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.INDICADORES_LABEL',
    value: '78,0%',
    delta: { glyph: '▼', text: '1,4pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.INDICADORES_CHART',
    sparkline: [82, 81, 81, 80, 79, 79, 78, 78],
  },
];
