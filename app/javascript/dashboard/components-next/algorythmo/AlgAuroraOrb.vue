<script setup>
// algorythmo: Cinematic OS signature component — Aurora Orb (DESIGN.md §6.2)
//
// The central living-intelligence object. A chromatic sphere (magenta → rosa
// → violeta, the Aurora Gradient §3.1) with a low-opacity halo, a vertical
// light beam rising off the top (--alg-aurora-beam), and optional conduits —
// thin light rays connecting the orb to surrounding data surfaces.
//
// SACRED: this is the only object besides Planet Avatars where the Aurora
// Gradient may appear. It renders the Aurora gradient and NOTHING from chrome.
// Max one instance per session/screen — placing two is a ship-blocking bug.
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
    :class="{ 'alg-aurora-orb--active': active }"
    :style="rootStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Halo: low-opacity glow envelope, 1.5x the sphere diameter -->
    <span class="alg-aurora-orb__halo" aria-hidden="true" />

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

    <!-- Vertical light beam rising off the top of the sphere -->
    <span class="alg-aurora-orb__beam" aria-hidden="true" />

    <!-- The sphere -->
    <span class="alg-aurora-orb__sphere" :data-uid="uid" aria-hidden="true" />
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

// --- Sphere ------------------------------------------------------------------
.alg-aurora-orb__sphere {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-aurora-grad);
  // Oversize the paint so the drift has room to move without showing edges.
  background-size: 160% 160%;
  background-position: 35% 30%;
  // Depth: the outer glow seats it on the canvas; directional inset shadows
  // model the curvature (top-left rim light, bottom-right core shadow). The
  // ::before specular glint + ::after shadow terminator (below) turn the flat
  // disc into a real lit 3D sphere. (R3 refinement: "esfera mais 3D".)
  box-shadow:
    var(--alg-aurora-glow),
    inset 0 4px 10px 0 rgba(255, 255, 255, 0.3),
    inset -8px -11px 28px -6px rgba(0, 0, 0, 0.55);
  animation: alg-aurora-chroma var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
}

// Specular glint — the fixed highlight where the light hits (top-left). A tight
// bright spot that reads the sphere as a lit object, not a flat disc. Fixed
// while the chroma drifts underneath, like a real light source.
.alg-aurora-orb__sphere::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 30% 24%,
    rgba(255, 255, 255, 0.62) 0%,
    rgba(255, 255, 255, 0.13) 9%,
    transparent 23%
  );
  pointer-events: none;
}

// Shadow terminator — the sphere falling into shadow opposite the glint
// (bottom-right). Completes the volume.
.alg-aurora-orb__sphere::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at 74% 82%,
    rgba(6, 0, 12, 0.55) 0%,
    transparent 56%
  );
  pointer-events: none;
}

// --- Halo --------------------------------------------------------------------
.alg-aurora-orb__halo {
  position: absolute;
  z-index: 1;
  inset: -25%;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-aurora-halo);
  filter: blur(8px);
  animation: alg-aurora-halo var(--alg-duration-ambient) var(--alg-ease-ambient)
    infinite;
}

// --- Vertical beam -----------------------------------------------------------
.alg-aurora-orb__beam {
  position: absolute;
  z-index: 0;
  left: 50%;
  bottom: 45%;
  width: 26%;
  height: 130%;
  transform: translateX(-50%);
  background: var(--alg-aurora-beam);
  filter: blur(6px);
  border-radius: var(--alg-radius-pill);
  opacity: 0.7;
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
    color-mix(in oklch, var(--alg-aurora-1), transparent 45%) 0%,
    var(--alg-aurora-1) 30%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 28%) 62%,
    color-mix(in oklch, var(--alg-aurora-2), transparent 78%) 82%,
    transparent 93%
  );
  opacity: 0.78;
  filter: blur(0.6px);
  box-shadow: 0 0 7px 0
    color-mix(in oklch, var(--alg-aurora-1), transparent 58%);
  animation: alg-aurora-conduit var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
  animation-delay: var(--alg-conduit-delay);
}

// Active (processing): everything quickens to a ~3s feel + richer drift.
.alg-aurora-orb--active {
  .alg-aurora-orb__sphere,
  .alg-aurora-orb__halo,
  .alg-aurora-orb__beam,
  .alg-aurora-orb__conduit {
    animation-duration: 3000ms;
  }
}

@keyframes alg-aurora-chroma {
  0%,
  100% {
    background-position: 35% 30%;
  }
  50% {
    background-position: 41% 30%;
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
    opacity: 0.6;
  }
  50% {
    opacity: 0.92;
  }
}

// Reduced motion: freeze all directional/drift motion. The orb stays present,
// alive through colour. Chroma drift parks, conduits hold at steady opacity,
// halo and beam stop pulsing. (DESIGN.md §3.7 / §6.2.)
@media (prefers-reduced-motion: reduce) {
  .alg-aurora-orb__sphere,
  .alg-aurora-orb__halo,
  .alg-aurora-orb__beam,
  .alg-aurora-orb__conduit {
    animation: none;
  }
  .alg-aurora-orb__conduit {
    opacity: 0.8;
  }
}
</style>
