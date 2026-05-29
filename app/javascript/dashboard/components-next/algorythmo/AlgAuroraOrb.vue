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
  conduits: {
    type: Number,
    default: 0,
    validator: v => v >= 0 && v <= 6,
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

const conduitLines = computed(() => {
  const n = Math.min(6, Math.max(0, props.conduits));
  return Array.from({ length: n }, (_, i) => ({
    angle: (i / n) * 360,
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
  box-shadow:
    inset 0 2px 6px 0 rgba(255, 255, 255, 0.25),
    inset 0 -8px 18px -6px rgba(0, 0, 0, 0.45);
  animation: alg-aurora-chroma var(--alg-duration-ambient)
    var(--alg-ease-ambient) infinite;
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
// Each conduit is a thin gradient line anchored at the orb centre, rotated to
// its angle. The gradient fades transparent → magenta → transparent.
.alg-aurora-orb__conduit {
  position: absolute;
  z-index: 0;
  top: 50%;
  left: 50%;
  width: 160%;
  height: 2px;
  transform-origin: 0 50%;
  transform: rotate(var(--alg-conduit-angle));
  background: var(--alg-aurora-conduit);
  opacity: 0.45;
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
    opacity: 0.45;
  }
  50% {
    opacity: 0.85;
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
    opacity: 0.65;
  }
}
</style>
