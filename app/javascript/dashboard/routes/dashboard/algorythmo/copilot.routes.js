// algorythmo: PR7 — Copiloto (operator knowledge consultant) route.
//
// The Copiloto is the OPERATOR's tool (Malu), not an admin surface. Unlike the
// Brain viewer — which is curated by admins — this read-only Q&A consultant is
// open to the same permitted roles that can read the Brain: administrator,
// agent, and custom_role. The menu entry is intentionally NOT gated by isAdmin
// (see Sidebar.vue) so agents get the consultant Day-1.
import { frontendURL } from 'dashboard/helper/URLHelper';
import CopilotScreen from '../../../modules/algorythmo/copilot/CopilotScreen.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/copilot'),
      name: 'algorythmo_copilot',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: CopilotScreen,
    },
  ],
};
