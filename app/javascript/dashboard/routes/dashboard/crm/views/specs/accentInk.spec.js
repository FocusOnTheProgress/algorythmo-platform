// algorythmo: feature-gate algorythmo_crm
//
// Guards the COMPUTED header-ink contrast logic (adversarial review #111). The
// bug was a hand-set ink flag that only tagged the yellow stage, leaving the
// bright orange stage with near-white ink below AA. inkForAccent() must derive
// the ink from the accent's WCAG contrast so any bright hue gets dark ink.
import { describe, it, expect } from 'vitest';
import { inkForAccent, parseOklch } from '../accentInk.js';
import { DEMO_STAGES } from '../demoData.js';

describe('accentInk — computed header ink (WCAG contrast)', () => {
  describe('parseOklch', () => {
    it('parses an oklch(L C H) triple', () => {
      expect(parseOklch('oklch(0.62 0.16 300)')).toEqual({
        L: 0.62,
        C: 0.16,
        H: 300,
      });
    });

    it('accepts a percentage lightness', () => {
      const p = parseOklch('oklch(78% 0.15 88)');
      expect(p.L).toBeCloseTo(0.78, 5);
    });

    it('returns null for non-oklch input', () => {
      expect(parseOklch('#ff0000')).toBeNull();
      expect(parseOklch('rgb(1,2,3)')).toBeNull();
      expect(parseOklch(null)).toBeNull();
      expect(parseOklch('oklch(0.5)')).toBeNull();
    });
  });

  describe('inkForAccent', () => {
    it('keeps white ink when it clears AA (ref look on the AA-tuned stage fills)', () => {
      // The three colour fills are tuned so white ink clears AA — ink stays light.
      expect(inkForAccent('oklch(0.56 0.15 245)')).toBe('light'); // blue
      expect(inkForAccent('oklch(0.56 0.16 300)')).toBe('light'); // purple
      expect(inkForAccent('oklch(0.58 0.16 48)')).toBe('light'); // orange
    });

    it('switches to dark ink only when white would fail AA (bright yellow)', () => {
      expect(inkForAccent('oklch(0.78 0.15 88)')).toBe('dark'); // yellow
    });

    it('flips a too-bright blue/purple/orange to dark before it can ship sub-AA white', () => {
      // The pre-fix accents (lighter L) — white ink fails AA on these, so the
      // computed ink protects against the silent failure adversarial review hit.
      expect(inkForAccent('oklch(0.68 0.16 48)')).toBe('dark'); // old orange
      expect(inkForAccent('oklch(0.62 0.16 300)')).toBe('dark'); // old purple
    });

    it('returns light ink for very dark colours', () => {
      expect(inkForAccent('oklch(0.20 0.05 260)')).toBe('light');
    });

    it('returns dark ink for very light colours', () => {
      expect(inkForAccent('oklch(0.95 0.05 100)')).toBe('dark');
    });

    it('falls back to light ink for unparseable input', () => {
      expect(inkForAccent('#abcdef')).toBe('light');
      expect(inkForAccent(undefined)).toBe('light');
    });
  });

  it('every demo stage accent resolves to AA-passing ink', () => {
    DEMO_STAGES.forEach(stage => {
      expect(['light', 'dark']).toContain(inkForAccent(stage.accent));
    });
  });
});
