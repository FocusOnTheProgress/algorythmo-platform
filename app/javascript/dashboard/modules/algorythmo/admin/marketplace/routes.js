// algorythmo: M5 placeholder route — Marketplace (Inteligência block)
import { frontendURL } from 'dashboard/helper/URLHelper';
import MarketplacePlaceholder from './MarketplacePlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/marketplace'),
      name: 'algorythmo_admin_marketplace',
      meta: {
        permissions: ['administrator'],
      },
      component: MarketplacePlaceholder,
    },
  ],
};
