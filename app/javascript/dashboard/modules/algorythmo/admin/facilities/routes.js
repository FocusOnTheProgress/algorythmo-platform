// algorythmo: plan 0007 M2-g — Facilities sector route (new sector, D9).
import { frontendURL } from 'dashboard/helper/URLHelper';
import FacilitiesDashboard from './FacilitiesDashboard.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/facilities'),
      name: 'algorythmo_admin_facilities',
      meta: {
        permissions: ['administrator'],
      },
      component: FacilitiesDashboard,
    },
  ],
};
