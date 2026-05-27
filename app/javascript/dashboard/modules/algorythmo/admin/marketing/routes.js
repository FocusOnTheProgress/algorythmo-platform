// algorythmo: M5 placeholder route — Marketing sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import MarketingPlaceholder from './MarketingPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/marketing'),
      name: 'algorythmo_admin_marketing',
      meta: {
        permissions: ['administrator'],
      },
      component: MarketingPlaceholder,
    },
  ],
};
