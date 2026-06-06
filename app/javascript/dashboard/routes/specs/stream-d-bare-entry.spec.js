// algorythmo: Stream D — bare-entry landing spec.
//
// Verifies that validateAuthenticateRoutePermission routes bare-entry
// (no route name) by ROLE:
//   - administrator → Início (the reformulated admin landing)
//   - agent / custom_role (operators) → the stock conversations dashboard
// (algorythmo: operador-stock — Início became admin-only; operators land on
// stock Chatwoot conversations instead).
//
// Deep-links (routes with a name) must pass through unchanged.
// The onboarding path must be preserved for admins in onboarding.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Vitest hoists vi.mock to the top. Mock the store so we can load the
// router index without booting Vuex or the full Vue app.
vi.mock('dashboard/store', () => ({
  default: {
    getters: {
      isLoggedIn: true,
      getCurrentUser: {
        accounts: [
          {
            id: 1,
            role: 'administrator',
            status: 'active',
            onboarding_step: null,
          },
        ],
        account_id: 1,
      },
    },
    dispatch: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('../../helper/routeHelpers', () => ({
  validateLoggedInRoutes: vi.fn(() => null),
  isRouteBlockedByAlgorythmoGate: vi.fn(() => false),
}));

vi.mock('v3/helpers/RouteHelper', () => ({
  isOnOnboardingView: vi.fn(() => false),
}));

vi.mock('../helper/AnalyticsHelper', () => ({
  default: { page: vi.fn() },
}));

vi.mock('vue-router', () => ({
  createRouter: vi.fn(() => ({})),
  createWebHistory: vi.fn(),
}));

vi.mock('./dashboard/dashboard.routes', () => ({
  default: { routes: [] },
}));

let validateAuthenticateRoutePermission;
let store;

beforeEach(async () => {
  vi.resetModules();
  ({ validateAuthenticateRoutePermission } = await import('../index.js'));
  store = (await import('dashboard/store')).default;
});

// Helper: build a minimal 'to' object for a bare-entry navigation.
// accountId in params matches what store returns so routeAccountId resolves.
const bareEntry = (accountId = 1) => ({
  name: undefined,
  params: { accountId: String(accountId) },
  meta: {},
});

// Helper: build a 'to' object for a deep-link (has a route name).
const deepLink = (name, accountId = 1) => ({
  name,
  params: { accountId: String(accountId) },
  meta: {},
});

describe('Stream D — bare-entry landing wiring', () => {
  it('bare-entry as administrator lands on inicio, not dashboard', async () => {
    store.getters.getCurrentUser = {
      accounts: [
        {
          id: 1,
          role: 'administrator',
          status: 'active',
          onboarding_step: null,
        },
      ],
      account_id: 1,
    };

    const next = vi.fn();
    await validateAuthenticateRoutePermission(bareEntry(1), next);

    expect(next).toHaveBeenCalledOnce();
    const arg = next.mock.calls[0][0];
    expect(typeof arg).toBe('string');
    expect(arg).toContain('accounts/1/inicio');
    expect(arg).not.toContain('dashboard');
  });

  // algorythmo: operador-stock — operators (agent / custom_role) land on the
  // stock conversations dashboard, NOT the admin-only Início.
  it('bare-entry as agent lands on the stock dashboard, not inicio', async () => {
    store.getters.getCurrentUser = {
      accounts: [
        { id: 1, role: 'agent', status: 'active', onboarding_step: null },
      ],
      account_id: 1,
    };

    const next = vi.fn();
    await validateAuthenticateRoutePermission(bareEntry(1), next);

    expect(next).toHaveBeenCalledOnce();
    const arg = next.mock.calls[0][0];
    expect(arg).toContain('accounts/1/dashboard');
    expect(arg).not.toContain('inicio');
  });

  it('bare-entry as custom_role lands on the stock dashboard, not inicio', async () => {
    store.getters.getCurrentUser = {
      accounts: [
        { id: 1, role: 'custom_role', status: 'active', onboarding_step: null },
      ],
      account_id: 1,
    };

    const next = vi.fn();
    await validateAuthenticateRoutePermission(bareEntry(1), next);

    expect(next).toHaveBeenCalledOnce();
    const arg = next.mock.calls[0][0];
    expect(arg).toContain('accounts/1/dashboard');
    expect(arg).not.toContain('inicio');
  });

  it('admin in onboarding still lands on onboarding, not inicio', async () => {
    store.getters.getCurrentUser = {
      accounts: [
        {
          id: 1,
          role: 'administrator',
          status: 'active',
          onboarding_step: 'account_details',
        },
      ],
      account_id: 1,
    };

    const next = vi.fn();
    await validateAuthenticateRoutePermission(bareEntry(1), next);

    expect(next).toHaveBeenCalledOnce();
    const arg = next.mock.calls[0][0];
    expect(arg).toContain('accounts/1/onboarding');
    expect(arg).not.toContain('inicio');
  });

  it('deep-link to a named route is NOT redirected to inicio', async () => {
    store.getters.getCurrentUser = {
      accounts: [
        {
          id: 1,
          role: 'administrator',
          status: 'active',
          onboarding_step: null,
        },
      ],
      account_id: 1,
    };

    const { validateLoggedInRoutes } = await import(
      '../../helper/routeHelpers'
    );
    validateLoggedInRoutes.mockReturnValue(null);

    const next = vi.fn();
    await validateAuthenticateRoutePermission(deepLink('home', 1), next);

    // For a deep-link with a route name, the bare-entry branch is not entered.
    // next() is called but the argument must NOT be a redirect to inicio.
    expect(next).toHaveBeenCalledOnce();
    const arg = next.mock.calls[0][0];
    // next() with undefined means allow through. next(string) would be redirect.
    const isPassThrough =
      arg === undefined || arg === null || arg === false || arg === true;
    const isNonInicioRedirect =
      typeof arg === 'string' && !arg.includes('inicio');
    expect(isPassThrough || isNonInicioRedirect).toBe(true);
  });
});
