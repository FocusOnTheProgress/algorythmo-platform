/**
 * Algorythmo feature-gate helper for Vue components.
 *
 * Usage in a component:
 *   import { isAlgorythmoFeatureEnabled } from '@/helper/algorythmoFeatureFlags';
 *   // then in computed / setup:
 *   const showCampaigns = computed(() =>
 *     isAlgorythmoFeatureEnabled('campaigns', store.getters['accounts/getAccount'](accountId).features)
 *   );
 *
 * Flag names match config/features.yml entries WITHOUT the `algorythmo_` prefix.
 * All flags default to false (fail-closed) until explicitly enabled per-account.
 */

/**
 * Returns true if the given Algorythmo feature flag is enabled.
 *
 * @param {string} flagName - Short flag name WITHOUT the algorythmo_ prefix (e.g. 'campaigns').
 * @param {Object} accountFeatures - The features hash from the account object
 *   (store.getters['accounts/getAccount'](id).features).
 * @returns {boolean}
 */
export function isAlgorythmoFeatureEnabled(flagName, accountFeatures) {
  if (!accountFeatures || typeof accountFeatures !== 'object') return false;
  return accountFeatures[`algorythmo_${flagName}`] === true;
}
