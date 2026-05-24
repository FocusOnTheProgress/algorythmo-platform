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
      path: frontendURL('accounts/:accountId/crm/pipeline'),
      name: 'algorythmo_crm_pipeline_config',
      meta: {
        permissions: ['administrator'],
        algorythmoFeatureFlag: 'algorythmo_crm',
      },
      component: PipelineConfigPlaceholder,
    },
  ],
};
