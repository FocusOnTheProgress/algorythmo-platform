// algorythmo: feature-gate algorythmo_show_captain
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock vue-router and the store composable before importing the composable under test.
vi.mock('vue-router', () => ({
  useRoute: vi.fn(),
}));

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: vi.fn(),
}));

import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store.js';
import { useAlgorythmoFeatureGate } from '../useAlgorythmoFeatureGate';
import { ref } from 'vue';

// Q2 — useAlgorythmoFeatureGate composable
// Verifies the fail-closed contract: isEnabled defaults to false and only
// flips to true after the flag is positively confirmed true.
describe('useAlgorythmoFeatureGate', () => {
  const FLAG_NAME = 'algorythmo_show_captain';
  const ACCOUNT_ID = 7;

  function setupMocks({
    routeAccountId = ACCOUNT_ID,
    getterReturnValue = false,
  } = {}) {
    useRoute.mockReturnValue({
      params: { accountId: String(routeAccountId) },
    });

    const mockGetter = vi.fn(() => getterReturnValue);
    useMapGetter.mockReturnValue(ref(mockGetter));

    return { mockGetter };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('default state — fail-closed', () => {
    it('returns isEnabled = false when the flag is not enabled', () => {
      setupMocks({ getterReturnValue: false });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });

    it('returns isEnabled = false when getter returns undefined', () => {
      setupMocks({ getterReturnValue: undefined });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });

    it('returns isEnabled = false when getter returns null', () => {
      setupMocks({ getterReturnValue: null });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });

    it('returns isEnabled = false when getter returns 1 (truthy but not strict true)', () => {
      setupMocks({ getterReturnValue: 1 });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      // Strict equality: only boolean true opens the gate
      expect(isEnabled.value).toBe(false);
    });
  });

  describe('when flag is enabled', () => {
    it('returns isEnabled = true only when getter returns boolean true', () => {
      setupMocks({ getterReturnValue: true });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(true);
    });
  });

  describe('fail-closed on errors', () => {
    it('returns false when the getter function throws', () => {
      useRoute.mockReturnValue({ params: { accountId: String(ACCOUNT_ID) } });
      const throwingGetter = vi.fn(() => {
        throw new Error('store not ready');
      });
      useMapGetter.mockReturnValue(ref(throwingGetter));

      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });

    it('returns false when useMapGetter returns a null ref (store not hydrated)', () => {
      useRoute.mockReturnValue({ params: { accountId: String(ACCOUNT_ID) } });
      useMapGetter.mockReturnValue(ref(null));

      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });

    it('returns false when accountId is missing from route params', () => {
      useRoute.mockReturnValue({ params: {} });
      const mockGetter = vi.fn(() => true);
      useMapGetter.mockReturnValue(ref(mockGetter));

      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);
      expect(isEnabled.value).toBe(false);
    });
  });

  describe('getter call contract', () => {
    it('calls the getter with the correct accountId and flagName', () => {
      const { mockGetter } = setupMocks({ getterReturnValue: true });
      const { isEnabled } = useAlgorythmoFeatureGate(FLAG_NAME);

      // Access the computed to trigger evaluation
      expect(isEnabled.value).toBeDefined();

      expect(mockGetter).toHaveBeenCalledWith(ACCOUNT_ID, FLAG_NAME);
    });

    it('uses isFeatureEnabledonAccount getter key', () => {
      setupMocks();
      useAlgorythmoFeatureGate(FLAG_NAME);

      expect(useMapGetter).toHaveBeenCalledWith(
        'accounts/isFeatureEnabledonAccount'
      );
    });
  });
});
