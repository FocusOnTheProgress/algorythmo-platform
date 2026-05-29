// algorythmo: plan 0007 M2-f — Finance Overview aggregate (D2 + D12).
// The Overview is a dense data central: ONE anchor KPI + ONE mini sparkline per
// Finance sub-area, laid out in a responsive grid. Every card carries the
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
    id: 'a_pagar',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_PAGAR_LABEL',
    value: 'R$ 387.500',
    delta: { glyph: '▲', text: '+R$ 18.400' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_PAGAR_CHART',
    sparkline: [352, 361, 358, 370, 374, 379, 384, 388],
  },
  {
    id: 'a_receber',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_RECEBER_LABEL',
    value: 'R$ 612.400',
    delta: { glyph: '▲', text: '+R$ 29.800' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_RECEBER_CHART',
    sparkline: [548, 562, 571, 583, 590, 598, 605, 612],
  },
  {
    id: 'fluxo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.FLUXO_LABEL',
    value: 'R$ 1.247.300',
    delta: { glyph: '▲', text: '+7,2%' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.FLUXO_CHART',
    sparkline: [1080, 1112, 1140, 1178, 1195, 1218, 1235, 1247],
  },
  {
    id: 'margem',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.MARGEM_LABEL',
    value: '18,7%',
    delta: { glyph: '▲', text: '+0,6pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.MARGEM_CHART',
    sparkline: [17.4, 17.6, 17.9, 18.1, 18.2, 18.4, 18.6, 18.7],
  },
  {
    id: 'lucro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.LUCRO_LABEL',
    value: 'R$ 233.100',
    delta: { glyph: '▲', text: '+R$ 12.700' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.LUCRO_CHART',
    sparkline: [198, 205, 211, 218, 222, 226, 230, 233],
  },
  {
    id: 'planejamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.PLANEJAMENTO_LABEL',
    value: '94,2%',
    delta: { glyph: '▼', text: '1,1pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.PLANEJAMENTO_CHART',
    sparkline: [97, 96, 96, 95, 95, 95, 94, 94],
  },
];
