// algorythmo: M6.4 Financeiro — derived sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import FinanceiroDashboard from './FinanceiroDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/financeiro'),
      name: 'algorythmo_admin_financeiro',
      meta: {
        permissions: ['administrator'],
      },
      component: FinanceiroDashboard,
    },
  ],
};
