<script setup>
// algorythmo: Cinematic OS signature component — Planet Avatar (DESIGN.md §6.3)
//
// Programmatic celestial avatar for an AGENT (Manu, Cortex, custom agents).
// This is the PLACEHOLDER for the future human-curated SVG planet library
// (§15): until a brand designer ships 12-16 hand-made planets, we synthesise
// a unique, deterministic planet from a hash of the agent's name/seed.
//
// Sacred: this is the ONE place besides AlgAuroraOrb where the Aurora rich
// chroma is allowed. The palette band is curated (magenta / rosa / violeta /
// âmbar / petróleo / azul-noite) — NOT random hues — so every planet still
// belongs to the Aurora family even while synthetic.
//
// Determinism: planet identity is fnv1a(seed) so the same agent always gets
// the same planet across sessions and surfaces (sidebar, conversation header,
// picker). This matches the final curated-library selection contract:
// fnv1a(name) % library.length.
import { computed, useId } from 'vue';

const props = defineProps({
  // Agent identity. `seed` overrides `name` when both are given (lets callers
  // pin a planet to a stable agent id rather than a display name).
  name: {
    type: String,
    required: true,
  },
  seed: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: v => ['sm', 'md', 'lg'].includes(v),
  },
  // Accessible label. Defaults to pt-BR; pass $t(...) from a consuming screen.
  ariaLabel: {
    type: String,
    default: '',
  },
});

const label = computed(
  () => props.ariaLabel || `Planeta do agente ${props.name}`
);

// SVG patterns/gradients need unique ids when several planets share a page.
const uid = useId();

const PX_BY_SIZE = { sm: 24, md: 32, lg: 48 };

// Curated Aurora-family palette band. Each entry is [hueA, hueB] in OKLCH hue
// degrees — the radial gradient runs from a luminous core hue to a deeper rim
// hue, giving each planet its own "atmosphere". Hand-picked, not generated.
const PALETTE_BAND = [
  [350, 320], // magenta carmim
  [12, 350], // rosa carmesim
  [295, 270], // violeta profundo
  [75, 45], // âmbar
  [185, 160], // verde-petróleo
  [265, 285], // azul-noite
];

/* eslint-disable no-bitwise -- FNV-1a hashing is intrinsically bitwise */
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts to stay in safe integer range.
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }
  return hash >>> 0;
}
/* eslint-enable no-bitwise */

const planet = computed(() => {
  const key = (props.seed || props.name || '').trim();
  const hash = fnv1a(key);
  const [hueCore, hueRim] = PALETTE_BAND[hash % PALETTE_BAND.length];

  // Secondary hash bits drive light angle + band rotation so two planets in
  // the same palette slot still feel distinct.
  /* eslint-disable-next-line no-bitwise -- extracting hash bits */
  const lightAngle = (hash >> 4) % 360;
  /* eslint-disable-next-line no-bitwise -- extracting hash bits */
  const bandRotation = (hash >> 9) % 360;

  return {
    core: `oklch(0.72 0.20 ${hueCore})`,
    mid: `oklch(0.58 0.22 ${hueCore})`,
    rim: `oklch(0.40 0.18 ${hueRim})`,
    haloHue: hueCore,
    lightX: `${30 + (lightAngle % 25)}%`,
    bandRotation,
  };
});

const pxSize = computed(() => PX_BY_SIZE[props.size]);
const sizeClass = computed(() => `alg-planet-avatar--${props.size}`);
</script>

<template>
  <span
    class="alg-planet-avatar"
    :class="sizeClass"
    role="img"
    :aria-label="label"
    :style="{
      '--alg-planet-px': `${pxSize}px`,
      '--alg-planet-halo-hue': planet.haloHue,
    }"
  >
    <svg
      class="alg-planet-avatar__svg"
      :width="pxSize"
      :height="pxSize"
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient
          :id="`alg-planet-grad-${uid}`"
          :cx="planet.lightX"
          cy="32%"
          r="75%"
        >
          <stop offset="0%" :stop-color="planet.core" />
          <stop offset="55%" :stop-color="planet.mid" />
          <stop offset="100%" :stop-color="planet.rim" />
        </radialGradient>

        <!-- Atmospheric texture: soft noise clipped to the sphere. -->
        <filter :id="`alg-planet-noise-${uid}`">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0"
          />
        </filter>

        <clipPath :id="`alg-planet-clip-${uid}`">
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>

      <!-- Sphere base -->
      <circle cx="50" cy="50" r="48" :fill="`url(#alg-planet-grad-${uid})`" />

      <!-- Atmospheric bands (rotate slowly under ambient motion) -->
      <g
        class="alg-planet-avatar__bands"
        :clip-path="`url(#alg-planet-clip-${uid})`"
        :style="{ '--alg-planet-band-rotation': `${planet.bandRotation}deg` }"
      >
        <ellipse cx="50" cy="44" rx="52" ry="9" fill="rgba(255,255,255,0.10)" />
        <ellipse cx="50" cy="60" rx="52" ry="7" fill="rgba(0,0,0,0.16)" />
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          :filter="`url(#alg-planet-noise-${uid})`"
          opacity="0.12"
        />
      </g>

      <!-- Top-left inset highlight: light from above, coherent with elevation -->
      <circle
        class="alg-planet-avatar__glint"
        cx="36"
        cy="34"
        r="20"
        fill="rgba(255,255,255,0.22)"
        :clip-path="`url(#alg-planet-clip-${uid})`"
      />
    </svg>
  </span>
</template>

<style lang="scss" scoped>
.alg-planet-avatar {
  position: relative;
  display: inline-flex;
  width: var(--alg-planet-px);
  height: var(--alg-planet-px);
  flex: 0 0 auto;
  border-radius: var(--alg-radius-pill);
  // Halo: low-opacity glow envelope pacing with the planet. Sacred chroma is
  // allowed here (Planet Avatar) — the hue is derived per-planet.
  box-shadow:
    0 0 0 1px var(--alg-glass-border),
    0 0 12px -2px oklch(0.62 0.2 var(--alg-planet-halo-hue) / 0.45);
}

.alg-planet-avatar__svg {
  display: block;
  border-radius: var(--alg-radius-pill);
}

.alg-planet-avatar__glint {
  filter: blur(6px);
}

// Ambient: slow CW rotation of the atmospheric bands — the planet turns.
// DESIGN.md §6.3 — cycle 6s, ~0.2°/s feel. Implemented as a long full turn.
.alg-planet-avatar__bands {
  transform-origin: 50% 50%;
  transform: rotate(var(--alg-planet-band-rotation));
  animation: alg-planet-spin 60s linear infinite;
}

@keyframes alg-planet-spin {
  from {
    transform: rotate(var(--alg-planet-band-rotation));
  }
  to {
    transform: rotate(calc(var(--alg-planet-band-rotation) + 360deg));
  }
}

// Reduced motion: the planet stops turning but keeps its living chroma.
@media (prefers-reduced-motion: reduce) {
  .alg-planet-avatar__bands {
    animation: none;
  }
}
</style>
