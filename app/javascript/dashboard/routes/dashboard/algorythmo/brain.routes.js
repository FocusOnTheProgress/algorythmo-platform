// algorythmo: feature-gate algorythmo_brain
// Route definitions for the Algorythmo Brain surface. Route is registered
// unconditionally so deep-links resolve once the flag flips on; the sidebar
// entry and route guard control actual visibility.
import { frontendURL } from 'dashboard/helper/URLHelper';
import BrainViewer from '../../../modules/algorythmo/brain/BrainViewer.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/brain'),
      name: 'algorythmo_brain_viewer',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
        algorythmoFeatureFlag: 'algorythmo_brain',
      },
      component: BrainViewer,
    },
  ],
};
