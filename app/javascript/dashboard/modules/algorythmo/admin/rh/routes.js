// algorythmo: M6.5 RH — derived sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import RhDashboard from './RhDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/rh'),
      name: 'algorythmo_admin_rh',
      meta: {
        permissions: ['administrator'],
      },
      component: RhDashboard,
    },
  ],
};
