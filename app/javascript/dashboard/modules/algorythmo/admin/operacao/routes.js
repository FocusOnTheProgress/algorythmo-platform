// algorythmo: M6.0 — Operação canonical sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import OperacaoDashboard from './OperacaoDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/operacao'),
      name: 'algorythmo_admin_operacao',
      meta: {
        permissions: ['administrator'],
      },
      component: OperacaoDashboard,
    },
  ],
};
