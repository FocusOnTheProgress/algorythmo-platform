// algorythmo: plan 0007 M2-e — Operations sub-tab deep views.
// Each Operations sub-area becomes a SectorShellV2 sub-tab. The deep view is a
// focused mock (anchor + 12-week chart, watermarked) — a glance into the metric
// until real KPIs land. Unlike Commercial/Marketing-Campanhas, NONE of these
// sub-tabs deep-link into a live upstream route; they are pure mocks (D1 note:
// "Nenhuma dessas sub-abas tem rota Chatwoot viva").
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
    id: 'estoque',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ESTOQUE_LABEL',
    value: 'R$ 487.300',
    delta: { glyph: '▲', text: '19.100 (+4,1%)' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ESTOQUE_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [412, 398, 425, 441, 423, 458, 467, 449, 472, 488, 475, 487],
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.REPOSICAO_LABEL',
    value: '63',
    delta: { glyph: '▼', text: '8' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.REPOSICAO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [88, 85, 82, 79, 78, 76, 74, 73, 71, 69, 66, 63],
  },
  {
    id: 'logistica',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.LOGISTICA_LABEL',
    value: '7,4%',
    delta: { glyph: '▼', text: '0,3pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.LOGISTICA_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [8.2, 8.1, 8.1, 8.0, 7.9, 7.9, 7.8, 7.7, 7.7, 7.6, 7.5, 7.4],
  },
  {
    id: 'organizacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ORGANIZACAO_LABEL',
    value: '96,2%',
    delta: { glyph: '▲', text: '1,1pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ORGANIZACAO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [93, 93, 94, 94, 94, 95, 95, 95, 96, 96, 96, 96],
  },
  {
    id: 'entrega',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ENTREGA_LABEL',
    value: '94,8%',
    delta: { glyph: '▲', text: '0,6pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ENTREGA_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [92, 92, 93, 93, 93, 94, 94, 94, 94, 95, 95, 95],
  },
  {
    id: 'expedicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.EXPEDICAO_LABEL',
    value: '2,4h',
    delta: { glyph: '▼', text: '0,1h' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.EXPEDICAO_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [2.9, 2.9, 2.8, 2.8, 2.7, 2.7, 2.6, 2.6, 2.5, 2.5, 2.5, 2.4],
  },
];
