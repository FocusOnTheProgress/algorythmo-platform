import settings from './settings/settings.routes';
import conversation from './conversation/conversation.routes';
import { routes as searchRoutes } from '../../modules/search/search.routes';
import { routes as contactRoutes } from './contacts/routes';
import { routes as companyRoutes } from './companies/routes';
import { routes as notificationRoutes } from './notifications/routes';
import { routes as inboxRoutes } from './inbox/routes';
import { frontendURL } from '../../helper/URLHelper';
import helpcenterRoutes from './helpcenter/helpcenter.routes';
import campaignsRoutes from './campaigns/campaigns.routes';
import { routes as captainRoutes } from './captain/captain.routes';
import algorythmoCrmRoutes from './crm/crm.routes';
import algorythmoBrainRoutes from './algorythmo/brain.routes';
// algorythmo: M5 admin OS placeholder routes
import algorythmoAdminOperacaoRoutes from '../../modules/algorythmo/admin/operacao/routes';
import algorythmoAdminComprasRoutes from '../../modules/algorythmo/admin/compras/routes';
import algorythmoAdminAdministracaoRoutes from '../../modules/algorythmo/admin/administracao/routes';
import algorythmoAdminFinanceiroRoutes from '../../modules/algorythmo/admin/financeiro/routes';
import algorythmoAdminRhRoutes from '../../modules/algorythmo/admin/rh/routes';
import algorythmoAdminMarketingRoutes from '../../modules/algorythmo/admin/marketing/routes';
// algorythmo: M2-g — Facilities sector (new)
import algorythmoAdminFacilitiesRoutes from '../../modules/algorythmo/admin/facilities/routes';
import algorythmoAdminCLevelsRoutes from '../../modules/algorythmo/admin/c-levels/routes';
import algorythmoAdminMarketplaceRoutes from '../../modules/algorythmo/admin/marketplace/routes';
import AppContainer from './Dashboard.vue';
import Suspended from './suspended/Index.vue';
import NoAccounts from './noAccounts/Index.vue';
import OnboardingAccountDetails from './onboarding/Index.vue';

export default {
  routes: [
    {
      path: frontendURL('accounts/:accountId'),
      component: AppContainer,
      children: [
        ...captainRoutes,
        ...inboxRoutes,
        ...conversation.routes,
        ...settings.routes,
        ...contactRoutes,
        ...companyRoutes,
        ...searchRoutes,
        ...notificationRoutes,
        ...helpcenterRoutes.routes,
        ...campaignsRoutes.routes,
        ...algorythmoCrmRoutes.routes,
        ...algorythmoBrainRoutes.routes,
        // algorythmo: M5 admin OS placeholder routes
        ...algorythmoAdminOperacaoRoutes.routes,
        ...algorythmoAdminComprasRoutes.routes,
        ...algorythmoAdminAdministracaoRoutes.routes,
        ...algorythmoAdminFinanceiroRoutes.routes,
        ...algorythmoAdminRhRoutes.routes,
        ...algorythmoAdminMarketingRoutes.routes,
        ...algorythmoAdminFacilitiesRoutes.routes,
        ...algorythmoAdminCLevelsRoutes.routes,
        ...algorythmoAdminMarketplaceRoutes.routes,
      ],
    },
    {
      path: frontendURL('accounts/:accountId/onboarding'),
      name: 'onboarding_account_details',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: OnboardingAccountDetails,
    },
    {
      path: frontendURL('accounts/:accountId/suspended'),
      name: 'account_suspended',
      meta: {
        permissions: ['administrator', 'agent', 'custom_role'],
      },
      component: Suspended,
    },
    {
      path: frontendURL('no-accounts'),
      name: 'no_accounts',
      component: NoAccounts,
    },
  ],
};
