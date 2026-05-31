<script setup>
// algorythmo: Stream E3 — Impact Simulator projection chart (inline SVG).
//
// One macro indicator rendered as a small sparkline. Dependency-light by
// design (DESIGN.md: no heavy chart lib) and fully on-brand: monochrome solid
// line for the live baseline, a dotted ICE ghost line for the projected
// future when a proposal is selected. The ghost diverges at "now" and bends
// over the tail (~3 months out), exactly the differentiator the round spec
// calls for.
//
// All geometry is computed in a fixed 0..100 × 0..100 viewBox and the SVG
// scales fluidly via CSS — pixel-crisp at every breakpoint, no JS resize.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  // Indicator descriptor from clevels.demo.js (labelKey, unit, format, goodUp).
  indicator: {
    type: Object,
    required: true,
  },
  // 12-point live series (the "now").
  baseline: {
    type: Array,
    required: true,
  },
  // 12-point ghost series, or null when no proposal is previewed.
  ghost: {
    type: Array,
    default: null,
  },
  // Index where the projection diverges from baseline ("now").
  split: {
    type: Number,
    default: 8,
  },
});

const { t } = useI18n();

const VIEW = 100;
const PAD_X = 3;
const PAD_TOP = 16; // headroom for the value label drawn above the plot
const PAD_BOTTOM = 6;

// Domain across BOTH series so the ghost never clips out of frame.
const domain = computed(() => {
  const all = [...props.baseline, ...(props.ghost || [])];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = (max - min) * 0.18 || 1;
  return { min: min - pad, max: max + pad };
});

function x(i, len) {
  const span = VIEW - PAD_X * 2;
  return PAD_X + (i / (len - 1)) * span;
}
function y(value) {
  const { min, max } = domain.value;
  const span = VIEW - PAD_TOP - PAD_BOTTOM;
  const ratio = (value - min) / (max - min || 1);
  return PAD_TOP + (1 - ratio) * span;
}

// Smooth-ish path via Catmull-Rom → cubic Bézier so the line reads premium,
// not a jagged polyline. Slice support lets us draw partial series.
function pathFor(series, fromIndex = 0) {
  const pts = series
    .map((v, i) => ({ x: x(i, series.length), y: y(v), i }))
    .filter(p => p.i >= fromIndex);
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i === 0 ? 0 : i - 1];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

const baselinePath = computed(() => pathFor(props.baseline));
// Ghost is drawn from the split point so it visibly branches off "now".
const ghostPath = computed(() =>
  props.ghost ? pathFor(props.ghost, props.split) : ''
);
const nowX = computed(() => x(props.split, props.baseline.length));

// Subtle area fill under the baseline for depth (closes to the floor).
const baselineArea = computed(() => {
  const floor = (VIEW - PAD_BOTTOM).toFixed(2);
  const first = `${PAD_X.toFixed(2)} ${floor}`;
  const last = `${(VIEW - PAD_X).toFixed(2)} ${floor}`;
  return `${baselinePath.value} L ${last} L ${first} Z`;
});

function fmt(value) {
  const { format, unit } = props.indicator;
  switch (format) {
    case 'currencyK':
      return `${unit} ${Math.round(value)}k`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'csat':
      return `${Math.round(value)}`;
    default:
      return `${Math.round(value)}${unit}`;
  }
}

const nowValue = computed(() => props.baseline[props.split]);
const projectedValue = computed(() =>
  props.ghost ? props.ghost[props.ghost.length - 1] : null
);

// Delta direction relative to "now", oriented by whether up is good.
const delta = computed(() => {
  if (projectedValue.value === null) return null;
  const diff = projectedValue.value - nowValue.value;
  const positive = props.indicator.goodUp ? diff >= 0 : diff <= 0;
  let sign = '';
  if (diff > 0) sign = '+';
  else if (diff < 0) sign = '−';
  return {
    positive,
    label: `${sign}${fmt(Math.abs(diff)).replace(/^[^\d-]+/, '')}`,
  };
});
</script>

