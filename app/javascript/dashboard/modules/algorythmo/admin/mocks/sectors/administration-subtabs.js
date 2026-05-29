// algorythmo: plan 0007 M2-e — Administration sub-tab deep views.
// Anchor + 12-month chart per sub-area, watermarked. None of these sub-tabs
// deep-link into a live upstream route — pure mocks until real KPIs land.
// Administration tracks on a monthly cadence (strategy/goals/indicators), so
// the chart axis is months, not weeks.
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

const MONTH_LABELS = [
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
];

/** @type {SubtabDeepView[]} */
export default [
  {
    id: 'estrategia',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.ESTRATEGIA_LABEL',
    value: '12',
    delta: { glyph: '▲', text: '2' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.ESTRATEGIA_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [7, 8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12],
  },
  {
    id: 'metas',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.METAS_LABEL',
    value: '83,5%',
    delta: { glyph: '▲', text: '3,2pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.METAS_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [72, 74, 75, 76, 78, 79, 80, 81, 81, 82, 83, 83],
  },
  {
    id: 'indicadores',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.INDICADORES_LABEL',
    value: '78,0%',
    delta: { glyph: '▼', text: '1,4pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.INDICADORES_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [83, 82, 82, 81, 81, 80, 80, 79, 79, 78, 78, 78],
  },
];
