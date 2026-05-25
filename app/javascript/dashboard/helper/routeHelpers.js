import {
  hasPermissions,
  getUserPermissions,
  getCurrentAccount,
} from './permissionsHelper';

import {
  ROLES,
  CONVERSATION_PERMISSIONS,
  CONTACT_PERMISSIONS,
  REPORTS_PERMISSIONS,
  PORTAL_PERMISSIONS,
} from 'dashboard/constants/permissions.js';
// algorythmo: feature-gate algorythmo_cut_*
import { isKnownAlgorythmoCutFlag } from 'dashboard/constants/algorythmoCutFlags';
// algorythmo: feature-gate enable flags (Captain, CRM)
import { isKnownAlgorythmoFeatureFlag } from 'dashboard/constants/algorythmoFeatureFlags';

// Modules that have already logged an "unknown cut flag" warning, so we don't
// spam the dev console on every navigation. Cleared by tests via the
// `resetAlgorythmoFlagWarningsForTests` helper exported below.
const warnedAlgorythmoCutFlags = new Set();
const warnedAlgorythmoFeatureFlags = new Set();
export const resetAlgorythmoFlagWarningsForTests = () => {
  warnedAlgorythmoCutFlags.clear();
  warnedAlgorythmoFeatureFlags.clear();
};

export const routeIsAccessibleFor = (route, userPermissions = []) => {
  const { meta: { permissions: routePermissions = [] } = {} } = route;
  return hasPermissions(routePermissions, userPermissions);
};

export const defaultRedirectPage = (to, permissions) => {
  const { accountId } = to.params;

  const permissionRoutes = [
    {
      permissions: [...ROLES, ...CONVERSATION_PERMISSIONS],
      path: 'dashboard',
    },
    { permissions: [CONTACT_PERMISSIONS], path: 'contacts' },
    { permissions: [REPORTS_PERMISSIONS], path: 'reports/overview' },
    { permissions: [PORTAL_PERMISSIONS], path: 'portals' },
  ];

  const route = permissionRoutes.find(({ permissions: routePermissions }) =>
    hasPermissions(routePermissions, permissions)
  );

  return `accounts/${accountId}/${route ? route.path : 'dashboard'}`;
};

const validateActiveAccountRoutes = (to, user) => {
  // If the current account is active, then check for the route permissions
  const accountDashboardURL = `accounts/${to.params.accountId}/dashboard`;

  // If the user is trying to access suspended route, redirect them to dashboard
  if (to.name === 'account_suspended') {
    return accountDashboardURL;
  }

  const userPermissions = getUserPermissions(user, to.params.accountId);

  const isAccessible = routeIsAccessibleFor(to, userPermissions);
  // If the route is not accessible for the user, return to dashboard screen
  return isAccessible ? null : defaultRedirectPage(to, userPermissions);
};

export const validateLoggedInRoutes = (to, user) => {
  const currentAccount = getCurrentAccount(user, Number(to.params.accountId));
  // If current account is missing, either user does not have
  // access to the account or the account is deleted, return to login screen
  if (!currentAccount) {
    return `app/login`;
  }

  const isCurrentAccountActive = currentAccount.status === 'active';

  if (isCurrentAccountActive) {
    return validateActiveAccountRoutes(to, user);
  }

  // If the current account is not active, then redirect the user to the suspended screen
  if (to.name !== 'account_suspended') {
    return `accounts/${to.params.accountId}/suspended`;
  }

  // Proceed to the route if none of the above conditions are met
  return null;
};

export const isAConversationRoute = (
  routeName,
  includeBase = false,
  includeExtended = true
) => {
  const baseRoutes = [
    'home',
    'conversation_mentions',
    'conversation_unattended',
    'inbox_dashboard',
    'label_conversations',
    'team_conversations',
    'folder_conversations',
    'conversation_participating',
  ];
  const extendedRoutes = [
    'inbox_conversation',
    'conversation_through_mentions',
    'conversation_through_unattended',
    'conversation_through_inbox',
    'conversations_through_label',
    'conversations_through_team',
    'conversations_through_folders',
    'conversation_through_participating',
  ];

  const routes = [
    ...(includeBase ? baseRoutes : []),
    ...(includeExtended ? extendedRoutes : []),
  ];

  return routes.includes(routeName);
};

export const getConversationDashboardRoute = routeName => {
  switch (routeName) {
    case 'inbox_conversation':
      return 'home';
    case 'conversation_through_mentions':
      return 'conversation_mentions';
    case 'conversation_through_unattended':
      return 'conversation_unattended';
    case 'conversations_through_label':
      return 'label_conversations';
    case 'conversations_through_team':
      return 'team_conversations';
    case 'conversations_through_folders':
      return 'folder_conversations';
    case 'conversation_through_participating':
      return 'conversation_participating';
    case 'conversation_through_inbox':
      return 'inbox_dashboard';
    default:
      return null;
  }
};

