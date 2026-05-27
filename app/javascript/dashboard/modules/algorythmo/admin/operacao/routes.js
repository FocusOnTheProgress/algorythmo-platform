// algorythmo: M5 placeholder route — Operação sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import OperacaoPlaceholder from './OperacaoPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/operacao'),
      name: 'algorythmo_admin_operacao',
      meta: {
        permissions: ['administrator'],
      },
      component: OperacaoPlaceholder,
    },
  ],
};
