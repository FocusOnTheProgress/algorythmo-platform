/**
 * algorythmo: null-guard adversarial-#5
 *
 * Unit tests for the deepMerge utility, with special focus on:
 *  - Null override values must NOT delete base subtrees (adversarial finding #5).
 *  - Correct recursive merge of nested objects.
 *  - Array replacement semantics.
 *  - Base preservation for keys absent in overrides.
 */

import { deepMerge } from './deepMerge';

describe('deepMerge', () => {
  describe('basic merge', () => {
    it('returns a new object (does not mutate inputs)', () => {
      const base = { a: 1 };
      const overrides = { b: 2 };
      const result = deepMerge(base, overrides);
      expect(result).not.toBe(base);
      expect(base).toEqual({ a: 1 });
      expect(overrides).toEqual({ b: 2 });
    });

    it('preserves base keys not present in overrides', () => {
      const base = { a: 1, b: 2 };
      const result = deepMerge(base, { b: 99 });
      expect(result.a).toBe(1);
      expect(result.b).toBe(99);
    });

    it('override leaf value wins over base leaf value', () => {
      const base = { KEY: 'Powered by Chatwoot' };
      const result = deepMerge(base, { KEY: 'Powered by Algorythmo OS' });
      expect(result.KEY).toBe('Powered by Algorythmo OS');
    });

    it('merges nested objects recursively', () => {
      const base = {
        GENERAL: { TITLE: 'Chatwoot', FOOTER: 'Base footer' },
      };
      const overrides = {
        GENERAL: { TITLE: 'Algorythmo OS' },
      };
      const result = deepMerge(base, overrides);
      expect(result.GENERAL.TITLE).toBe('Algorythmo OS');
      expect(result.GENERAL.FOOTER).toBe('Base footer');
    });

    it('replaces arrays entirely (not concatenated)', () => {
      const base = { ITEMS: [1, 2, 3] };
      const result = deepMerge(base, { ITEMS: [99] });
      expect(result.ITEMS).toEqual([99]);
    });
  });

  describe('null guard — adversarial finding #5', () => {
    it('null override does NOT delete base subtree', () => {
      const base = {
        GENERAL_SETTINGS: {
          TITLE: 'Algorythmo OS',
          FOOTER: 'System',
        },
      };
      // A null value in the override must be skipped — it must NOT erase
      // the entire GENERAL_SETTINGS subtree from the merged result.
      const overrides = { GENERAL_SETTINGS: null };
      const result = deepMerge(base, overrides);

      expect(result.GENERAL_SETTINGS).toBeDefined();
      expect(result.GENERAL_SETTINGS.TITLE).toBe('Algorythmo OS');
      expect(result.GENERAL_SETTINGS.FOOTER).toBe('System');
    });

    it('null override for a leaf key does NOT set that key to null', () => {
      const base = { POWERED_BY: 'Powered by Algorythmo OS' };
      const result = deepMerge(base, { POWERED_BY: null });
      // null override → key preserves the base value (not null, not deleted)
      expect(result.POWERED_BY).toBe('Powered by Algorythmo OS');
    });

    it('null override for a nested key preserves the entire branch', () => {
      const base = {
        INBOX_MGMT: {
          WIDGET_BUILDER: {
            BRANDING_TEXT: 'Powered by Algorythmo OS',
          },
        },
      };
      const result = deepMerge(base, { INBOX_MGMT: null });
      expect(result.INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT).toBe(
        'Powered by Algorythmo OS'
      );
    });

    it('null in nested override does not delete sibling base keys', () => {
      const base = {
        LEVEL1: {
          A: 'keep me',
          B: 'also keep me',
        },
      };
      const overrides = {
        LEVEL1: { A: null },
      };
      const result = deepMerge(base, overrides);
      expect(result.LEVEL1.A).toBe('keep me'); // null skipped → base value kept
      expect(result.LEVEL1.B).toBe('also keep me');
    });

    it('empty overrides object preserves entire base', () => {
      const base = { A: 1, B: { C: 2 } };
      const result = deepMerge(base, {});
      expect(result).toEqual({ A: 1, B: { C: 2 } });
    });
  });

  describe('edge cases', () => {
    it('override with undefined value for a key leaves base key intact', () => {
      // undefined keys in JS objects do not appear in Object.keys() —
      // this is a documentation test, not a null-guard test.
      const base = { KEY: 'base' };
      const overrides = {};
      // eslint-disable-next-line no-undefined
      overrides.KEY = undefined;
      // Object.keys({ KEY: undefined }) still includes KEY in V8
      // but since we only guard null, undefined goes through the else branch.
      // The result depends on JS runtime — we document this here as known behaviour.
      // The adversarial finding is specifically about null, not undefined.
      const result = deepMerge(base, overrides);
      // undefined override → base key is replaced with undefined (expected — it's explicit)
      // This is distinct from null which we explicitly skip.
      expect(Object.keys(result)).toContain('KEY');
    });

    it('handles deeply nested structure without stack overflow (10 levels)', () => {
      const base = { leaf: 'original' };
      const over = {};
      let cursor = over;
      for (let i = 0; i < 10; i += 1) {
        cursor.nested = {};
        cursor = cursor.nested;
      }
      cursor.leaf = 'overridden';

      let b = base;
      for (let i = 0; i < 10; i += 1) {
        b = { nested: b };
      }

      const result = deepMerge(b, over);
      expect(result).toBeDefined();
    });
  });
});
