// algorythmo: plan 0007 M2-f — Finance sub-tab deep views.
// Each Finance sub-area becomes a SectorShellV2 sub-tab. The deep view is a
// focused mock (anchor + 12-week chart, watermarked) — a glance into the metric
// until real KPIs land when the founder unblocks the backend.
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
    id: 'a_pagar',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_PAGAR_LABEL',
    value: 'R$ 387.500',
    delta: { glyph: '▲', text: 'R$ 18.400 (+5,0%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_PAGAR_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [352, 356, 361, 358, 365, 370, 372, 374, 378, 379, 384, 388],
  },
  {
    id: 'a_receber',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_RECEBER_LABEL',
    value: 'R$ 612.400',
    delta: { glyph: '▲', text: 'R$ 29.800 (+5,1%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_RECEBER_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [548, 555, 562, 571, 576, 583, 588, 590, 597, 598, 605, 612],
  },
  {
    id: 'fluxo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.FLUXO_LABEL',
    value: 'R$ 1.247.300',
    delta: { glyph: '▲', text: 'R$ 84.200 (+7,2%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.FLUXO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [
      1080, 1112, 1098, 1125, 1162, 1140, 1178, 1195, 1218, 1224, 1235, 1247,
    ],
  },
  {
    id: 'margem',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.MARGEM_LABEL',
    value: '18,7%',
    delta: { glyph: '▲', text: '0,6pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.MARGEM_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [
      17.4, 17.5, 17.6, 17.8, 17.9, 18.0, 18.1, 18.2, 18.4, 18.5, 18.6, 18.7,
    ],
  },
  {
    id: 'lucro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.LUCRO_LABEL',
    value: 'R$ 233.100',
    delta: { glyph: '▲', text: 'R$ 12.700 (+5,8%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.LUCRO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [198, 202, 205, 208, 211, 215, 218, 220, 222, 226, 230, 233],
  },
  {
    id: 'planejamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.PLANEJAMENTO_LABEL',
    value: '94,2%',
    delta: { glyph: '▼', text: '1,1pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.PLANEJAMENTO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [97, 97, 96, 96, 95, 95, 95, 95, 94, 94, 94, 94],
  },
];
