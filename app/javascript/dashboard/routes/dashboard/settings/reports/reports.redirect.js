// algorythmo: M6.1-b — default-Reports redirect resolver.
// Extracted from reports.routes.js so unit tests can import only
// `dashboard/store` (one dep) instead of the full route module
// (which pulls 20+ Vue SFCs + amplitude + tslib transitively).
//
// Two exports:
//   resolveDefaultReportsRedirect(to, getterFactory?)  — sync, pure.
//     Returns the Vue Router redirect descriptor based on the
//     algorythmo_cut_reports_commercial flag (D13). Defaults to
//     commercial_reports unless the cut-flag is explicitly === true.
//     Safe under NaN / missing accountId: strict equality returns false.
//
//   defaultReportsRedirectHandler(to)                  — async wrapper.
//     Awaits `accounts/get` before resolving so the flag state is
//     hydrated on hard-reload / bookmark / paste-URL paths. The
//     redirect callback in reports.routes.js runs BEFORE the global
//     beforeEach guard's accounts/get await — without this wrapper,
//     a cut user reloading /reports gets bounced to /dashboard
//     (resolver picks commercial_reports while store is cold, then
//     the route guard fail-closes the cut user). See plan 0006 §M6.1-b.
import store from 'dashboard/store';

export const resolveDefaultReportsRedirect = (to, getterFactory = null) => {
  const isFeatureEnabledonAccount =
    getterFactory ?? store.getters['accounts/isFeatureEnabledonAccount'];
  const accountId = Number(to.params.accountId);
  const isCut =
    isFeatureEnabledonAccount(
      accountId,
      'algorythmo_cut_reports_commercial'
    ) === true;
  return {
    name: isCut ? 'account_overview_reports' : 'commercial_reports',
    params: to.params,
  };
};

export const defaultReportsRedirectHandler = async to => {
  const accountId = Number(to.params.accountId);
  if (Number.isFinite(accountId)) {
    await store.dispatch('accounts/get', { silent: true, accountId });
  }
  return resolveDefaultReportsRedirect(to);
};
