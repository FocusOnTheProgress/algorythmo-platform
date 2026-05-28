import { frontendURL } from '../../../../helper/URLHelper';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { defaultReportsRedirectHandler } from './reports.redirect';

import ReportsWrapper from './components/ReportsWrapper.vue';
import Index from './Index.vue';

import AgentReportsIndex from './AgentReportsIndex.vue';
import InboxReportsIndex from './InboxReportsIndex.vue';
import TeamReportsIndex from './TeamReportsIndex.vue';
import LabelReportsIndex from './LabelReportsIndex.vue';

import AgentReportsShow from './AgentReportsShow.vue';
import InboxReportsShow from './InboxReportsShow.vue';
import TeamReportsShow from './TeamReportsShow.vue';
import LabelReportsShow from './LabelReportsShow.vue';

import AgentReports from './AgentReports.vue';
import InboxReports from './InboxReports.vue';
import LabelReports from './LabelReports.vue';
import TeamReports from './TeamReports.vue';

import CsatResponses from './CsatResponses.vue';
import BotReports from './BotReports.vue';
import LiveReports from './LiveReports.vue';
import SLAReports from './SLAReports.vue';

// algorythmo: M6.1-b — real overlay component; replaces the M6.1-a stub.
const ReportsCommercialOverlay = () =>
  import(
    'dashboard/modules/algorythmo/admin/reports-commercial/ReportsCommercialOverlay.vue'
  );

const meta = {
  featureFlag: FEATURE_FLAGS.REPORTS,
  permissions: ['administrator', 'report_manage'],
};

const oldReportRoutes = [
  {
    path: 'agent',
    name: 'agent_reports',
    meta,
    component: AgentReports,
  },
  {
    path: 'inboxes',
    name: 'inbox_reports',
    meta,
    component: InboxReports,
  },
  {
    path: 'label',
    name: 'label_reports',
    meta,
    component: LabelReports,
  },
  {
    path: 'teams',
    name: 'team_reports',
    meta,
    component: TeamReports,
  },
];

const revisedReportRoutes = [
  {
    path: 'agents_overview',
    name: 'agent_reports_index',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: AgentReportsIndex,
  },
  {
    path: 'agents/:id',
    name: 'agent_reports_show',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: AgentReportsShow,
  },

  {
    path: 'inboxes_overview',
    name: 'inbox_reports_index',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: InboxReportsIndex,
  },
  {
    path: 'inboxes/:id',
    name: 'inbox_reports_show',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: InboxReportsShow,
  },
  {
    path: 'teams_overview',
    name: 'team_reports_index',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: TeamReportsIndex,
  },
  {
    path: 'teams/:id',
    name: 'team_reports_show',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: TeamReportsShow,
  },
  {
    path: 'labels_overview',
    name: 'label_reports_index',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: LabelReportsIndex,
  },
  {
    path: 'labels/:id',
    name: 'label_reports_show',
    meta: {
      permissions: ['administrator', 'report_manage'],
    },
    component: LabelReportsShow,
  },
];

// algorythmo: M6.1-b — re-exported for backwards compatibility with the static
// spec scan. Real definition lives in ./reports.redirect.js (small, store-only
// module so unit tests don't pull the full route graph / amplitude / tslib).
export { resolveDefaultReportsRedirect } from './reports.redirect';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/reports'),
      component: ReportsWrapper,
      children: [
        // algorythmo: M6.1-b — dynamic redirect: admins land on Visão Comercial by
        // default (D13, plan 0006). Async to await accounts/get before reading the
        // cut-flag — without the await, a cut user reloading /reports gets bounced
        // to /dashboard because the resolver runs before the global guard's
        // accounts/get await (see ./reports.redirect.js).
        {
          path: '',
          redirect: defaultReportsRedirectHandler,
        },
        // algorythmo: M6.1-b — Relatórios Comerciais overlay (first child = default target).
        // Placeholder shell; real composition (SectorDashboard + mock) arrives in M6.1-c.
        {
          path: 'commercial',
          name: 'commercial_reports',
          meta: {
            ...meta,
            // algorythmo: feature-gate algorythmo_cut_reports_commercial
            algorythmoCutFlag: 'algorythmo_cut_reports_commercial',
          },
          component: ReportsCommercialOverlay,
        },
        {
          path: 'overview',
          name: 'account_overview_reports',
          meta,
          component: LiveReports,
        },
        {
          path: 'conversation',
          name: 'conversation_reports',
          meta,
          component: Index,
        },
        ...oldReportRoutes,
        ...revisedReportRoutes,
        {
          path: 'sla',
          name: 'sla_reports',
          meta,
          component: SLAReports,
        },
        {
          path: 'csat',
          name: 'csat_reports',
          meta,
          component: CsatResponses,
        },
        {
          path: 'bot',
          name: 'bot_reports',
          meta: {
            ...meta,
            // algorythmo: feature-gate algorythmo_cut_reports_bot
            algorythmoCutFlag: 'algorythmo_cut_reports_bot',
          },
          component: BotReports,
        },
      ],
    },
  ],
};
