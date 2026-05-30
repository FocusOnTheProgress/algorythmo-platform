<script setup>
// algorythmo: Stream E3 — Impact Simulator (the differentiator).
//
// Right panel: the four macro indicators rendered as small projection charts.
// When a proposal is previewed (hover/select) the active projection flows down
// to each chart as a `ghost` series and the charts draw a dotted ICE
// projected-future line. Dismissing/clearing reverts every chart to baseline.
//
// This component is presentation-only: the parent (CLevelsBoardroom) owns the
// active projection and passes it in. That keeps the simulator a pure function
// of (indicators, projection) — exactly the seam the real simulator engine
// drops into.
//
// TODO(real-wiring): `projection` is computed today from the scripted demo
// proposal. The OS simulator engine will compute it from the proposal + the
// live macro model; the prop shape (indicatorId → 12-point series) is stable.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import ProjectionChart from './ProjectionChart.vue';
import { INDICATORS, PROJECTION_SPLIT } from './clevels.demo.js';

const props = defineProps({
  // Active projection map (indicatorId → 12-pt series) or null for baseline.
  projection: {
    type: Object,
    default: null,
  },
  // Label of the proposal currently being previewed (for the header caption).
  previewLabel: {
    type: String,
    default: '',
  },
});

const { t } = useI18n();

const indicators = INDICATORS;
const split = PROJECTION_SPLIT;

const hasProjection = computed(
  () => !!props.projection && Object.keys(props.projection).length > 0
);
</script>

<template>
  <aside
    class="alg-cl-sim"
    :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.ARIA_PANEL')"
  >
    <header class="alg-cl-sim__head">
      <p class="alg-cl-sim__eyebrow">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.EYEBROW') }}
      </p>
      <h2 class="alg-cl-sim__title">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.TITLE') }}
      </h2>
      <transition name="alg-cl-fade" mode="out-in">
        <p
          v-if="hasProjection && previewLabel"
          key="preview"
          class="alg-cl-sim__state alg-cl-sim__state--live"
        >
          <span class="alg-cl-sim__dot" aria-hidden="true" />
          {{
            t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.PREVIEWING', {
              label: previewLabel,
            })
          }}
        </p>
        <p v-else key="baseline" class="alg-cl-sim__state">
          {{ t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.BASELINE_HINT') }}
        </p>
      </transition>
    </header>

    <div class="alg-cl-sim__charts" data-alg-reveal-sim>
      <ProjectionChart
        v-for="indicator in indicators"
        :key="indicator.id"
        class="alg-cl-sim__chart"
        :indicator="indicator"
        :baseline="indicator.baseline"
        :ghost="hasProjection ? projection[indicator.id] || null : null"
        :split="split"
      />
    </div>

    <p class="alg-cl-sim__footnote">
      {{ t('ALGORYTHMO_ADMIN.C_LEVELS.SIMULATOR.FOOTNOTE') }}
    </p>
  </aside>
</template>

<style lang="scss" scoped>
.alg-cl-sim {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-5);
  height: 100%;
  min-height: 0;
  padding: var(--alg-space-5);
  background: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-lg);
  box-shadow: var(--alg-elevation-1);
}

.alg-cl-sim__head {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-cl-sim__eyebrow {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-sim__title {
  margin: 0;
  font-size: var(--alg-text-lg);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-sim__state {
  margin: var(--alg-space-1) 0 0;
  display: inline-flex;
  align-items: center;
  gap: var(--alg-space-2);
  font-size: var(--alg-text-xs);
  line-height: 1.45;
  color: var(--alg-fg-tertiary);
}

.alg-cl-sim__state--live {
  color: var(--alg-fg-secondary);
}

.alg-cl-sim__dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-ice-2);
  box-shadow: 0 0 8px 0 oklch(0.86 0.075 225 / 0.7);
  animation: alg-cl-pulse var(--alg-duration-ambient-fast)
    var(--alg-ease-ambient) infinite alternate;
}

.alg-cl-sim__charts {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-5);
  flex: 1 1 auto;
  min-height: 0;
}

.alg-cl-sim__footnote {
  margin: 0;
  font-size: var(--alg-text-2xs);
  line-height: 1.5;
  color: var(--alg-fg-quaternary, var(--alg-fg-tertiary));
}

.alg-cl-fade-enter-active,
.alg-cl-fade-leave-active {
  transition: opacity var(--alg-duration-base) var(--alg-ease-cinematic);
}
.alg-cl-fade-enter-from,
.alg-cl-fade-leave-to {
  opacity: 0;
}

@keyframes alg-cl-pulse {
  from {
    opacity: 0.55;
  }
  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-sim__dot {
    animation: none;
  }
}
</style>
