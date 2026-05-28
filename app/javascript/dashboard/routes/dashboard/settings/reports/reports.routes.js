import { frontendURL } from '../../../../helper/URLHelper';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import store from 'dashboard/store';

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

// algorythmo: M6.1-b — exported for unit testing. Resolves the default Reports
// landing route based on the algorythmo_cut_reports_commercial flag (D13).
// Defaults to commercial_reports unless the cut-flag is explicitly enabled
// (=== true). NaN/missing accountId falls into the default — safe because the
// outer navigation guard (routes/index.js) already redirects unauthenticated
// or unscoped navigations before this resolver runs.
export const resolveDefaultReportsRedirect = (to, getterFactory = null) => {
  const isFeatureEnabledonAccount =
    getterFactory ?? store.getters['accounts/isFeatureEnabledonAccount'];
  const accountId = Number(to.params.accountId);
  const isCut =
    isFeatureEnabledonAccount(
      accountId,
      'algorythmo_cut_reports_commercial'
    ) === true;
  return {
    name: isCut ? 'account_overview_reports' : 'commercial_reports',
    params: to.params,
  };
};

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/reports'),
      component: ReportsWrapper,
      children: [
        // algorythmo: M6.1-b — dynamic redirect: admins land on Visão Comercial by
        // default (D13, plan 0006). See resolveDefaultReportsRedirect above.
        {
          path: '',
          redirect: to => resolveDefaultReportsRedirect(to),
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
