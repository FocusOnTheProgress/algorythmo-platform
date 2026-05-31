<script setup>
// algorythmo: Cinematic OS signature component — Aurora Border (DESIGN.md §6.6)
//
// A hairline frame with a single bright ICE arc that drifts slowly around the
// perimeter — a "comet", not a spinning loader, not a rainbow ring. It marks a
// surface as a place where the living intelligence speaks or ingests: the sector
// agent hero and the Brain knowledge dropzone. Sanctioned only on signature/
// identity surfaces — never on operational chrome.
//
// ROOT CAUSE + FIX (why the beam never ran the WHOLE border) — founder LIVE
// review. The canonical "comet" is an animated conic-gradient whose single
// bright stop rotates 0deg→360deg, so the bright arc traverses the COMPLETE
// perimeter. That needs the angle to be an *animatable* custom property, which
// only works when registered via `@property`. A prior build registered it inside
// THIS component's SCOPED <style>; Vue's scoped-style transform does not preserve
// a global @property at-rule, so the browser treated the angle as unregistered
// (non-interpolable) → the keyframe jumped discretely and, since a conic gradient
// is periodic (0deg == 360deg), the arc never moved. A later "rotate an oversized
// square layer" workaround swept a square, not the rounded-rect ring, so it read
// as "only one side lights up".
//
// FIX: the @property registration + the conic-ring styles now live in the GLOBAL
// engine stylesheet (engines/algorythmo/.../_components.scss, emitted once on
// :root via _woot.scss — never scoped). This component is now presentational: it
// renders the .alg-aurora-border structure and sets the per-instance CSS vars.
// The bright ICE arc visibly runs the entire perimeter, continuously. ICE tone
// only, hairline thickness, content never tinted (masked), reduced-motion parks
// the arc. See DESIGN.md §6.6 / §3.7.
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

<!--
  No scoped <style> by design. The .alg-aurora-border ring (including the
  globally-registered @property --alg-aurora-angle that makes the conic sweep
  animatable) lives in the GLOBAL engine stylesheet
  engines/algorythmo/app/assets/stylesheets/_components.scss — a scoped block
  here would re-scope those class names and break the global cascade match, and
  Vue scoped styles cannot host a working global @property (the original bug).
  This component only renders structure + sets per-instance CSS vars above.
-->
