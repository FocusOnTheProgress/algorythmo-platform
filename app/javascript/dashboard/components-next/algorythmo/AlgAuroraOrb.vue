<script setup>
// algorythmo: Cinematic OS signature component — Aurora Orb (DESIGN.md §6.2)
//
// The central living-intelligence object — a luminous PLASMA BLOOM (Ref design
// 2). NOT a hard "billiard-ball" sphere: a hot magenta core lit from within,
// cooler violet on the upper-left, a soft shaded lower-right edge, all blooming
// into a soft pink outer glow. A downward light PLUME (comet tail, pink → cold
// blue) falls off the bottom, and thin light rays (conduits) radiate out to the
// surrounding data surfaces.
//
// Round-6 (THIRD founder rejection of the orb): the prior orb read as a solid
// shaded ball with a hard white specular glint + hard dark terminator. The
// reference is a glowing plasma that BLOOMS — soft edges, no white glint, no
// hard shadow. This rewrite makes the lit volume out of soft screen/multiply
// luminance layers so it matches the reference pixel-for-pixel.
//
// SACRED: this is the only object besides Planet Avatars where the Aurora
// Gradient may appear (on the SPHERE — the living core). It renders the Aurora
// gradient and NOTHING from chrome. Max one instance per session/screen —
// placing two is a ship-blocking bug.
//
// The conduits (the light TRAVELLING from the core to surrounding surfaces) can
// be re-toned to ice via `beam="ice"`. The Brain hub's reference uses the warm
// PINK rays (`beam="aurora"`, the default), matching Ref design 2.
//
// Ambient (cycle 6s): chroma drift (gradient position breathes), conduit glow
// ramp (staggered), halo pulse. `active` accelerates to a ~3s feel for live
// processing (query / ingestion). Reduced motion freezes all of it; the orb
// stays present, alive purely through colour.
import { computed, useId } from 'vue';

const props = defineProps({
  size: {
    type: Number,
    default: 180,
  },
  // Number of conduits radiating from the orb (0-6). DESIGN.md caps at 6.
  // This is the symmetric, count-based default (story / general use). For a hub
  // where each ray must reach a SPECIFIC surrounding card, pass `aimedConduits`
  // instead — irregular, hand-aimed rays that connect, never slice (see below).
  conduits: {
    type: Number,
    default: 0,
    validator: v => v >= 0 && v <= 6,
  },
  // Explicit, hand-aimed conduits — overrides `conduits` when non-empty.
  // Each entry aims one ray at a specific card: { angle:Number(deg),
  // length:Number(px from the orb centre), delay?:Number(s) }. Unlike the
  // symmetric default, these radiate at irregular angles and fade to transparent
  // before the card edge, so each beam CONNECTS to a card rather than piercing
  // it. (Round-2 fix: symmetric clock rays sliced through the cards.)
  aimedConduits: {
    type: Array,
    default: () => [],
    validator: list =>
      list.every(
        c =>
          c &&
          typeof c.angle === 'number' &&
          typeof c.length === 'number' &&
          c.length > 0
      ),
  },
  // Processing state — accelerates chroma drift + conduit ramp.
  active: {
    type: Boolean,
    default: false,
  },
  // Beam tone. The sphere itself always keeps the sacred Aurora chroma (it IS
  // the living core). The conduits, however, read as LIGHT TRAVELLING from the
  // core to each surrounding surface — and on the Brain hub the founder's
  // direction is an ice palette for that travelling light (cool whites/blues),
  // not the magenta band. `beam="ice"` re-tones only the conduits to the ice
  // tokens; `beam="aurora"` (default) keeps the original magenta conduit, so
  // existing callers (story / default) are untouched. This is a named, sanctioned
  // extension of the conduit treatment, not a new home for the Aurora gradient.
  beam: {
    type: String,
    default: 'aurora',
    validator: v => ['aurora', 'ice'].includes(v),
  },
  // Accessible label. Defaults to pt-BR; pass $t(...) from a consuming screen.
  ariaLabel: {
    type: String,
    default: 'Aurora — inteligência da plataforma',
  },
});

