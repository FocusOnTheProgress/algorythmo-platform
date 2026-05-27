<script setup>
// algorythmo: M6 PR-6b — sector dashboard skeleton. Magazine layout (NOT uniform
// grid): editorial header, 2 anchor KPIs (50/50), 4 secondary KPIs (4-col),
// 1 full-width async-imported chart, demonstration watermark. Plan 0005 §M6.
import { defineAsyncComponent, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  mock: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();

// Tiny chart loading + error states. Inline functional components keep them
// out of any global registry while giving Vue an explicit fallback to render
// when the async chunk is pending or fails (network blip, deploy-mid-session,
// CSP block on chart.js). Without these the user sees a silent blank rect.
const ChartLoading = () =>
  h('div', {
    class: 'alg-sector__chart-fallback alg-sector__chart-fallback--loading',
    'aria-hidden': 'true',
  });
const ChartError = () =>
  h(
    'div',
    {
      class: 'alg-sector__chart-fallback alg-sector__chart-fallback--error',
      role: 'note',
    },
    t('ALGORYTHMO_ADMIN.SECTORS.CHART_ERROR')
  );

// Async-load chart components per route — keeps bundle weight off the main
// dashboard chunk until a sector is actually opened.
const LineChart = defineAsyncComponent({
  loader: () => import('shared/components/charts/LineChart.vue'),
  loadingComponent: ChartLoading,
  errorComponent: ChartError,
  delay: 120,
  timeout: 8000,
});
const PieChart = defineAsyncComponent({
  loader: () => import('shared/components/charts/PieChart.vue'),
  loadingComponent: ChartLoading,
  errorComponent: ChartError,
  delay: 120,
  timeout: 8000,
});

const ChartComponent = computed(() =>
  props.mock.chart?.type === 'pie' ? PieChart : LineChart
);

const lineCollection = computed(() => ({
  labels: props.mock.chart?.labels ?? [],
  datasets: [
    {
      data: props.mock.chart?.data ?? [],
      borderColor: 'rgba(148, 163, 184, 0.85)',
      backgroundColor: 'rgba(148, 163, 184, 0.08)',
      borderWidth: 1.5,
      tension: 0.35,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 4,
    },
  ],
}));

const pieCollection = computed(() => ({
  labels: props.mock.chart?.labels ?? [],
  datasets: [
    {
      data: props.mock.chart?.data ?? [],
      backgroundColor: [
        'rgba(148, 163, 184, 0.55)',
        'rgba(148, 163, 184, 0.40)',
        'rgba(148, 163, 184, 0.28)',
        'rgba(148, 163, 184, 0.18)',
        'rgba(148, 163, 184, 0.10)',
      ],
      borderWidth: 0,
    },
  ],
}));

const chartCollection = computed(() =>
  props.mock.chart?.type === 'pie' ? pieCollection.value : lineCollection.value
);
</script>

<template>
  <section class="alg-sector" :aria-label="t(mock.headingKey)">
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <header class="alg-sector__header">
      <h1 class="alg-sector__title">{{ t(mock.headingKey) }}</h1>
      <p class="alg-sector__context">{{ t(mock.contextKey) }}</p>
    </header>

    <div class="alg-sector__anchors">
      <article
        v-for="(kpi, idx) in mock.anchorKpis"
        :key="`anchor-${idx}`"
        class="alg-sector__anchor"
      >
        <p class="alg-sector__anchor-value">{{ kpi.value }}</p>
        <p class="alg-sector__anchor-label">{{ t(kpi.labelKey) }}</p>
        <p v-if="kpi.delta" class="alg-sector__delta">
          <span class="alg-sector__delta-glyph" aria-hidden="true">{{
            kpi.delta.glyph
          }}</span>
          <span class="alg-sector__delta-text">{{ kpi.delta.text }}</span>
        </p>
      </article>
    </div>

    <div class="alg-sector__secondaries">
      <article
        v-for="(kpi, idx) in mock.secondaryKpis"
        :key="`secondary-${idx}`"
        class="alg-sector__secondary"
      >
        <p class="alg-sector__secondary-value">{{ kpi.value }}</p>
        <p class="alg-sector__secondary-label">{{ t(kpi.labelKey) }}</p>
        <p v-if="kpi.delta" class="alg-sector__delta">
          <span class="alg-sector__delta-glyph" aria-hidden="true">{{
            kpi.delta.glyph
          }}</span>
          <span class="alg-sector__delta-text">{{ kpi.delta.text }}</span>
        </p>
      </article>
    </div>

    <div v-if="mock.chart" class="alg-sector__chart">
      <p class="alg-sector__chart-title">{{ t(mock.chart.titleKey) }}</p>
      <div class="alg-sector__chart-canvas">
        <component :is="ChartComponent" :collection="chartCollection" />
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.alg-sector {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem 2.5rem 3rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.alg-sector__watermark {
  position: absolute;
  top: 1.25rem;
  right: 1.5rem;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.35);
  pointer-events: none;
  user-select: none;
}

.alg-sector__header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 70ch;
}

.alg-sector__title {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 1.75rem;
  font-weight: 400;
  line-height: 1.15;
  color: rgba(226, 232, 240, 0.95);
  margin: 0;
  letter-spacing: -0.005em;
}

.alg-sector__context {
  font-size: 0.875rem;
  line-height: 1.55;
  color: rgba(148, 163, 184, 0.72);
  margin: 0;
}

.alg-sector__anchors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.alg-sector__anchor {
  background: var(--color-background, #0a0e1a);
  padding: 1.5rem 1.75rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-sector__anchor-value {
  font-family:
    'InterDisplay',
    'Inter',
    -apple-system,
    system-ui,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 2rem;
  font-weight: 460;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
  color: rgba(226, 232, 240, 0.98);
  margin: 0;
}

.alg-sector__anchor-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.62);
  margin: 0;
}

.alg-sector__secondaries {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: rgba(148, 163, 184, 0.08);
}

.alg-sector__secondary {
  background: var(--color-background, #0a0e1a);
  padding: 1rem 1.125rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alg-sector__secondary-value {
  font-family:
    'InterDisplay',
    'Inter',
    -apple-system,
    system-ui,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 1.25rem;
  font-weight: 460;
  font-variant-numeric: tabular-nums;
  color: rgba(226, 232, 240, 0.92);
  margin: 0;
  line-height: 1.15;
}

.alg-sector__secondary-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.55);
  margin: 0;
}

.alg-sector__delta {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  margin: 0;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.65);
  font-variant-numeric: tabular-nums;
}

.alg-sector__delta-glyph {
  font-size: 9px;
  line-height: 1;
  color: rgba(148, 163, 184, 0.72);
}

.alg-sector__chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border: 1px solid rgba(148, 163, 184, 0.12);
  padding: 1.25rem 1.5rem 1.5rem;
}

.alg-sector__chart-title {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.62);
  margin: 0;
}

.alg-sector__chart-canvas {
  height: 220px;
  position: relative;
}

.alg-sector__chart-fallback {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.45);
}

.alg-sector__chart-fallback--loading {
  background: repeating-linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.04) 0,
    rgba(148, 163, 184, 0.04) 24px,
    transparent 24px,
    transparent 48px
  );
}

.alg-sector__chart-fallback--error {
  color: rgba(248, 113, 113, 0.6);
}
</style>
