<script setup>
// algorythmo: Cinematic OS signature component — Aurora Border (DESIGN.md §6.6)
//
// A hairline frame in the Aurora Gradient with a single bright arc that drifts
// slowly around the perimeter — a "comet", not a spinning loader, not a rainbow
// ring. It marks a surface as a place where the living intelligence speaks or
// ingests: the sector agent hero and the Brain knowledge dropzone. It is the
// ONLY chrome-adjacent home of the Aurora Gradient besides the two atoms in
// §6.4, and is sanctioned only on signature/identity surfaces — never on
// operational chrome (KPI cards, list views, generic panels, sidebar).
//
// Anatomy: the frame is a gradient ring composited out of the centre via a
// mask (so content never tints), with an optional low outer glow. The arc
// drifts via the registered --alg-aurora-angle property. Reduced motion parks
// the arc — the border stays present, alive purely through colour (DESIGN.md
// §3.7). Controlled opacity + hairline thickness keep it identity, not ornament.
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
  // Soft outer Aurora glow behind the surface (the dropzone "borda brilhante").
  glow: {
    type: Boolean,
    default: false,
  },
  // Base elevation shadow composed UNDER the glow, e.g. 'var(--alg-elevation-2)'.
  // The glow is luminance, not a drop shadow — without a grounded elevation a
  // lifted surface reads as a flat slab (the round-2 defect). box-shadow is not
  // additive across rules, so both layers must live in one declaration; this
  // composes them: `<elevation>, <glow>`.
  elevation: {
    type: String,
    default: '',
  },
  // Processing state — accelerates the arc drift to a ~6s feel.
  active: {
    type: Boolean,
    default: false,
  },
});

// Single source of truth for the surface shadow: grounded elevation first, then
// the Aurora glow. Applied inline so it always wins over any consumer class.
const boxShadow = computed(() => {
  const parts = [];
  if (props.elevation) parts.push(props.elevation);
  if (props.glow) parts.push('var(--alg-aurora-glow)');
  return parts.length ? parts.join(', ') : null;
});

const rootStyle = computed(() => ({
  '--alg-border-radius': props.radius,
  '--alg-border-thickness': props.thickness,
  '--alg-border-opacity': props.intensity === 'subtle' ? '0.5' : '0.82',
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
    <span class="alg-aurora-border__frame" aria-hidden="true" />
    <span class="alg-aurora-border__content"><slot /></span>
  </component>
</template>

<style lang="scss" scoped>
// Registered so the conic arc can interpolate as it rotates. Global registration
// from a scoped block is intentional and idempotent.
@property --alg-aurora-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

.alg-aurora-border {
  position: relative;
  border-radius: var(--alg-border-radius);
  isolation: isolate;
}

// The gradient ring — masked so only the perimeter paints, content stays clean.
.alg-aurora-border__frame {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  padding: var(--alg-border-thickness);
  background: var(--alg-aurora-border);
  opacity: var(--alg-border-opacity);
  pointer-events: none;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  animation: alg-aurora-border-drift var(--alg-duration-ambient-slow)
    var(--alg-ease-linear) infinite;
}

.alg-aurora-border__content {
  position: relative;
  z-index: 1;
  display: block;
  border-radius: inherit;
}

// Processing: the arc quickens to the orb's 6s breath.
.alg-aurora-border--active .alg-aurora-border__frame {
  animation-duration: var(--alg-duration-ambient);
}

@keyframes alg-aurora-border-drift {
  to {
    --alg-aurora-angle: 360deg;
  }
}

// Reduced motion: park the arc. The border holds at its rest position, present
// and alive through colour, with no directional movement (DESIGN.md §3.7).
@media (prefers-reduced-motion: reduce) {
  .alg-aurora-border__frame {
    animation: none;
  }
}
</style>
