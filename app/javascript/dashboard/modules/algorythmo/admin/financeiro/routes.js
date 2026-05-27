// algorythmo: M5 placeholder route — Financeiro sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import FinanceiroPlaceholder from './FinanceiroPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/financeiro'),
      name: 'algorythmo_admin_financeiro',
      meta: {
        permissions: ['administrator'],
      },
      component: FinanceiroPlaceholder,
    },
  ],
};
