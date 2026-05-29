<script setup>
// algorythmo: Cinematic OS signature component — Sunburst Orb (DESIGN.md §6.1)
//
// A radial constellation of white dots forming a pointillist sun: dense core,
// rays of growing dots radiating outward, soft circular envelope.
// MONOCHROME — white in an opacity gradient (0.95 core → 0.20 rim). NEVER
// coloured. Appears on login, Agent Studio empty, onboarding splash, and
// identity-grade empty/error states. Never in chrome, dashboards, or modals.
//
// Ambient (cycle 8s): radial breathe (scale 1.00 → 1.04) + per-ray opacity
// drift + a near-imperceptible CCW rotation. Reduced motion: rotation stops,
// breathe softens to 1.00 → 1.01.
import { computed } from 'vue';

const props = defineProps({
  size: {
    type: Number,
    default: 240,
  },
  // Primary rays. Secondary rays (offset between primaries) are derived.
  rays: {
    type: Number,
    default: 14,
  },
});

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;

// Build the constellation: for each ray, a line of dots from the dense core
// outward, dot radius and opacity decaying with distance. Secondary rays are
// offset half a step and start farther out with smaller dots, filling gaps.
const dots = computed(() => {
  const out = [];
  const primary = props.rays;
  const dotsPerRay = 10;

  for (let r = 0; r < primary; r += 1) {
    const angle = (r / primary) * Math.PI * 2;
    const phase = (r / primary).toFixed(3); // ray-level animation desync
    for (let d = 1; d <= dotsPerRay; d += 1) {
      const t = d / dotsPerRay;
      const radius = 10 + t * 84;
      out.push({
        cx: CENTER + Math.cos(angle) * radius,
        cy: CENTER + Math.sin(angle) * radius,
        rad: 2.6 * (1 - t) + 0.5,
        opacity: 0.95 * (1 - t) + 0.2,
        phase,
        secondary: false,
      });
    }
  }

  for (let r = 0; r < primary; r += 1) {
    const angle = ((r + 0.5) / primary) * Math.PI * 2;
    const phase = ((r + 0.5) / primary).toFixed(3);
    for (let d = 4; d <= dotsPerRay; d += 1) {
      const t = d / dotsPerRay;
      const radius = 10 + t * 84;
      out.push({
        cx: CENTER + Math.cos(angle) * radius,
        cy: CENTER + Math.sin(angle) * radius,
        rad: 1.8 * (1 - t) + 0.4,
        opacity: 0.6 * (1 - t) + 0.15,
        phase,
        secondary: true,
      });
    }
  }

  return out;
});

const pxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<template>
  <span class="alg-sunburst-orb" :style="pxStyle" aria-hidden="true">
    <svg
      class="alg-sunburst-orb__svg"
      :viewBox="`0 0 ${VIEWBOX} ${VIEWBOX}`"
      width="100%"
      height="100%"
      focusable="false"
    >
      <g class="alg-sunburst-orb__field">
        <circle
          v-for="(dot, i) in dots"
          :key="i"
          :cx="dot.cx"
          :cy="dot.cy"
          :r="dot.rad"
          fill="#ffffff"
          :style="{
            '--alg-sunburst-base-opacity': dot.opacity,
            '--alg-sunburst-phase': dot.phase,
          }"
          class="alg-sunburst-orb__dot"
        />
      </g>
    </svg>
  </span>
</template>

<style lang="scss" scoped>
.alg-sunburst-orb {
  display: inline-flex;
  position: relative;
  // Soft circular envelope — a faint radial wash so the constellation has air.
  &::before {
    content: '';
    position: absolute;
    inset: -8%;
    border-radius: var(--alg-radius-pill);
    background: radial-gradient(
      circle at 50% 50%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 62%
    );
    pointer-events: none;
  }
}

.alg-sunburst-orb__svg {
  display: block;
}

// Radial breathe + slow CCW rotation — the whole constellation, as one body.
.alg-sunburst-orb__field {
  transform-origin: 50% 50%;
  animation:
    alg-sunburst-breathe var(--alg-duration-ambient-slow)
      var(--alg-ease-ambient) infinite,
    alg-sunburst-rotate 120s linear infinite reverse;
}

// Per-dot opacity drift, desynced by the ray phase so the sun looks alive
// without spinning. Negative delay seeds each ray at a different point.
.alg-sunburst-orb__dot {
  opacity: var(--alg-sunburst-base-opacity);
  animation: alg-sunburst-twinkle var(--alg-duration-ambient-slow)
    var(--alg-ease-ambient) infinite;
  animation-delay: calc(
    var(--alg-sunburst-phase) * -1 * var(--alg-duration-ambient-slow)
  );
}

@keyframes alg-sunburst-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

@keyframes alg-sunburst-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes alg-sunburst-twinkle {
  0%,
  100% {
    opacity: calc(var(--alg-sunburst-base-opacity) * 0.85);
  }
  50% {
    opacity: var(--alg-sunburst-base-opacity);
  }
}

// Reduced motion: rotation stops; breathe collapses to a near-still 1.00→1.01;
// twinkle holds steady. The orb stays present, just stops moving directionally.
@media (prefers-reduced-motion: reduce) {
  .alg-sunburst-orb__field {
    animation: alg-sunburst-breathe-reduced 8s var(--alg-ease-ambient) infinite;
  }
  .alg-sunburst-orb__dot {
    animation: none;
    opacity: var(--alg-sunburst-base-opacity);
  }
  @keyframes alg-sunburst-breathe-reduced {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.01);
    }
  }
}
</style>
