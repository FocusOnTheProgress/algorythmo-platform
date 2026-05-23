// algorythmo: feature-gate algorythmo_show_captain
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store.js';

/**
 * Composable for checking Algorythmo OS feature flags at the component level.
 *
 * Design: fail-closed by default.
 * `isEnabled` starts as false and only flips to true after the flag is
 * positively confirmed enabled for the current account. This means:
 * - If the store hasn't hydrated yet → false (gate closed).
 * - If the flag is absent from the account features → false.
 * - If the getter throws → false.
 *
 * This prevents gated UI from briefly appearing on slow connections or
 * during hot-module-replacement reloads.
 *
 * @param {string} flagName - The Algorythmo feature flag name (e.g. 'algorythmo_show_captain')
 * @returns {{ isEnabled: import('vue').ComputedRef<boolean> }}
 */
export function useAlgorythmoFeatureGate(flagName) {
  const route = useRoute();
  const isFeatureEnabledonAccount = useMapGetter(
    'accounts/isFeatureEnabledonAccount'
  );

  const isEnabled = computed(() => {
    // Fail-closed: any error → false.
    try {
      const accountId = Number(route.params?.accountId);
      if (!accountId || !isFeatureEnabledonAccount.value) return false;

      const result = isFeatureEnabledonAccount.value(accountId, flagName);
      // Strict truthy: only `true` opens the gate — not 1, 'yes', etc.
      return result === true;
    } catch {
      return false;
    }
  });

  return { isEnabled };
}
