// algorythmo: M5 placeholder route — Compras sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import ComprasPlaceholder from './ComprasPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/compras'),
      name: 'algorythmo_admin_compras',
      meta: {
        permissions: ['administrator'],
      },
      component: ComprasPlaceholder,
    },
  ],
};
