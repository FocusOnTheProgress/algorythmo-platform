/**
 * algorythmo: i18n-overlay-parity
 *
 * Guards against the C1.1 sidebar bug: a key existed in the pt_BR override
 * but was missing from the en override, so the English app rendered the raw
 * i18n key (e.g. `SIDEBAR.ALG_SECTOR_COMMERCIAL`) instead of a label.
 *
 * This spec is data-driven over EVERY override file in ./overrides. It collects
 * the full set of leaf key-paths per locale and fails if any key-path exists in
 * one override locale but not in another. New override locales are covered
 * automatically — no edit to this spec required when one is added.
 *
 * Lives under engines/algorythmo/app/javascript so the CI Vitest scope picks it
 * up via its directory glob (see .github/workflows/run_foss_spec.yml).
 */

// Eagerly load every override locale JSON. import.meta.glob is resolved by Vite
// at build time, so adding overrides/<locale>.json is enough to enroll it.
const overrideModules = import.meta.glob('./overrides/*.json', { eager: true });

/** Map of locale code -> parsed override object. */
const locales = Object.fromEntries(
  Object.entries(overrideModules).map(([path, mod]) => {
    const code = path.replace(/^.*\/(.+)\.json$/, '$1');
    return [code, mod.default ?? mod];
  })
);

/**
 * Recursively collect the set of leaf key-paths in an object.
 * A leaf is any non-plain-object value (string, number, array, null).
 */
function collectLeafPaths(obj, prefix = '', acc = new Set()) {
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      collectLeafPaths(value, path, acc);
    } else {
      acc.add(path);
    }
  });
  return acc;
}

describe('i18n override locale parity', () => {
  const localeCodes = Object.keys(locales);

  it('discovers at least the en and pt_BR overrides', () => {
    expect(localeCodes).toEqual(expect.arrayContaining(['en', 'pt_BR']));
  });

  const pathsByLocale = Object.fromEntries(
    localeCodes.map(code => [code, collectLeafPaths(locales[code])])
  );

  // The union of every key-path across all override locales. Every locale must
  // define each of these (translated, but present) — otherwise the app shows a
  // raw key in whatever locale is missing it.
  const allPaths = new Set();
  localeCodes.forEach(code => {
    pathsByLocale[code].forEach(p => allPaths.add(p));
  });

  localeCodes.forEach(code => {
    it(`override "${code}" defines every key present in any other override`, () => {
      const present = pathsByLocale[code];
      const missing = [...allPaths].filter(p => !present.has(p)).sort();
      expect(
        missing,
        `Locale "${code}" is missing ${missing.length} key(s) present in another ` +
          `override locale. Add them so the ${code} app never renders a raw i18n key:\n` +
          missing.map(p => `  - ${p}`).join('\n')
      ).toEqual([]);
    });
  });
});
