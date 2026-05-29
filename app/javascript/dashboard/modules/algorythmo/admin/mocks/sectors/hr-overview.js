// algorythmo: plan 0007 M2-f — HR Overview aggregate (D2 + D12).
// The Overview is a dense data central: ONE anchor KPI + ONE mini sparkline per
// HR sub-area, laid out in a responsive grid. Every card carries the
// "DADOS DE DEMONSTRAÇÃO" watermark (M6.0 / M6.1 contract) so no one mistakes
// the mock for a real source of truth.
//
// `id` matches the SectorShellV2 sub-tab id 1:1, so a card and its deep view
// share i18n + routing context. Values are pre-formatted pt-BR strings (same
// rule as ./contract.js). Sparklines are short series — a glance, not a report.

/**
 * @typedef {Object} OverviewCard
 * @property {string}                id          Sub-area slug (matches sub-tab id).
 * @property {string}                labelKey    i18n key for the sub-area label.
 * @property {string}                value       Pre-formatted anchor value.
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}                chartTitleKey
 * @property {number[]}              sparkline   Short series for the mini chart.
 */

/** @type {OverviewCard[]} */
export default [
  {
    id: 'contratacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CONTRATACAO_LABEL',
    value: '5',
    delta: { glyph: '▲', text: '+1' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CONTRATACAO_CHART',
    sparkline: [2, 3, 3, 4, 4, 5, 4, 5],
  },
  {
    id: 'treinamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TREINAMENTO_LABEL',
    value: '87,5%',
    delta: { glyph: '▲', text: '+3,2pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TREINAMENTO_CHART',
    sparkline: [78, 80, 81, 83, 84, 85, 86, 88],
  },
  {
    id: 'cultura',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CULTURA_LABEL',
    value: '+42',
    delta: { glyph: '▲', text: '+4' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CULTURA_CHART',
    sparkline: [34, 36, 37, 38, 39, 40, 41, 42],
  },
  {
    id: 'produtividade',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.PRODUTIVIDADE_LABEL',
    value: '94 pts',
    delta: { glyph: '▼', text: '2 pts' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.PRODUTIVIDADE_CHART',
    sparkline: [98, 97, 97, 96, 96, 95, 95, 94],
  },
];
