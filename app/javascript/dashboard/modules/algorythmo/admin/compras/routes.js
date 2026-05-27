// algorythmo: M6.2 Compras — derived sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import ComprasDashboard from './ComprasDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/compras'),
      name: 'algorythmo_admin_compras',
      meta: {
        permissions: ['administrator'],
      },
      component: ComprasDashboard,
    },
  ],
};
