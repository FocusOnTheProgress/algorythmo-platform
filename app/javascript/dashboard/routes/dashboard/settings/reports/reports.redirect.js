// algorythmo: M6.1-b — default-Reports redirect resolver + beforeEnter guard.
// Lives in its own module so unit tests can import only `dashboard/store`
// (one dep) instead of the full route module (which pulls 20+ Vue SFCs +
// amplitude + tslib transitively).
//
// Two exports:
//
//   resolveDefaultReportsRedirect(to, getterFactory?)  — sync, pure.
//     Returns the Vue Router redirect descriptor based on the
//     algorythmo_cut_reports_commercial flag (D13). Defaults to
//     commercial_reports unless the cut-flag is explicitly === true.
//     Safe under NaN / missing accountId: strict equality returns false.
//
//   defaultReportsBeforeEnter(to)                      — async router guard.
//     Vue Router 4 awaits `beforeEnter` (it does NOT await callbacks passed
//     to `redirect:`). On hard-reload / bookmark / paste-URL paths the
//     account payload is not yet hydrated when route resolution starts —
//     `accounts/get` must be dispatched and awaited before the cut-flag
//     can be read, otherwise cut users get bounced to /dashboard by the
//     global guard. We check the getter first and only dispatch when the
//     flag state is unknown — that avoids a double round-trip on warm nav
//     (the global beforeEach will ALSO dispatch accounts/get for the
//     redirected gated target if state is still unknown then).
import store from 'dashboard/store';

const COMMERCIAL_CUT_FLAG = 'algorythmo_cut_reports_commercial';

export const resolveDefaultReportsRedirect = (to, getterFactory = null) => {
  const isFeatureEnabledonAccount =
    getterFactory ?? store.getters['accounts/isFeatureEnabledonAccount'];
  const accountId = Number(to.params.accountId);
  const isCut =
    isFeatureEnabledonAccount(accountId, COMMERCIAL_CUT_FLAG) === true;
  return {
    name: isCut ? 'account_overview_reports' : 'commercial_reports',
    params: to.params,
  };
};

export const defaultReportsBeforeEnter = async to => {
  const accountId = Number(to.params.accountId);

  if (Number.isFinite(accountId)) {
    const getter = store.getters['accounts/isFeatureEnabledonAccount'];
    const isKnown = getter(accountId, COMMERCIAL_CUT_FLAG) !== undefined;

    if (!isKnown) {
      await store.dispatch('accounts/get', { silent: true, accountId });
    }
  }

  return resolveDefaultReportsRedirect(to);
};
