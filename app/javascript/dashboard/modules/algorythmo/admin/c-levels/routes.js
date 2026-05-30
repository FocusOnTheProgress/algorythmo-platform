// algorythmo: Stream E route — C-Levels "Sala de Conselho IA" (Estratégia block)
import { frontendURL } from 'dashboard/helper/URLHelper';
import CLevelsBoardroom from './CLevelsBoardroom.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/c-levels'),
      name: 'algorythmo_admin_c_levels',
      meta: {
        permissions: ['administrator'],
      },
      component: CLevelsBoardroom,
    },
  ],
};