const uid = useId();

// Aimed conduits take precedence: each ray gets an explicit length so it stops
// (fading to transparent) just shy of its card. Falls back to the symmetric
// count-based layout so existing callers (story, default) keep working.
const conduitLines = computed(() => {
  if (props.aimedConduits.length > 0) {
    return props.aimedConduits.map((c, i) => ({
      angle: c.angle,
      length: `${c.length}px`,
      delay: `${(typeof c.delay === 'number' ? c.delay : i * 0.2).toFixed(2)}s`,
    }));
  }
  const n = Math.min(6, Math.max(0, props.conduits));
  return Array.from({ length: n }, (_, i) => ({
    angle: (i / n) * 360,
    // Symmetric default keeps its original full-bleed length (160% of the box).
    length: '160%',
    delay: `${(i * 0.4).toFixed(2)}s`,
  }));
});

const rootStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<template>
  <span
    class="alg-aurora-orb"
    :class="{
      'alg-aurora-orb--active': active,
      'alg-aurora-orb--beam-ice': beam === 'ice',
    }"
    :style="rootStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Outer bloom: soft pink luminance the plasma sphere sits ON. -->
    <span class="alg-aurora-orb__bloom" aria-hidden="true" />

    <!-- Halo: low-opacity glow envelope, breathes with the ambient cycle. -->
    <span class="alg-aurora-orb__halo" aria-hidden="true" />

    <!-- Downward light plume: a comet tail of light (pink → cold blue) falling
         off the bottom of the orb, as in Ref design 2. -->
    <span class="alg-aurora-orb__plume" aria-hidden="true" />

    <!-- Conduits: radial light rays to surrounding surfaces -->
    <span
      v-for="(conduit, i) in conduitLines"
      :key="`conduit-${i}`"
      class="alg-aurora-orb__conduit"
      aria-hidden="true"
      :style="{
        '--alg-conduit-angle': `${conduit.angle}deg`,
        '--alg-conduit-length': conduit.length,
        '--alg-conduit-delay': conduit.delay,
      }"
    />

    <!-- The plasma sphere — soft lit volume (no hard glint / no hard
         terminator). The cool violet patch (::before) and inner hot bloom
         (::after) live inside; a soft shaded edge sits on top via __shade. -->
    <span class="alg-aurora-orb__sphere" :data-uid="uid" aria-hidden="true">
      <span class="alg-aurora-orb__shade" aria-hidden="true" />
    </span>
  </span>
</template>

<style lang="scss" scoped>
.alg-aurora-orb {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
}

// --- Plasma sphere -----------------------------------------------------------
// A luminous plasma body (Ref design 2), NOT a hard shaded ball. The hot magenta
// core (brightest upper-left, where the light reads) deepens to rosa/violeta at
// the lower-right edge and blooms softly outward — no hard rim. The outer glow
// seats it on the canvas. Volume comes from soft SCREEN/MULTIPLY luminance layers
// (cool violet patch + inner hot bloom + a gentle shaded edge), never a white
// specular glint or a black terminator (the rejected "billiard-ball" defect).
.alg-aurora-orb__sphere {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: var(--alg-radius-pill);
  background: radial-gradient(
    circle at 40% 36%,
    oklch(0.67 0.185 350) 0%,
    var(--alg-aurora-1) 32%,
    var(--alg-aurora-2) 64%,
    color-mix(in oklch, var(--alg-aurora-2), var(--alg-aurora-3) 55%) 86%,
    color-mix(in oklch, var(--alg-aurora-3), black 26%) 100%
  );
  // Oversize the paint so the chroma drift has room to move without showing edges.
  background-size: 150% 150%;
  background-position: 40% 36%;
  box-shadow:
    0 0 20px 1px color-mix(in oklch, var(--alg-aurora-1), transparent 62%),
    0 0 52px 8px color-mix(in oklch, var(--alg-aurora-2), transparent 80%);
  animation: alg-aurora-chroma var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
}

