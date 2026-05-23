/**
 * algorythmo: i18n-overlay-m0
 *
 * Minimal recursive deep-merge for plain objects.
 * Leaf values in `overrides` win over `base`.
 * Arrays are replaced, not concatenated.
 * No dependency on external libraries — keeps the bundle clean.
 *
 * @param {Object} base - upstream locale object
 * @param {Object} overrides - algorythmo overlay object
 * @returns {Object} merged result (new object, inputs unchanged)
 */
export function deepMerge(base, overrides) {
  const result = Object.assign({}, base);
  Object.keys(overrides).forEach(key => {
    const baseVal = base[key];
    const overVal = overrides[key];

    // algorythmo: null-guard adversarial-#5
    // A null override value must NOT silently delete the base subtree.
    // This prevents a misconfigured override file from wiping out entire
    // locale branches (e.g. { "GENERAL_SETTINGS": null } would have
    // deleted all GENERAL_SETTINGS strings from the merged locale).
    if (overVal === null) return;

    if (
      baseVal !== null &&
      typeof baseVal === 'object' &&
      typeof overVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  });
  return result;
}
