// algorythmo: Stream D — "Início" route (the default landing surface).
//
// Any logged-in user lands here first (administrator / agent / custom_role) —
// Início is the universal welcome, not an admin-only sector. The default-landing
// wiring lives in helper/routeHelpers.js (defaultRedirectPage → 'inicio').
import { frontendURL } from 'dashboard/helper/URLHelper';
import InicioScreen from './InicioScreen.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/inicio'),
      name: 'algorythmo_admin_inicio',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: InicioScreen,
    },
  ],
};