<template>
  <figure class="alg-cl-chart" :class="{ 'alg-cl-chart--projected': !!ghost }">
    <figcaption class="alg-cl-chart__head">
      <span class="alg-cl-chart__label">{{ t(indicator.labelKey) }}</span>
      <span class="alg-cl-chart__values">
        <span class="alg-cl-chart__now">{{ fmt(nowValue) }}</span>
        <span
          v-if="ghost"
          class="alg-cl-chart__delta"
          :class="
            delta.positive
              ? 'alg-cl-chart__delta--up'
              : 'alg-cl-chart__delta--down'
          "
        >
          {{ delta.label }}
        </span>
      </span>
    </figcaption>

    <svg
      class="alg-cl-chart__svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="img"
      :aria-label="
        ghost
          ? t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.ARIA_PROJECTED', {
              name: t(indicator.labelKey),
              now: fmt(nowValue),
              projected: fmt(projectedValue),
            })
          : t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.ARIA_BASELINE', {
              name: t(indicator.labelKey),
              now: fmt(nowValue),
            })
      "
    >
      <!-- baseline area + line -->
      <path class="alg-cl-chart__area" :d="baselineArea" />
      <path class="alg-cl-chart__line" :d="baselinePath" />

      <!-- "now" marker -->
      <line
        class="alg-cl-chart__now-rule"
        :x1="nowX"
        :y1="PAD_TOP - 4"
        :x2="nowX"
        :y2="VIEW - PAD_BOTTOM"
      />

      <!-- dotted ghost projection -->
      <path
        v-if="ghost"
        class="alg-cl-chart__ghost"
        :d="ghostPath"
        pathLength="1"
      />
    </svg>
  </figure>
</template>

<style lang="scss" scoped>
.alg-cl-chart {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-cl-chart__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--alg-space-2);
}

.alg-cl-chart__label {
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  font-variant-numeric: tabular-nums;
}

.alg-cl-chart__values {
  display: inline-flex;
  align-items: baseline;
  gap: var(--alg-space-2);
}

.alg-cl-chart__now {
  font-size: var(--alg-text-sm);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
}

.alg-cl-chart__delta {
  font-size: var(--alg-text-2xs);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  padding: 1px var(--alg-space-2);
  border-radius: var(--alg-radius-pill);
  transition: opacity var(--alg-duration-base) var(--alg-ease-cinematic);
}
.alg-cl-chart__delta--up {
  color: var(--alg-color-success);
  background: var(--alg-color-success-subtle);
}
.alg-cl-chart__delta--down {
  color: var(--alg-color-danger);
  background: var(--alg-color-danger-subtle);
}

.alg-cl-chart__svg {
  display: block;
  width: 100%;
  height: 64px;
  overflow: visible;
}

.alg-cl-chart__area {
  fill: var(--alg-bg-tint-low);
  stroke: none;
  opacity: 0.7;
}

.alg-cl-chart__line {
  fill: none;
  stroke: var(--alg-fg-secondary);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.alg-cl-chart__now-rule {
  stroke: var(--alg-border);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  vector-effect: non-scaling-stroke;
}

// The ghost: dotted ICE line that draws in when a proposal is previewed.
.alg-cl-chart__ghost {
  fill: none;
  stroke: var(--alg-ice-2, oklch(0.86 0.045 220));
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-dasharray: 0.012 0.02;
  vector-effect: non-scaling-stroke;
  filter: drop-shadow(0 0 3px oklch(0.86 0.05 220 / 0.5));
  animation: alg-cl-ghost-draw var(--alg-duration-slow)
    var(--alg-ease-cinematic) both;
}

@keyframes alg-cl-ghost-draw {
  from {
    stroke-dashoffset: 1;
    opacity: 0;
  }
  to {
    stroke-dashoffset: 0;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-chart__ghost {
    animation: none;
  }
  .alg-cl-chart__delta {
    transition: none;
  }
}
</style>
