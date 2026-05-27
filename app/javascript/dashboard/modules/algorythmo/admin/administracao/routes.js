// algorythmo: M6.3 Administração — derived sector dashboard route.
import { frontendURL } from 'dashboard/helper/URLHelper';
import AdministracaoDashboard from './AdministracaoDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/administracao'),
      name: 'algorythmo_admin_administracao',
      meta: {
        permissions: ['administrator'],
      },
      component: AdministracaoDashboard,
    },
  ],
};
