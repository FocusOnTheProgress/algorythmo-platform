import { FEATURE_FLAGS } from '../../../../featureFlags';
import Bot from './Index.vue';
import { frontendURL } from '../../../../helper/URLHelper';
import SettingsWrapper from '../SettingsWrapper.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId/settings/agent-bots'),
      meta: {
        permissions: ['administrator'],
      },
      component: SettingsWrapper,
      children: [
        {
          path: '',
          name: 'agent_bots',
          component: Bot,
          meta: {
            featureFlag: FEATURE_FLAGS.AGENT_BOTS,
            permissions: ['administrator'],
            // algorythmo: feature-gate algorythmo_cut_agent_bots
            algorythmoCutFlag: 'algorythmo_cut_agent_bots',
          },
        },
      ],
    },
  ],
};
