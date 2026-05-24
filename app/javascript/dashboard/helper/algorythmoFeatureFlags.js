/**
 * Algorythmo cut-surface feature-gate helper for Vue components.
 *
 * Usage in a component:
 *   import { isAlgorythmoCutEnabled } from '@/helper/algorythmoFeatureFlags';
 *   // then in computed / setup (algorythmo_cut_flags is emitted by _account.json.jbuilder):
 *   const showCampaigns = computed(() => {
 *     const account = store.getters['accounts/getAccount'](accountId);
 *     return isAlgorythmoCutEnabled('campaigns', account.algorythmo_cut_flags);
 *   });
 *
 * Cut flag names match Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES WITHOUT any prefix.
 * All flags default to false (fail-closed) — surface is visible until the flag is enabled.
 */

/**
 * Returns true if the given Algorythmo cut-surface flag is enabled (surface is hidden).
 *
 * @param {string} flagName - Short flag name WITHOUT any prefix (e.g. 'campaigns').
 * @param {Object} cutFlags - The algorythmo_cut_flags hash from the account object.
 * @returns {boolean}
 */
export function isAlgorythmoCutEnabled(flagName, cutFlags) {
  if (!cutFlags || typeof cutFlags !== 'object') return false;
  return cutFlags[flagName] === true;
}
