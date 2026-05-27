// algorythmo: M6.6 Marketing — derived sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import MarketingDashboard from './MarketingDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/marketing'),
      name: 'algorythmo_admin_marketing',
      meta: {
        permissions: ['administrator'],
      },
      component: MarketingDashboard,
    },
  ],
};
