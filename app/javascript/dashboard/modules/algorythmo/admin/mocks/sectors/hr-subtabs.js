// algorythmo: plan 0007 M2-f — HR sub-tab deep views.
// Each HR sub-area becomes a SectorShellV2 sub-tab. The deep view is a focused
// mock (anchor + 12-month chart, watermarked) — a glance into the metric until
// real KPIs land when the founder unblocks the backend.
//
// `id` matches the SectorShellV2 sub-tab id and the Overview card id 1:1.

/**
 * @typedef {Object} SubtabDeepView
 * @property {string}   id          Sub-tab slug (matches SectorShellV2 tab id).
 * @property {string}   labelKey    i18n key for the sub-area label.
 * @property {string}   value       Pre-formatted anchor value.
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}   chartTitleKey
 * @property {string[]} chartLabels Same length as `chartData`.
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
    id: 'contratacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CONTRATACAO_LABEL',
    value: '5',
    delta: { glyph: '▲', text: '1 (+25%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CONTRATACAO_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [2, 3, 2, 3, 4, 3, 4, 5, 4, 4, 5, 5],
  },
  {
    id: 'treinamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TREINAMENTO_LABEL',
    value: '87,5%',
    delta: { glyph: '▲', text: '3,2pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TREINAMENTO_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [78, 79, 80, 81, 82, 83, 84, 84, 85, 86, 87, 88],
  },
  {
    id: 'cultura',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CULTURA_LABEL',
    value: '+42',
    delta: { glyph: '▲', text: '4' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CULTURA_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [34, 35, 36, 37, 37, 38, 39, 40, 40, 41, 42, 42],
  },
  {
    id: 'produtividade',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.PRODUTIVIDADE_LABEL',
    value: '94 pts',
    delta: { glyph: '▼', text: '2 pts' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.PRODUTIVIDADE_CHART',
    chartLabels: MONTH_LABELS,
    chartData: [98, 98, 97, 97, 96, 96, 96, 95, 95, 95, 94, 94],
  },
];
