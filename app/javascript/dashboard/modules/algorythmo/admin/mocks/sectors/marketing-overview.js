// algorythmo: plan 0007 M2-d — Marketing Overview aggregate (D2 + D12).
// The Overview is a dense data central: ONE anchor KPI + ONE mini sparkline per
// Marketing sub-area, laid out in a responsive grid. Every card carries the
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
    id: 'branding',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.BRANDING_LABEL',
    value: '38,4%',
    delta: { glyph: '▲', text: '+2,1pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.BRANDING_CHART',
    sparkline: [31, 32, 34, 33, 35, 36, 37, 38],
  },
  {
    id: 'campanhas',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CAMPANHAS_LABEL',
    value: '4,2x',
    delta: { glyph: '▲', text: '+0,3x' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CAMPANHAS_CHART',
    sparkline: [3.4, 3.6, 3.5, 3.8, 3.9, 4.0, 4.1, 4.2],
  },
  {
    id: 'redes_sociais',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.REDES_SOCIAIS_LABEL',
    value: '6,1%',
    delta: { glyph: '▲', text: '+0,4pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.REDES_SOCIAIS_CHART',
    sparkline: [48, 51, 49, 54, 57, 55, 59, 61],
  },
  {
    id: 'trafego',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TRAFEGO_LABEL',
    value: '2,8%',
    delta: { glyph: '▲', text: '+0,2pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TRAFEGO_CHART',
    sparkline: [22, 24, 23, 25, 26, 25, 27, 28],
  },
  {
    id: 'crm',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CRM_LABEL',
    value: '1.842',
    delta: { glyph: '▲', text: '+124' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CRM_CHART',
    sparkline: [1480, 1542, 1598, 1631, 1690, 1724, 1788, 1842],
  },
  {
    id: 'retencao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.RETENCAO_LABEL',
    value: '72,5%',
    delta: { glyph: '▼', text: '1,3pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.RETENCAO_CHART',
    sparkline: [76, 75, 75, 74, 74, 73, 73, 72],
  },
];