export const isAInboxViewRoute = (routeName, includeBase = false) => {
  const baseRoutes = ['inbox_view'];
  const extendedRoutes = ['inbox_view_conversation'];
  const routeNames = includeBase
    ? [...baseRoutes, ...extendedRoutes]
    : extendedRoutes;
  return routeNames.includes(routeName);
};

export const isNotificationRoute = routeName =>
  routeName === 'notifications_index';

// algorythmo: feature-gate algorythmo_show_captain
// algorythmo: feature-gate algorythmo_cut_*
/**
 * Checks whether a route is blocked by an Algorythmo OS feature gate.
 *
 * Two gate semantics are supported via separate meta keys:
 *
 * - `meta.algorythmoFeatureFlag` (opt-in / enable flag):
 *   route is blocked when the flag is FALSE. Used by Captain and the future CRM,
 *   where the surface is hidden by default and must be turned on explicitly.
 *   Fail-closed: any error treats the flag as disabled (route blocked), so a
 *   broken store cannot leak gated UI.
 *
 * - `meta.algorythmoCutFlag` (cut flag, inverted semantic):
 *   route is blocked when the flag is TRUE. Used by the 13 M2 cut surfaces
 *   (campaigns, help center, sla, audit logs, etc.) where the upstream surface
 *   exists by default and the operator enables the cut to hide it for PME tenants.
 *   Fail-closed: any error or unknown flag state treats the cut as active (route
 *   blocked). Cuts back the D5 promise that the PME tenant never sees Chatwoot
 *   surfaces — a transient store error must not leak the cut surface, even briefly.
 *   The only allow path is an explicit boolean `false` on the cut flag.
 *
 * If both meta keys are present, `algorythmoFeatureFlag` is evaluated first.
 *
 * @param {Object} to - Vue Router destination route object
 * @param {Function} isFeatureEnabledonAccount - Vuex getter: (accountId, flagName) => boolean
 * @param {number} accountId - Current account ID
 * @returns {boolean} true if the route is blocked by an Algorythmo feature gate
 */
export const isRouteBlockedByAlgorythmoGate = (
  to,
  isFeatureEnabledonAccount,
  accountId
) => {
  const meta = to?.meta || {};
  const enableFlag = meta.algorythmoFeatureFlag;
  const cutFlag = meta.algorythmoCutFlag;

  if (enableFlag) {
    // Unknown enable flag (typo, removed key, drift): always block. Mirrors the
    // cut-flag guard below so route authors get the same loud-dev / silent-prod
    // signal for typos in `meta.algorythmoFeatureFlag` (Captain, CRM) as they
    // already do for `meta.algorythmoCutFlag`.
    if (!isKnownAlgorythmoFeatureFlag(enableFlag)) {
      if (
        process.env.NODE_ENV !== 'production' &&
        !warnedAlgorythmoFeatureFlags.has(enableFlag)
      ) {
        warnedAlgorythmoFeatureFlags.add(enableFlag);
        // eslint-disable-next-line no-console
        console.warn(
          `[algorythmo] Unknown feature flag on route meta: ${enableFlag}. ` +
            `Expected one of dashboard/constants/algorythmoFeatureFlags ` +
            `ALGORYTHMO_FEATURE_FLAG_KEYS. The route will be BLOCKED (fail-closed).`
        );
      }
      return true;
    }

    try {
      const enabled = isFeatureEnabledonAccount(accountId, enableFlag);
      return !enabled;
    } catch {
      // Fail-closed: opt-in features must not leak on store error.
      return true;
    }
  }

  if (cutFlag) {
    // Unknown cut flag (typo, removed key, drift): always block. Dev builds
    // also warn once per flag so the typo gets fixed instead of silently
    // leaking forever. Prod builds skip the warning but still block.
    if (!isKnownAlgorythmoCutFlag(cutFlag)) {
      if (
        process.env.NODE_ENV !== 'production' &&
        !warnedAlgorythmoCutFlags.has(cutFlag)
      ) {
        warnedAlgorythmoCutFlags.add(cutFlag);
        // eslint-disable-next-line no-console
        console.warn(
          `[algorythmo] Unknown cut flag on route meta: ${cutFlag}. ` +
            `Expected one of dashboard/constants/algorythmoCutFlags ` +
            `ALGORYTHMO_CUT_FLAG_KEYS. The route will be BLOCKED (fail-closed).`
        );
      }
      return true;
    }

    try {
      const cutEnabled = isFeatureEnabledonAccount(accountId, cutFlag);
      // Fail-closed: only an explicit boolean `false` allows the surface.
      // Anything else (undefined, null, truthy non-boolean) blocks.
      return cutEnabled !== false;
    } catch {
      // Fail-closed: D5 promise — Chatwoot surfaces must not leak on transient
      // store errors, even briefly. Blocked route lands on dashboard.
      return true;
    }
  }

  return false;
};
