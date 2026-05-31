<script setup>
// algorythmo: Cinematic OS signature component — Aurora Border (DESIGN.md §6.6)
//
// A hairline frame with a single bright ICE arc that drifts slowly around the
// perimeter — a "comet", not a spinning loader, not a rainbow ring. It marks a
// surface as a place where the living intelligence speaks or ingests: the sector
// agent hero and the Brain knowledge dropzone. Sanctioned only on signature/
// identity surfaces — never on operational chrome.
//
// A5 ROOT CAUSE + FIX (why the beam never moved):
//   The previous build painted `--alg-aurora-border` = `conic-gradient(from
//   var(--alg-aurora-angle))` and animated the custom property 0deg→360deg via
//   an `@property` registered in THIS scoped <style>. Vue's scoped-style pass
//   doesn't reliably preserve a global `@property` at-rule, so the browser saw
//   --alg-aurora-angle as an UNregistered custom property → the keyframe jumped
//   discretely instead of interpolating, and because a conic gradient is
//   periodic (0deg and 360deg are the SAME image) the arc never appeared to
//   move. Result: a static ring + glow-behind — exactly the reported defect.
//
//   Fix: stop relying on @property entirely. The arc lives in a fixed-orientation
//   conic gradient on a dedicated `__beam` layer, and that whole layer is rotated
//   with `transform: rotate()` — a GPU/WAAPI transform animation that is
//   bulletproof and needs no custom-property registration. A dim ice ring sits
//   under it so the frame is always present. Reduced motion parks the rotation;
//   the border stays, alive through colour (DESIGN.md §3.7).
import { computed } from 'vue';

const props = defineProps({
  // Semantic element for the wrapper.
  as: {
    type: String,
    default: 'div',
  },
  // Corner radius — pass a token, e.g. 'var(--alg-radius-2xl)' for hero surfaces.
  radius: {
    type: String,
    default: 'var(--alg-radius-lg)',
  },
  // Frame thickness. Hairline by doctrine — keep at 1px unless a hero needs 1.5.
  thickness: {
    type: String,
    default: '1px',
  },
  // Restraint: 'subtle' for distributed surfaces, 'normal' for the showpieces.
  intensity: {
    type: String,
    default: 'normal',
    validator: v => ['subtle', 'normal'].includes(v),
  },
  // Soft outer ICE glow behind the surface (the dropzone "borda brilhante").
  glow: {
    type: Boolean,
    default: false,
  },
  // Base elevation shadow composed UNDER the glow, e.g. 'var(--alg-elevation-2)'.
  // box-shadow is not additive across rules, so both layers live in one
  // declaration: `<elevation>, <glow>`. The glow is ICE luminance, not a drop
  // shadow — without a grounded elevation a lifted surface reads as a flat slab.
  elevation: {
    type: String,
    default: '',
  },
  // Processing state — accelerates the arc drift to the orb's ~6s breath.
  active: {
    type: Boolean,
    default: false,
  },
});

// Single source of truth for the surface shadow: grounded elevation first, then
// the ICE glow. Applied inline so it always wins over any consumer class.
const boxShadow = computed(() => {
  const parts = [];
  if (props.elevation) parts.push(props.elevation);
  if (props.glow) parts.push('var(--alg-aurora-border-glow)');
  return parts.length ? parts.join(', ') : null;
});

const rootStyle = computed(() => ({
  '--alg-border-radius': props.radius,
  '--alg-border-thickness': props.thickness,
  '--alg-border-opacity': props.intensity === 'subtle' ? '0.55' : '0.9',
  ...(boxShadow.value ? { boxShadow: boxShadow.value } : {}),
}));
</script>

<template>
  <component
    :is="as"
    class="alg-aurora-border"
    :class="{ 'alg-aurora-border--active': active }"
    :style="rootStyle"
  >
    <span class="alg-aurora-border__frame" aria-hidden="true">
      <span class="alg-aurora-border__beam" />
    </span>
    <span class="alg-aurora-border__content"><slot /></span>
  </component>
</template>

<style lang="scss" scoped>
.alg-aurora-border {
  position: relative;
  border-radius: var(--alg-border-radius);
  isolation: isolate;
}

// The frame: clips both the dim base ring and the rotating beam to the perimeter
// hairline via a mask (content stays clean). It carries the masking + the dim
// ice base ring; the bright travelling arc lives on the child __beam at full
// strength (so the arc is the event, not a dimmed-down whole-ring tint).
.alg-aurora-border__frame {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  border-radius: inherit;
  padding: var(--alg-border-thickness);
  overflow: hidden;
  // Dim ice base ring — present everywhere the arc isn't. Already low-alpha in
  // the token, so no extra opacity multiply is needed here (which would also
  // dim the bright arc below).
  background: var(--alg-aurora-border-base);
  pointer-events: none;
  // Cut the centre out so only the hairline perimeter paints.
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
}

// The travelling arc. An oversized conic layer (so the rotated corners never
// expose an uncovered edge) physically rotates — the bright ice arc sweeps the
// perimeter. transform animation is GPU-driven and needs no @property. Opacity
// is the intensity dial (subtle vs normal); the arc stays bright, never washed.
.alg-aurora-border__beam {
  position: absolute;
  // Oversize past the box so rotation never reveals a bare corner.
  inset: -50%;
  border-radius: inherit;
  background: var(--alg-aurora-border);
  opacity: var(--alg-border-opacity);
  transform-origin: center;
  will-change: transform;
  animation: alg-aurora-border-sweep var(--alg-duration-ambient-slow) linear
    infinite;
}

.alg-aurora-border__content {
  position: relative;
  z-index: 1;
  display: block;
  border-radius: inherit;
}

// Processing: the arc quickens to the orb's 6s breath.
.alg-aurora-border--active .alg-aurora-border__beam {
  animation-duration: var(--alg-duration-ambient);
}

@keyframes alg-aurora-border-sweep {
  to {
    transform: rotate(1turn);
  }
}

// Reduced motion: park the arc. The base ice ring + a frozen arc keep the border
// present, alive through colour, with no directional movement (DESIGN.md §3.7).
@media (prefers-reduced-motion: reduce) {
  .alg-aurora-border__beam {
    animation: none;
    transform: rotate(-32deg);
  }
}
</style>
