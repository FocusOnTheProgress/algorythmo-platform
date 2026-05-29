import { frontendURL } from '../../../../helper/URLHelper';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { defaultReportsBeforeEnter } from './reports.redirect';

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

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/reports'),
      component: ReportsWrapper,
      children: [
        // algorythmo: M6.1-b — dynamic redirect via beforeEnter. Vue Router 4
        // awaits beforeEnter (NOT the `redirect:` option), so the guard can
        // hydrate accounts/get before reading the cut-flag. The guard skips
        // the dispatch when state is already known, which leaves the warm-nav
        // path single-fetch. See ./reports.redirect.js for the contract.
        {
          path: '',
          name: 'reports_default_redirect',
          beforeEnter: defaultReportsBeforeEnter,
          component: { render: () => null },
        },
        // algorythmo: Relatórios Comerciais overlay (first child = default target).
        // Composition lives in CommercialShell via ReportsCommercialOverlay (plan 0007 M2-c).
        //
        // The route-level `algorythmoCutFlag` was REMOVED: the cut flag is
        // stored only in the `algorythmo_feature_flags` bigint column (never
        // registered in config/features.yml), so on a tenant whose account
        // payload doesn't hydrate `algorythmo_cut_flags` the getter returns
        // `undefined` and the fail-closed route guard (`cutEnabled !== false`)
        // blocked the route — bouncing /reports/commercial to /dashboard and
        // making the Commercial reports surface (and its Customer Support tab)
        // unreachable. The Commercial section must always land on CommercialShell
        // for admins. The cut is still honoured where it matters operationally:
        // the SIDEBAR entry is gated by `algorythmoCutHidden.reports_commercial`,
        // and the raw Bot/Labels/Inbox report tabs are cut separately. Same
        // philosophy as ungating Brain + the CRM demo board.
        {
          path: 'commercial',
          name: 'commercial_reports',
          meta,
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
