// algorythmo: feature-gate algorythmo_crm
// Route definitions for the Algorythmo CRM Kanban surface. The enable check
// lives on the sidebar entry and on the route guard at dashboard.routes.js —
// the route itself is registered unconditionally so deep-links from email,
// docs, and bookmarks still resolve to the kanban view once the flag flips on.
import { frontendURL } from 'dashboard/helper/URLHelper';
import KanbanBoard from './views/KanbanBoard.vue';
import PipelineConfigPlaceholder from './views/PipelineConfigPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/crm'),
      name: 'algorythmo_crm_kanban',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
        algorythmoFeatureFlag: 'algorythmo_crm',
      },
      component: KanbanBoard,
    },
    {
      // Stub — real PipelineConfigView ships in B-PR6 (Sessão C).
      // Registered now so the "Configurar pipeline" link doesn't 404.
      //
      // Permissions intentionally match the Kanban view: the link sits on the
      // Kanban header for every role that can see the board, so a narrower
      // permission set would cause a silent guard-redirect for non-admins and
      // the founder's "why did clicking that link do nothing" report. The real
      // config view (B-PR6) will lock writes admin-only at the form layer; the
      // placeholder is "em breve" copy and has no security surface.
      path: frontendURL('accounts/:accountId/crm/pipeline'),
      name: 'algorythmo_crm_pipeline_config',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
        algorythmoFeatureFlag: 'algorythmo_crm',
      },
      component: PipelineConfigPlaceholder,
    },
  ],
};
