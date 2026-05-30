import { describe, it, expect, vi, beforeEach } from 'vitest';

// Motion One is WAAPI-backed and not meaningful in jsdom; we assert the
// contract (which keyframes/options get passed) rather than real animation.
// vi.hoisted keeps the spies available to the hoisted vi.mock factory.
const { animate, stagger } = vi.hoisted(() => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn((each, opts) => ({ __stagger: each, ...opts })),
}));
vi.mock('motion', () => ({ animate, stagger }));

import {
  algReveal,
  algStagger,
  algAmbient,
  prefersReducedMotion,
  ALG_EASE_CINEMATIC,
  ALG_DURATION,
} from '../useAlgMotion';

const setReducedMotion = matches => {
  window.matchMedia = vi.fn().mockReturnValue({ matches });
};

describe('useAlgMotion', () => {
  beforeEach(() => {
    animate.mockClear();
    stagger.mockClear();
    setReducedMotion(false);
  });

  describe('prefersReducedMotion', () => {
    it('reflects the media query', () => {
      setReducedMotion(true);
      expect(prefersReducedMotion()).toBe(true);
      setReducedMotion(false);
      expect(prefersReducedMotion()).toBe(false);
    });
  });

  describe('algReveal', () => {
    it('is a no-op for a null element', () => {
      expect(algReveal(null)).toBeNull();
      expect(animate).not.toHaveBeenCalled();
    });

    it('fades + lifts with the cinematic curve', () => {
      const el = document.createElement('div');
      algReveal(el);
      const [, keyframes, opts] = animate.mock.calls[0];
      expect(keyframes.opacity).toEqual([0, 1]);
      expect(keyframes.transform).toEqual([
        'translateY(12px)',
        'translateY(0px)',
      ]);
      expect(opts.ease).toEqual(ALG_EASE_CINEMATIC);
      expect(opts.duration).toBe(ALG_DURATION.slow);
    });

    it('settles opacity with no travel under reduced motion', () => {
      setReducedMotion(true);
      const el = document.createElement('div');
      algReveal(el);
      const [, keyframes, opts] = animate.mock.calls[0];
      expect(keyframes.opacity).toEqual([0, 1]);
      expect(keyframes.transform).toBeUndefined();
      expect(opts.duration).toBe(0.001);
    });
  });

  describe('algStagger', () => {
    it('is a no-op for an empty list', () => {
      expect(algStagger([])).toBeNull();
      expect(animate).not.toHaveBeenCalled();
    });

    it('uses a Motion stagger delay across nodes', () => {
      const els = [
        document.createElement('div'),
        document.createElement('div'),
      ];
      algStagger(els, { each: 0.05 });
      expect(stagger).toHaveBeenCalledWith(0.05, expect.any(Object));
      const [nodes, , opts] = animate.mock.calls[0];
      expect(nodes).toHaveLength(2);
      expect(opts.ease).toEqual(ALG_EASE_CINEMATIC);
    });

    it('fades together with no stagger travel under reduced motion', () => {
      setReducedMotion(true);
      const els = [document.createElement('div')];
      algStagger(els);
      expect(stagger).not.toHaveBeenCalled();
      const [, keyframes, opts] = animate.mock.calls[0];
      expect(keyframes.transform).toBeUndefined();
      expect(opts.duration).toBe(0.001);
    });
  });

  describe('algAmbient', () => {
    it('loops with reverse + ambient easing', () => {
      const el = document.createElement('div');
      algAmbient(el, { scale: [1, 1.04, 1] });
      const [, keyframes, opts] = animate.mock.calls[0];
      expect(keyframes.scale).toEqual([1, 1.04, 1]);
      expect(opts.repeat).toBe(Infinity);
      expect(opts.repeatType).toBe('reverse');
    });

    it('parks at the mid frame under reduced motion', () => {
      setReducedMotion(true);
      const el = document.createElement('div');
      algAmbient(el, { scale: [1, 1.04, 1] });
      const [, keyframes, opts] = animate.mock.calls[0];
      expect(keyframes.scale).toBe(1.04); // middle of [1, 1.04, 1]
      expect(opts.duration).toBe(0.001);
      expect(opts.repeat).toBeUndefined();
    });
  });
});
