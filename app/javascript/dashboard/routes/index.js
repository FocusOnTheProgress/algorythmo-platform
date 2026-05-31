import { createRouter, createWebHistory } from 'vue-router';

import { frontendURL } from '../helper/URLHelper';
import dashboard from './dashboard/dashboard.routes';
import store from 'dashboard/store';
import {
  validateLoggedInRoutes,
  isRouteBlockedByAlgorythmoGate,
} from '../helper/routeHelpers';
import { isOnOnboardingView } from 'v3/helpers/RouteHelper';
import AnalyticsHelper from '../helper/AnalyticsHelper';

const ONBOARDING_STEPS = ['account_details', 'enrichment'];
const routes = [...dashboard.routes];

export const router = createRouter({ history: createWebHistory(), routes });

const hasAlgorythmoGate = to =>
  !!(to?.meta?.algorythmoFeatureFlag || to?.meta?.algorythmoCutFlag);

const algorythmoGateFlag = to =>
  to?.meta?.algorythmoFeatureFlag || to?.meta?.algorythmoCutFlag;

const isAlgorythmoGateStateKnown = (to, accountId) => {
  const flag = algorythmoGateFlag(to);
  if (!flag) return true;

  try {
    const isFeatureEnabledonAccount =
      store.getters['accounts/isFeatureEnabledonAccount'];
    return isFeatureEnabledonAccount(accountId, flag) !== undefined;
  } catch {
    return false;
  }
};

export const validateAuthenticateRoutePermission = async (to, next) => {
  const { isLoggedIn, getCurrentUser: user } = store.getters;

  if (!isLoggedIn) {
    window.location.assign('/app/login');
    return '';
  }

  const { accounts = [], account_id: accountId } = user;

  if (!accounts.length) {
    if (to.name === 'no_accounts') {
      return next();
    }
    return next(frontendURL('no-accounts'));
  }

  const routeAccountId = Number(to.params?.accountId || accountId);
  const userAccount = accounts.find(a => a.id === routeAccountId);
  const isAdmin = userAccount?.role === 'administrator';
  const isActive = userAccount?.status === 'active';
  const needsOnboarding =
    ONBOARDING_STEPS.includes(userAccount?.onboarding_step) &&
    isAdmin &&
    isActive;

  if (to.name === 'no_accounts' || !to.name) {
    // algorythmo: Stream D — Início is the universal landing for all roles.
    // Bare-entry (no route name) lands on Início directly; deep-links carry a
    // route name and skip this branch entirely (deep-links preserved).
    // Onboarding path is unchanged: admins in onboarding still land on the
    // onboarding surface, not on Início.
    const target = needsOnboarding ? 'onboarding' : 'inicio';
    return next(frontendURL(`accounts/${routeAccountId}/${target}`));
  }

  if (needsOnboarding && !isOnOnboardingView(to)) {
    return next(frontendURL(`accounts/${routeAccountId}/onboarding`));
  }
  if (!needsOnboarding && isOnOnboardingView(to)) {
    return next(frontendURL(`accounts/${routeAccountId}/dashboard`));
  }

  const nextRoute = validateLoggedInRoutes(to, store.getters.getCurrentUser);
  if (nextRoute) return next(frontendURL(nextRoute));

  // algorythmo: feature-gate algorythmo_show_captain
  // algorythmo: feature-gate algorythmo_cut_*
  // Check Algorythmo feature gate AFTER permission validation.
  // Routes declare the gate via one of two meta keys:
  //   meta.algorythmoFeatureFlag — enable / opt-in semantic, fail-closed.
  //   meta.algorythmoCutFlag     — cut / inverted semantic, also fail-closed
  //                                (D5 promise: Chatwoot surfaces must not leak
  //                                to PME tenants on unknown / loading state).
  // See `isRouteBlockedByAlgorythmoGate` in `helper/routeHelpers.js` for
  // the full contract and precedence rules.
  //
  // Race condition: `setUser` is awaited in `beforeEach`, but `accounts/get`
  // runs from App.vue after the SPA mounts. On a hard reload to a gated URL
  // the account payload (and its `algorythmo_cut_flags` column) may not yet
  // exist when this guard fires — the getter returns `undefined`, which the
  // route helper treats as "unknown → block". We await `accounts/get` once
  // here so the guard makes its decision on real flag state instead of
  // false-blocking every direct nav.
  const isFeatureEnabledonAccount =
    store.getters['accounts/isFeatureEnabledonAccount'];

  if (
    hasAlgorythmoGate(to) &&
    !isAlgorythmoGateStateKnown(to, routeAccountId)
  ) {
    // Pass `accountId` explicitly: AccountAPI.get() defaults to deriving the id
    // from `window.location.pathname`, which is STALE inside beforeEach (the URL
    // commits after the guard resolves). On cross-account navigation we'd
    // otherwise refetch the CURRENT account and the target's flags would stay
    // unknown forever — fail-closed-redirecting the user on every first click.
    await store.dispatch('accounts/get', {
      silent: true,
      accountId: routeAccountId,
    });

    if (!isAlgorythmoGateStateKnown(to, routeAccountId)) {
      // Fetch finished but state still unknown (missing column, network
      // error, typoed flag). Fail-closed: redirect to dashboard.
      return next(frontendURL(`accounts/${routeAccountId}/dashboard`));
    }
  }

  if (
    isRouteBlockedByAlgorythmoGate(
      to,
      isFeatureEnabledonAccount,
      routeAccountId
    )
  ) {
    return next(frontendURL(`accounts/${routeAccountId}/dashboard`));
  }

  return next();
};

export const initalizeRouter = () => {
  const userAuthentication = store.dispatch('setUser');

  router.beforeEach(async (to, _from, next) => {
    AnalyticsHelper.page(to.name || '', {
      path: to.path,
      name: to.name,
    });

    await userAuthentication;
    await validateAuthenticateRoutePermission(to, next, store);
  });
};

export default router;
