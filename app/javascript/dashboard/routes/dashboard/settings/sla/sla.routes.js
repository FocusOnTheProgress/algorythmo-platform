import { FEATURE_FLAGS } from '../../../../featureFlags';
import { INSTALLATION_TYPES } from 'dashboard/constants/installationTypes';
import { frontendURL } from '../../../../helper/URLHelper';

import SettingsWrapper from '../SettingsWrapper.vue';
import Index from './Index.vue';

// algorythmo: feature-gate algorythmo_cut_sla
// Cut flag (inverted semantic): when enabled, SLA management redirects to
// the dashboard. Default disabled — upstream SLA settings remain available.
const meta = {
  featureFlag: FEATURE_FLAGS.SLA,
  permissions: ['administrator'],
  installationTypes: [INSTALLATION_TYPES.CLOUD, INSTALLATION_TYPES.ENTERPRISE],
  algorythmoCutFlag: 'algorythmo_cut_sla',
};

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/sla'),
      component: SettingsWrapper,
      props: {},
      children: [
        {
          path: '',
          name: 'sla_wrapper',
          meta,
          redirect: to => {
            return { name: 'sla_list', params: to.params };
          },
        },
        {
          path: 'list',
          name: 'sla_list',
          meta,
          component: Index,
        },
      ],
    },
  ],
};
