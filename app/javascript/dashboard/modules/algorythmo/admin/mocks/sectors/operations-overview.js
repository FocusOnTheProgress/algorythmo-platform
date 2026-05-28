// algorythmo: plan 0007 M2-e — Operations Overview aggregate (D2 + D12).
// The Overview is a dense data central: ONE anchor KPI + ONE mini sparkline per
// Operations sub-area, laid out in a responsive grid. Every card carries the
// "DADOS DE DEMONSTRAÇÃO" watermark (M6.0 / M6.1 contract) so no one mistakes
// the mock for a real source of truth.
//
// `id` matches the SectorShellV2 sub-tab id 1:1, so a card and its deep view
// share i18n + routing context. Values are pre-formatted pt-BR strings (same
// rule as ./marketing-overview.js). Numbers extrapolate the M6.0 Operação
// canonical (plan 0005 §9.1) for the same hypothetical PME (varejo/distribuição,
// ~R$10M/yr). Sparklines are short series — a glance, not a report.

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
    id: 'estoque',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ESTOQUE_LABEL',
    value: 'R$ 487.300',
    delta: { glyph: '▲', text: '+4,1%' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ESTOQUE_CHART',
    sparkline: [412, 425, 441, 458, 467, 472, 488, 487],
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.REPOSICAO_LABEL',
    value: '63',
    delta: { glyph: '▼', text: '8' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.REPOSICAO_CHART',
    sparkline: [82, 78, 74, 71, 69, 67, 65, 63],
  },
  {
    id: 'logistica',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.LOGISTICA_LABEL',
    value: '7,4%',
    delta: { glyph: '▼', text: '0,3pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.LOGISTICA_CHART',
    sparkline: [8.1, 8.0, 7.9, 7.8, 7.7, 7.6, 7.5, 7.4],
  },
  {
    id: 'organizacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ORGANIZACAO_LABEL',
    value: '96,2%',
    delta: { glyph: '▲', text: '+1,1pp' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ORGANIZACAO_CHART',
    sparkline: [93, 94, 94, 95, 95, 96, 96, 96],
  },
  {
    id: 'entrega',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ENTREGA_LABEL',
    value: '94,8%',
    delta: { glyph: '▲', text: '+0,6pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ENTREGA_CHART',
    sparkline: [92, 93, 93, 94, 94, 94, 95, 95],
  },
  {
    id: 'expedicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.EXPEDICAO_LABEL',
    value: '2,4h',
    delta: { glyph: '▼', text: '0,1h' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.EXPEDICAO_CHART',
    sparkline: [2.9, 2.8, 2.7, 2.6, 2.6, 2.5, 2.5, 2.4],
  },
];
