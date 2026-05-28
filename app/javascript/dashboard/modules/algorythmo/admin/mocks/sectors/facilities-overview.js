// algorythmo: plan 0007 M2-g — Facilities Overview aggregate (D2 + D12).
// The Overview is a dense data central for consolidated facility spend: ONE
// anchor KPI + ONE mini sparkline per spend area, laid out in a responsive
// grid. Every card carries the "DADOS DE DEMONSTRAÇÃO" watermark (M6.0 / M6.1
// contract) so no one mistakes the mock for a real source of truth.
//
// Unlike the other sectors, Facilities has no operational sub-tab per card —
// its single operational tab is Controle (live, client-side). These cards are
// a glance at where the money goes; values are pre-formatted pt-BR strings.

/**
 * @typedef {Object} OverviewCard
 * @property {string}                id          Spend-area slug.
 * @property {string}                labelKey    i18n key for the spend-area label.
 * @property {string}                value       Pre-formatted anchor value.
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}                chartTitleKey
 * @property {number[]}              sparkline   Short series for the mini chart.
 */

/** @type {OverviewCard[]} */
export default [
  {
    id: 'aluguel',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.ALUGUEL_LABEL',
    value: 'R$ 48,2 mil',
    delta: { glyph: '—', text: '0,0%' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.ALUGUEL_CHART',
    sparkline: [48.2, 48.2, 48.2, 48.2, 48.2, 48.2, 48.2, 48.2],
  },
  {
    id: 'energia',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.ENERGIA_LABEL',
    value: 'R$ 12,7 mil',
    delta: { glyph: '▲', text: '+8,4%' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.ENERGIA_CHART',
    sparkline: [10.1, 10.8, 11.2, 11.0, 11.6, 12.1, 12.4, 12.7],
  },
  {
    id: 'manutencao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.MANUTENCAO_LABEL',
    value: 'R$ 6,4 mil',
    delta: { glyph: '▼', text: '3,1%' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.MANUTENCAO_CHART',
    sparkline: [7.2, 7.0, 6.9, 6.8, 6.6, 6.6, 6.5, 6.4],
  },
  {
    id: 'limpeza',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.LIMPEZA_LABEL',
    value: 'R$ 3,9 mil',
    delta: { glyph: '—', text: '0,0%' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.LIMPEZA_CHART',
    sparkline: [3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9, 3.9],
  },
  {
    id: 'consolidado',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.CONSOLIDADO_LABEL',
    value: 'R$ 71,2 mil',
    delta: { glyph: '▲', text: '+2,1%' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.CONSOLIDADO_CHART',
    sparkline: [69.4, 69.9, 70.2, 70.0, 70.7, 70.9, 71.0, 71.2],
  },
];
