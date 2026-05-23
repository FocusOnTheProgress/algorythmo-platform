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
  for (const key of Object.keys(overrides)) {
    const baseVal = base[key];
    const overVal = overrides[key];
    if (
      baseVal !== null &&
      overVal !== null &&
      typeof baseVal === 'object' &&
      typeof overVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}
