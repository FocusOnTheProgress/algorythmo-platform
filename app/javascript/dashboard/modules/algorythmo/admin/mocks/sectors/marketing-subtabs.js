// algorythmo: plan 0007 M2-d — Marketing sub-tab deep views.
// Each Marketing sub-area becomes a SectorShellV2 sub-tab. The deep view is a
// focused mock (anchor + 12-week chart, watermarked) — a glance into the metric
// until real KPIs land. Campanhas is intentionally ABSENT here: it is not a
// mocked deep view but a live composition of the upstream campaign routes
// (see MarketingCampaignsPane.vue + marketing-campaigns.js, D8).
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
    id: 'branding',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.BRANDING_LABEL',
    value: '38,4%',
    delta: { glyph: '▲', text: '2,1pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.BRANDING_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [31, 32, 33, 34, 33, 35, 35, 36, 37, 37, 38, 38],
  },
  {
    id: 'redes_sociais',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.REDES_SOCIAIS_LABEL',
    value: '6,1%',
    delta: { glyph: '▲', text: '0,4pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.REDES_SOCIAIS_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [48, 50, 51, 49, 53, 54, 56, 55, 57, 59, 60, 61],
  },
  {
    id: 'trafego',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TRAFEGO_LABEL',
    value: '2,8%',
    delta: { glyph: '▲', text: '0,2pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TRAFEGO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [22, 23, 24, 23, 25, 25, 26, 26, 25, 27, 27, 28],
  },
  {
    id: 'crm',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CRM_LABEL',
    value: '1.842',
    delta: { glyph: '▲', text: '124 (+7,2%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CRM_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [
      1480, 1525, 1542, 1598, 1631, 1660, 1690, 1724, 1755, 1788, 1810, 1842,
    ],
  },
  {
    id: 'retencao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.RETENCAO_LABEL',
    value: '72,5%',
    delta: { glyph: '▼', text: '1,3pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.RETENCAO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [76, 76, 75, 75, 74, 74, 74, 73, 73, 73, 72, 72],
  },
];
