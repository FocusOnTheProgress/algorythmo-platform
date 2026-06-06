// algorythmo: PR7 — Copiloto (knowledge consultant) route.
//
// Founder decision (2026-06-06): the operator screen is pure stock Chatwoot, so
// the Copiloto is hidden from agents — removed from the operator rail AND locked
// admin-only at the route guard (no direct-URL access for agents/custom_role).
// The consultant stays in the codebase (and in the admin's NextSidebar); the
// founder will decide its permanent home later.
import { frontendURL } from 'dashboard/helper/URLHelper';
import CopilotScreen from '../../../modules/algorythmo/copilot/CopilotScreen.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/copilot'),
      name: 'algorythmo_copilot',
      meta: {
        permissions: ['administrator'],
      },
      component: CopilotScreen,
    },
  ],
};
