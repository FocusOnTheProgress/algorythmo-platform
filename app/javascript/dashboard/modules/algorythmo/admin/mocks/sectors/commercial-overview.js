// algorythmo: plan 0007 M2-c — Commercial Overview aggregate (D2 + D12).
// The Overview is a dense data central: ONE anchor KPI + ONE mini sparkline per
// Commercial sub-area, laid out in a responsive grid. Every card carries the
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
    id: 'operations',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.OPERATIONS_LABEL',
    value: 'R$ 184.720',
    delta: { glyph: '▲', text: '+7,2%' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.OPERATIONS_CHART',
    sparkline: [38, 42, 45, 41, 48, 52, 49, 54],
  },
  {
    id: 'conversation',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CONVERSATION_LABEL',
    value: '1.284',
    delta: { glyph: '▲', text: '+112' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CONVERSATION_CHART',
    sparkline: [142, 158, 171, 165, 180, 176, 192, 188],
  },
  {
    id: 'agents',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.AGENTS_LABEL',
    value: '2m 18s',
    delta: { glyph: '▼', text: '12s' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.AGENTS_CHART',
    sparkline: [165, 158, 151, 148, 142, 145, 139, 138],
  },
  {
    id: 'teams',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TEAMS_LABEL',
    value: '94,1%',
    delta: { glyph: '▲', text: '2,3pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TEAMS_CHART',
    sparkline: [88, 89, 90, 91, 92, 93, 93, 94],
  },
  {
    id: 'sla',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.SLA_LABEL',
    value: '96,8%',
    delta: { glyph: '▲', text: '1,1pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.SLA_CHART',
    sparkline: [94, 95, 95, 96, 96, 97, 97, 97],
  },
  {
    id: 'csat',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CSAT_LABEL',
    value: '4,7 / 5',
    delta: { glyph: '▲', text: '0,2' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CSAT_CHART',
    sparkline: [42, 43, 44, 44, 45, 46, 46, 47],
  },
];
