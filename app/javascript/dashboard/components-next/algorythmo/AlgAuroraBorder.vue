<script setup>
// algorythmo: Cinematic OS signature component — Aurora Border (DESIGN.md §6.6)
//
// A hairline frame with a single bright ICE arc that drifts slowly around the
// perimeter — a "comet", not a spinning loader, not a rainbow ring. It marks a
// surface as a place where the living intelligence speaks or ingests: the sector
// agent hero and the Brain knowledge dropzone. Sanctioned only on signature/
// identity surfaces — never on operational chrome.
//
// ROOT CAUSE + FIX (why the beam kept rendering STATIC) — TWO bugs (Stream C,
// plan 0011), both fixed in the GLOBAL stylesheets:
//   1. The conic `from <angle>` must be an *animatable* custom property,
//      registered via a GLOBAL `@property`. A prior build put it in a Vue SCOPED
//      <style>, which Vue does not preserve → non-interpolable → discrete jump,
//      and since a conic is periodic (0deg == 360deg) the arc looked frozen.
//      Already fixed by moving registration to _components.scss (global).
//   2. THE REAL SCAR on the founder's machine: the global reduced-motion policy
//      in _tokens.scss collapses ambient durations to 1ms AND applies a universal
//      `* { animation-iteration-count: 1 !important }` kill-switch. On any OS
//      with "animation effects off" (common on Windows — the founder reviews
//      there) the beam ran ONCE at ~0ms then died. A _components.scss override
//      that "slowed it to 28s" was dead code, out-ranked by that !important rule.
//      Fixed by an explicit beam exception INSIDE that same reduced-motion block
//      in _tokens.scss, keeping the arc moving (calm 24s loop).
//
// The beam is WHITE / ICE and UNIVERSAL (founder Brief v3: "o feixe ... deve ser
// branco" — no per-sector tint). 3 stacked layers (founder's exact technique):
//   front  — the solid content body (slightly inset, so the border shows);
//   middle — the crisp conic arc on the hairline ring (.alg-aurora-border__beam);
//   behind — a BLURRED copy of that arc for the neon glow spread (::before).
// The @property + conic-ring styles live in the GLOBAL engine stylesheet
// (engines/algorythmo/.../_components.scss, emitted once via _woot.scss, never
// scoped). This component is presentational: it renders the structure + sets the
// per-instance CSS vars. Hairline thickness, content never tinted (masked),
// reduced-motion keeps the arc alive (slowed). See DESIGN.md §6.6 / §3.7.
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
