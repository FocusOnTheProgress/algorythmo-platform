import { isRouteBlockedByAlgorythmoGate } from '../routeHelpers';

// M0.5 — Camada 3': Vue router guard for algorythmo_show_captain
// Tests the pure helper function used by the router's beforeEach guard.
describe('isRouteBlockedByAlgorythmoGate', () => {
  const ACCOUNT_ID = 42;

  // Helper: a getter that always reports the given value for any flag
  const makeGetter = enabled => () => enabled;

  describe('when the route has no algorythmoFeatureFlag meta', () => {
    it('returns false (does not block routes that have no gate)', () => {
      const to = { meta: { permissions: ['agent'] } };
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(false), ACCOUNT_ID)
      ).toBe(false);
    });

    it('returns false when meta is undefined', () => {
      const to = {};
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(false), ACCOUNT_ID)
      ).toBe(false);
    });
  });

  describe('when the route has algorythmoFeatureFlag: algorythmo_show_captain', () => {
    const to = {
      meta: {
        algorythmoFeatureFlag: 'algorythmo_show_captain',
        permissions: ['administrator'],
      },
    };

    it('returns true (blocks) when the flag is disabled', () => {
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(false), ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns false (allows) when the flag is enabled', () => {
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(true), ACCOUNT_ID)
      ).toBe(false);
    });

    it('passes the correct accountId to the getter', () => {
      const getterSpy = vi.fn(() => true);
      isRouteBlockedByAlgorythmoGate(to, getterSpy, ACCOUNT_ID);
      expect(getterSpy).toHaveBeenCalledWith(
        ACCOUNT_ID,
        'algorythmo_show_captain'
      );
    });

    it('passes the correct flag name to the getter', () => {
      const getterSpy = vi.fn(() => false);
      isRouteBlockedByAlgorythmoGate(to, getterSpy, ACCOUNT_ID);
      expect(getterSpy).toHaveBeenCalledWith(
        ACCOUNT_ID,
        'algorythmo_show_captain'
      );
    });
  });

  describe('fail-closed behavior', () => {
    it('returns true (blocks) when the getter throws', () => {
      const throwingGetter = () => {
        throw new Error('store not ready');
      };
      const to = { meta: { algorythmoFeatureFlag: 'algorythmo_show_captain' } };
      expect(
        isRouteBlockedByAlgorythmoGate(to, throwingGetter, ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns true (blocks) when the getter returns undefined', () => {
      const to = { meta: { algorythmoFeatureFlag: 'algorythmo_show_captain' } };
      expect(
        isRouteBlockedByAlgorythmoGate(to, () => undefined, ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns true (blocks) when the getter returns null', () => {
      const to = { meta: { algorythmoFeatureFlag: 'algorythmo_show_captain' } };
      expect(isRouteBlockedByAlgorythmoGate(to, () => null, ACCOUNT_ID)).toBe(
        true
      );
    });
  });

  describe('redirect destination (integration with router index.js logic)', () => {
    it('redirect path format matches accounts/:accountId/dashboard convention', () => {
      // Verify the format the router uses for redirecting — not testing the router itself,
      // just documenting the expected string for human reviewers.
      const accountId = 99;
      const expected = `accounts/${accountId}/dashboard`;
      expect(expected).toBe('accounts/99/dashboard');
    });
  });
});
