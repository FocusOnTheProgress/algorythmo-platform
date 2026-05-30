// algorythmo: Cinematic OS — shared motion system (DESIGN.md §3.7).
//
// ONE motion library for the whole platform. Brain (Stream D) and the C-level
// surfaces (Stream E) animate entrances and staggers from here so the curve,
// the durations and the reduced-motion contract are identical everywhere —
// never hand-rolled per screen.
//
// Built on Motion One (`motion`, ~5kb runtime) — the smallest library that
// gives us spring-free, token-aligned, WAAPI-backed entrances with first-class
// `stagger`. We expose a thin, opinionated surface (NOT the full Motion API):
//
//   algReveal(el, opts)          — single-element entrance (fade + lift)
//   algStagger(els, opts)        — staggered entrance across a list/grid
//   algAmbient(el, keyframes, o) — looping ambient breath (sinusoidal)
//   useAlgMotion()               — composable wrapper bound to a root ref
//
// Doctrine baked in:
//   • Default ease is the Apple cinematic curve (--alg-ease-cinematic).
//   • Entrance = ease-out feel; durations come from the DESIGN.md scale.
//   • Spring is NOT exposed here — it is a rare, hand-authored delight moment.
//   • `prefers-reduced-motion: reduce` collapses every entrance to an instant
//     opacity settle (no transform travel) and parks ambient loops at a static
//     mid-frame. The presence stays; the motion stops (DESIGN.md §3.7 / §10.4).
//
// Usage (entrance on mount):
//   import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';
//   const root = ref(null);
//   const { revealChildren } = useAlgMotion(root);
//   onMounted(() => revealChildren('[data-alg-reveal]'));

import { animate, stagger } from 'motion';
import { onMounted, ref } from 'vue';

// DESIGN.md curves + durations, mirrored here so the JS layer never drifts from
// the CSS tokens. Cinematic is the Apple signature; ambient is symmetric (it
// breathes, it does not travel).
export const ALG_EASE_CINEMATIC = [0.32, 0.72, 0, 1];
export const ALG_EASE_AMBIENT = [0.45, 0.05, 0.55, 0.95];

// Seconds (Motion One takes seconds, not ms). Mirrors --alg-duration-*.
export const ALG_DURATION = {
  instant: 0.12,
  fast: 0.18,
  base: 0.24,
  slow: 0.34,
  deliberate: 0.52,
  ambient: 6,
  ambientSlow: 8,
};

/**
 * True when the user asked for reduced motion. Read live (not cached) so a
 * mid-session OS change is honoured.
 */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Single-element entrance: fade in with a small upward lift. Reduced motion
 * settles opacity with no travel. Returns the Motion animation (or null).
 *
 * @param {Element} el
 * @param {{ y?: number, duration?: number, delay?: number, opacity?: number }} [opts]
 */
export function algReveal(el, opts = {}) {
  if (!el) return null;
  const { y = 12, duration = ALG_DURATION.slow, delay = 0, opacity = 0 } = opts;

  if (prefersReducedMotion()) {
    return animate(el, { opacity: [opacity, 1] }, { duration: 0.001, delay });
  }

  return animate(
    el,
    {
      opacity: [opacity, 1],
      transform: [`translateY(${y}px)`, 'translateY(0px)'],
    },
    { duration, delay, ease: ALG_EASE_CINEMATIC }
  );
}

/**
 * Staggered entrance across a list/grid. Children fade + lift in sequence with
 * the cinematic curve. Reduced motion fades them in together, no travel.
 *
 * @param {Element[]|NodeList} els
 * @param {{ y?: number, duration?: number, each?: number, startDelay?: number, from?: string|number }} [opts]
 */
export function algStagger(els, opts = {}) {
  const nodes = Array.from(els || []).filter(Boolean);
  if (!nodes.length) return null;

  const {
    y = 12,
    duration = ALG_DURATION.slow,
    each = 0.06,
    startDelay = 0,
    from = 'first',
  } = opts;

  if (prefersReducedMotion()) {
    return animate(
      nodes,
      { opacity: [0, 1] },
      { duration: 0.001, delay: startDelay }
    );
  }

  return animate(
    nodes,
    { opacity: [0, 1], transform: [`translateY(${y}px)`, 'translateY(0px)'] },
    {
      duration,
      ease: ALG_EASE_CINEMATIC,
      delay: stagger(each, { startDelay, from }),
    }
  );
}

/**
 * Looping ambient breath — the platform's living surfaces (orbs, halos, the
 * Aurora arc when JS-driven). Symmetric easing + alternate so it breathes
 * rather than travels. Reduced motion parks it at a static mid-frame.
 *
 * @param {Element} el
 * @param {Object} keyframes  Motion keyframes, e.g. { scale: [1, 1.04, 1] }
 * @param {{ duration?: number }} [opts]
 */
export function algAmbient(el, keyframes, opts = {}) {
  if (!el) return null;
  const { duration = ALG_DURATION.ambient } = opts;

  if (prefersReducedMotion()) {
    // Park at the resting/mid value — present, but motionless.
    const parked = Object.fromEntries(
      Object.entries(keyframes).map(([k, v]) => [
        k,
        Array.isArray(v) ? v[Math.floor(v.length / 2)] : v,
      ])
    );
    return animate(el, parked, { duration: 0.001 });
  }

  return animate(el, keyframes, {
    duration,
    ease: ALG_EASE_AMBIENT,
    repeat: Infinity,
    repeatType: 'reverse',
  });
}

/**
 * Composable wrapper. Bind to a root ref; query descendants and reveal them.
 *
 * @param {import('vue').Ref<Element|null>} rootRef
 */
export function useAlgMotion(rootRef = ref(null)) {
  const reveal = (target, opts) => {
    const el =
      typeof target === 'string'
        ? rootRef.value?.querySelector(target)
        : target;
    return algReveal(el, opts);
  };

  const revealChildren = (selector, opts) => {
    const root = rootRef.value;
    if (!root) return null;
    return algStagger(root.querySelectorAll(selector), opts);
  };

  // Reveal a stagger target automatically on mount (the common case).
  const revealOnMount = (selector, opts) => {
    onMounted(() => revealChildren(selector, opts));
  };

  return {
    root: rootRef,
    reveal,
    revealChildren,
    revealOnMount,
    algReveal,
    algStagger,
    algAmbient,
    prefersReducedMotion,
  };
}

export default useAlgMotion;
