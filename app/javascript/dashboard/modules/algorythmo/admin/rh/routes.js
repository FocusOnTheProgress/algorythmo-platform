// algorythmo: M5 placeholder route — RH sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import RhPlaceholder from './RhPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/rh'),
      name: 'algorythmo_admin_rh',
      meta: {
        permissions: ['administrator'],
      },
      component: RhPlaceholder,
    },
  ],
};
