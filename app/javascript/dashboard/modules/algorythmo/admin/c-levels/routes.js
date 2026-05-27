// algorythmo: M5 placeholder route — C-Levels (Estratégia block)
import { frontendURL } from 'dashboard/helper/URLHelper';
import CLevelsPlaceholder from './CLevelsPlaceholder.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/c-levels'),
      name: 'algorythmo_admin_c_levels',
      meta: {
        permissions: ['administrator'],
      },
      component: CLevelsPlaceholder,
    },
  ],
};
