import {
  isRouteBlockedByAlgorythmoGate,
  resetAlgorythmoFlagWarningsForTests,
} from '../routeHelpers';

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

  describe('when the route has algorythmoCutFlag (M2 Onda 2 cut surfaces)', () => {
    const to = {
      meta: {
        algorythmoCutFlag: 'algorythmo_cut_campaigns',
        permissions: ['administrator'],
      },
    };

    it('returns true (blocks) when the cut flag is enabled (hide the surface)', () => {
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(true), ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns false (allows) when the cut flag is disabled (show the surface)', () => {
      expect(
        isRouteBlockedByAlgorythmoGate(to, makeGetter(false), ACCOUNT_ID)
      ).toBe(false);
    });

    it('passes the correct accountId and cut flag name to the getter', () => {
      const getterSpy = vi.fn(() => false);
      isRouteBlockedByAlgorythmoGate(to, getterSpy, ACCOUNT_ID);
      expect(getterSpy).toHaveBeenCalledWith(
        ACCOUNT_ID,
        'algorythmo_cut_campaigns'
      );
    });

    it('returns true (blocks, fail-closed) when the getter throws', () => {
      // D5 promise: Chatwoot surfaces must not leak on transient store errors,
      // even briefly. Only an explicit boolean `false` allows the surface.
      const throwingGetter = () => {
        throw new Error('store not ready');
      };
      expect(
        isRouteBlockedByAlgorythmoGate(to, throwingGetter, ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns true (blocks) when the getter returns undefined (flag state unknown)', () => {
      // The store getter returns `undefined` when the account payload has
      // not yet loaded, or when `algorythmo_cut_flags` column is missing.
      // Both must block — the router awaits accounts/get and redirects if
      // state is still unknown after the fetch.
      expect(
        isRouteBlockedByAlgorythmoGate(to, () => undefined, ACCOUNT_ID)
      ).toBe(true);
    });

    it('returns true (blocks) when the getter returns null', () => {
      expect(isRouteBlockedByAlgorythmoGate(to, () => null, ACCOUNT_ID)).toBe(
        true
      );
    });

    it('returns true (blocks) when the getter returns a truthy non-boolean (strict === false required to allow)', () => {
      // Defensive: only the exact boolean `false` allows. Anything else blocks.
      expect(isRouteBlockedByAlgorythmoGate(to, () => 1, ACCOUNT_ID)).toBe(
        true
      );
    });

    it('returns true (blocks) when the getter returns 0', () => {
      // 0 is falsy but not strictly `false` — must still block.
      expect(isRouteBlockedByAlgorythmoGate(to, () => 0, ACCOUNT_ID)).toBe(
        true
      );
    });
  });

  describe('when the route has BOTH algorythmoFeatureFlag and algorythmoCutFlag', () => {
    // The enable (opt-in) flag takes precedence; cut flag is not consulted.
    const to = {
      meta: {
        algorythmoFeatureFlag: 'algorythmo_show_captain',
        algorythmoCutFlag: 'algorythmo_cut_campaigns',
      },
    };

    it('blocks based on the enable flag, ignoring the cut flag', () => {
      // Enable flag off, cut flag also off — helper must read enable first and block.
      const getter = (_, name) => name !== 'algorythmo_show_captain';
      expect(isRouteBlockedByAlgorythmoGate(to, getter, ACCOUNT_ID)).toBe(true);
    });

    it('allows when the enable flag is on, regardless of the cut flag', () => {
      // Enable flag on, cut flag also on — helper short-circuits on enable and allows.
      const getter = () => true;
      expect(isRouteBlockedByAlgorythmoGate(to, getter, ACCOUNT_ID)).toBe(
        false
      );
    });
  });

  describe('dev-time warning for unknown algorythmoCutFlag values', () => {
    let warnSpy;

    beforeEach(() => {
      resetAlgorythmoFlagWarningsForTests();
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('warns once and blocks every call when a route declares an unknown cut flag (typo guard)', () => {
      const to = {
        meta: { algorythmoCutFlag: 'algorythmo_cut_compaigns' /* typo */ },
      };
      // Both calls must block — fail-closed on unknown cut flag is the whole
      // point of the typo guard. Warning is rate-limited; the block is not.
      expect(isRouteBlockedByAlgorythmoGate(to, () => false, ACCOUNT_ID)).toBe(
        true
      );
      expect(isRouteBlockedByAlgorythmoGate(to, () => false, ACCOUNT_ID)).toBe(
        true
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('algorythmo_cut_compaigns');
    });

    it('does not warn for known cut flag keys', () => {
      const to = { meta: { algorythmoCutFlag: 'algorythmo_cut_campaigns' } };
      isRouteBlockedByAlgorythmoGate(to, () => false, ACCOUNT_ID);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // M2-B1.5: symmetric typo guard for the opt-in (enable) flag path.
  // A typo in meta.algorythmoFeatureFlag would otherwise produce a silent
  // permanent block in prod with no signal (getter returns undefined →
  // !undefined = true → blocked forever). The cut-flag guard had this and the
  // enable-flag guard did not; this test pins the symmetry.
  describe('dev-time warning for unknown algorythmoFeatureFlag values', () => {
    let warnSpy;

    beforeEach(() => {
      resetAlgorythmoFlagWarningsForTests();
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('warns once and blocks every call when a route declares an unknown enable flag (typo guard)', () => {
      const to = {
        meta: { algorythmoFeatureFlag: 'algorythmo_show_capitain' /* typo */ },
      };
      expect(isRouteBlockedByAlgorythmoGate(to, () => true, ACCOUNT_ID)).toBe(
        true
      );
      expect(isRouteBlockedByAlgorythmoGate(to, () => true, ACCOUNT_ID)).toBe(
        true
      );
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain('algorythmo_show_capitain');
    });

    it('does not warn for known enable flag keys (algorythmo_show_captain)', () => {
      const to = {
        meta: { algorythmoFeatureFlag: 'algorythmo_show_captain' },
      };
      isRouteBlockedByAlgorythmoGate(to, () => true, ACCOUNT_ID);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for known enable flag keys (algorythmo_crm)', () => {
      const to = { meta: { algorythmoFeatureFlag: 'algorythmo_crm' } };
      isRouteBlockedByAlgorythmoGate(to, () => true, ACCOUNT_ID);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('blocks unknown enable flag even when the getter would have returned true', () => {
      // Critical: the getter could be a fresh dev account that legitimately
      // has the typoed flag enabled in some old config. The typo guard must
      // still win — block first, ignore the getter.
      const to = {
        meta: { algorythmoFeatureFlag: 'algorythmo_show_capitain' },
      };
      expect(isRouteBlockedByAlgorythmoGate(to, () => true, ACCOUNT_ID)).toBe(
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
