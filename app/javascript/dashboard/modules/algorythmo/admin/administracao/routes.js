// algorythmo: M5 placeholder route — Administração sector
import { frontendURL } from 'dashboard/helper/URLHelper';
import AdministracaoPlaceholder from './AdministracaoPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/administracao'),
      name: 'algorythmo_admin_administracao',
      meta: {
        permissions: ['administrator'],
      },
      component: AdministracaoPlaceholder,
    },
  ],
};