// Cool violet-blue patch, upper-left — the distinct cooler highlight from the
// reference (NOT a white glint). Soft, screen-blended into the magenta body.
.alg-aurora-orb__sphere::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 36% 31%,
    oklch(0.72 0.15 298 / 0.92) 0%,
    oklch(0.62 0.18 318 / 0.55) 20%,
    transparent 48%
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

// Inner hot bloom — a soft luminous heart, lower-centre, lit-from-within. Kept
// magenta (NOT white) so the plasma never blows out to a hard white dot.
.alg-aurora-orb__sphere::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 52% 60%,
    oklch(0.72 0.2 354 / 0.38) 0%,
    oklch(0.64 0.22 356 / 0.2) 24%,
    transparent 52%
  );
  mix-blend-mode: screen;
  pointer-events: none;
}

// Soft shaded edge, lower-right — a gentle terminator that gives the plasma
// volume without the hard black shadow of the rejected orb.
.alg-aurora-orb__shade {
  position: absolute;
  z-index: 1;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 70% 76%,
    oklch(0.2 0.06 320 / 0.55) 0%,
    oklch(0.2 0.06 320 / 0.18) 30%,
    transparent 58%
  );
  mix-blend-mode: multiply;
  pointer-events: none;
}

// --- Outer bloom -------------------------------------------------------------
// Soft pink luminance the plasma sphere sits ON — restrained so the SPHERE reads
// as an object, not a nebula. Larger and softer than the halo; the halo pulses,
// the bloom is the steady seat of light.
.alg-aurora-orb__bloom {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: 240%;
  height: 240%;
  transform: translate(-50%, -50%);
  border-radius: var(--alg-radius-pill);
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in oklch, var(--alg-aurora-1), transparent 64%) 0%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 80%) 30%,
    color-mix(in oklch, var(--alg-aurora-3), transparent 90%) 50%,
    transparent 68%
  );
  filter: blur(7px);
  pointer-events: none;
}

// --- Halo --------------------------------------------------------------------
// A tight inner pulse just around the sphere (the bloom is the steady outer
// seat; this is the breathing skin of light on the surface).
.alg-aurora-orb__halo {
  position: absolute;
  z-index: 1;
  inset: -18%;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-aurora-halo);
  filter: blur(8px);
  animation: alg-aurora-halo var(--alg-duration-ambient) var(--alg-ease-ambient)
    infinite;
}

// --- Downward plume ----------------------------------------------------------
// A comet tail of light falling off the BOTTOM of the orb (Ref design 2): a
// narrow cone, pink at the orb fading to a cold-blue tip, softly blurred. This
// replaces the old upward beam — the reference's light falls down, not up.
.alg-aurora-orb__plume {
  position: absolute;
  z-index: 0;
  left: 50%;
  top: 50%;
  width: 58%;
  height: 210%;
  transform: translateX(-50%);
  background: linear-gradient(
    to bottom,
    color-mix(in oklch, var(--alg-aurora-1), transparent 30%) 0%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 56%) 28%,
    color-mix(in oklch, var(--alg-aurora-3), transparent 70%) 56%,
    color-mix(in oklch, var(--alg-ice-3), transparent 72%) 82%,
    transparent 100%
  );
  clip-path: polygon(40% 0%, 60% 0%, 86% 100%, 14% 100%);
  filter: blur(8px);
  opacity: 0.92;
  animation: alg-aurora-beam-pulse var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
}

