// algorythmo: Brain surface — ungated for single-tenant; route open to
// permitted roles. The `algorythmo_brain` feature flag was never registered as
// an enableable feature, which left the route permanently hidden. For this
// single-tenant founder instance the gate is removed so the Aurora knowledge
// hub is reachable; the `permissions` meta still scopes it to permitted roles.
import { frontendURL } from 'dashboard/helper/URLHelper';
import BrainViewer from '../../../modules/algorythmo/brain/BrainViewer.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/brain'),
      name: 'algorythmo_brain_viewer',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: BrainViewer,
    },
  ],
};
