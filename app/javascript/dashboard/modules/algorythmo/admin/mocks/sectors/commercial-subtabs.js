// algorythmo: plan 0007 M2-c — Commercial sub-tab deep views.
// Each legacy Chatwoot report (Operations / Conversation / Agents / Teams /
// SLA / CSAT) becomes a SectorShellV2 sub-tab. The deep view is a focused mock
// (anchor + mini chart, watermarked) plus a link into the full upstream report,
// which is still routed and reachable. We do NOT embed the heavy report SFCs:
// they carry their own store + layout chrome and would bloat the shell.
//
// `routeName` maps to the live report route name (see reports.routes.js). The
// link is the bridge to the unabridged report until real KPIs land.

/**
 * @typedef {Object} SubtabDeepView
 * @property {string}   id          Sub-tab slug (matches SectorShellV2 tab id).
 * @property {string}   labelKey    i18n key for the sub-area label.
 * @property {string}   value       Pre-formatted anchor value.
 * @property {{glyph:'▲'|'▼'|'—',text:string}} delta
 * @property {string}   chartTitleKey
 * @property {string[]} chartLabels Same length as `chartData`.
 * @property {number[]} chartData
 * @property {string}   routeName   Live upstream report route to open in full.
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
    id: 'operations',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.OPERATIONS_LABEL',
    value: 'R$ 184.720',
    delta: { glyph: '▲', text: 'R$ 12.400 (+7,2%)' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.OPERATIONS_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [38, 42, 45, 41, 48, 52, 49, 54, 51, 56, 58, 62],
    routeName: 'account_overview_reports',
  },
  {
    id: 'conversation',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CONVERSATION_LABEL',
    value: '1.284',
    delta: { glyph: '▲', text: '112 (+9,5%)' },
    chartTitleKey:
      'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CONVERSATION_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [142, 158, 171, 165, 180, 176, 192, 188, 201, 196, 210, 218],
    routeName: 'conversation_reports',
  },
  {
    id: 'agents',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.AGENTS_LABEL',
    value: '2m 18s',
    delta: { glyph: '▼', text: '12s' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.AGENTS_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [165, 162, 158, 151, 154, 148, 142, 145, 139, 141, 138, 138],
    routeName: 'agent_reports_index',
  },
  {
    id: 'teams',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TEAMS_LABEL',
    value: '94,1%',
    delta: { glyph: '▲', text: '2,3pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TEAMS_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [88, 88, 89, 90, 91, 91, 92, 93, 93, 93, 94, 94],
    routeName: 'team_reports_index',
  },
  {
    id: 'sla',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.SLA_LABEL',
    value: '96,8%',
    delta: { glyph: '▲', text: '1,1pp' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.SLA_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [94, 94, 95, 95, 95, 96, 96, 96, 97, 97, 97, 97],
    routeName: 'sla_reports',
  },
  {
    id: 'csat',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CSAT_LABEL',
    value: '4,7 / 5',
    delta: { glyph: '▲', text: '0,2' },
    chartTitleKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.CSAT_CHART',
    chartLabels: WEEK_LABELS,
    chartData: [42, 43, 43, 44, 44, 45, 45, 46, 46, 46, 47, 47],
    routeName: 'csat_reports',
  },
];