// --- Conduits ----------------------------------------------------------------
// Each conduit is a thin gradient line anchored at the orb centre (left center),
// rotated to its angle and given an explicit length. The gradient leaves the
// orb soft, brightens mid-run, then fades to transparent BEFORE the far end —
// so a hand-aimed ray reaches its card and dissolves into it (connects), never
// slicing across it. (Round-2 defect B: symmetric full-bleed rays sliced cards.)
.alg-aurora-orb__conduit {
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  width: var(--alg-conduit-length, 160%);
  height: 2px;
  transform-origin: left center;
  transform: rotate(var(--alg-conduit-angle));
  // Fade-to-transparent pulled EARLY: the bright band peaks near the orb (~28%)
  // and the mid band has fully dissolved by ~72% of the ray length — so the lit
  // portion of the beam lives in the GAP between the orb and the card, and the
  // beam is already transparent by the time it could reach (or overshoot) a card
  // edge. Combined with the orb sitting below the cards in the stage, an
  // overshoot reads as faint light under glass, never a bright line on the face.
  // (Round-2 defect B: a bright band terminated inside the card at wide widths.)
  // R3 refinement ("feixes mais visíveis"): brighter band that reaches further
  // toward the card (peaks full magenta ~30%, fades by ~93%), a soft blur + a
  // low aurora bloom so it reads as a beam of connecting light — not a hairline.
  // It still dissolves before the far end and renders BELOW the cards in the
  // stage, so an overshoot is light under glass, never a line on the card face.
  background: linear-gradient(
    90deg,
    color-mix(in oklch, var(--alg-aurora-1), transparent 55%) 0%,
    color-mix(in oklch, var(--alg-aurora-1), transparent 18%) 28%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 45%) 60%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 82%) 82%,
    transparent 94%
  );
  opacity: 0.62;
  filter: blur(0.6px);
  box-shadow: 0 0 6px 0
    color-mix(in oklch, var(--alg-aurora-1), transparent 66%);
  animation: alg-aurora-conduit var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
  animation-delay: var(--alg-conduit-delay);
}

// Ice beam re-tone (Brain hub). Only the conduits change — the travelling light
// reads as cool glacial white/blue (--alg-ice-*), the founder's direction for
// the Brain. The bright band still peaks near the orb and dissolves before the
// far end, so it CONNECTS the core to each card without slicing it. The glow
// bloom shifts to ice too, so the beam never leaks magenta into the cards.
.alg-aurora-orb--beam-ice .alg-aurora-orb__conduit {
  background: linear-gradient(
    90deg,
    color-mix(in oklch, var(--alg-ice-2), transparent 55%) 0%,
    var(--alg-ice-1) 26%,
    color-mix(in oklch, var(--alg-ice-2), transparent 22%) 58%,
    color-mix(in oklch, var(--alg-ice-3), transparent 72%) 80%,
    transparent 93%
  );
  box-shadow: 0 0 8px 0 color-mix(in oklch, var(--alg-ice-2), transparent 60%);
}

// Active (processing): everything quickens to a ~3s feel + richer drift.
.alg-aurora-orb--active {
  .alg-aurora-orb__sphere,
  .alg-aurora-orb__halo,
  .alg-aurora-orb__plume,
  .alg-aurora-orb__conduit {
    animation-duration: 3000ms;
  }
}

@keyframes alg-aurora-chroma {
  0%,
  100% {
    background-position: 40% 36%;
  }
  50% {
    background-position: 46% 36%;
  }
}

@keyframes alg-aurora-halo {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes alg-aurora-beam-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes alg-aurora-conduit {
  0%,
  100% {
    opacity: 0.48;
  }
  50% {
    opacity: 0.72;
  }
}

// Reduced motion: freeze all directional/drift motion. The orb stays present,
// alive through colour. Chroma drift parks, conduits hold at steady opacity,
// halo and beam stop pulsing. (DESIGN.md §3.7 / §6.2.)
@media (prefers-reduced-motion: reduce) {
  .alg-aurora-orb__sphere,
  .alg-aurora-orb__halo,
  .alg-aurora-orb__plume,
  .alg-aurora-orb__conduit {
    animation: none;
  }
  .alg-aurora-orb__conduit {
    opacity: 0.8;
  }
}
</style>
