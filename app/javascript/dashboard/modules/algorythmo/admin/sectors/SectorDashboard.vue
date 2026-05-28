<script setup>
// algorythmo: Cinematic OS v1 — sector dashboard.
// Visual register: editorial magazine (Aesop / Field Mag / Apple support docs),
// not SaaS dashboard. Anchor KPIs sit in a 2-up grid with hairline dividers;
// secondary KPIs flow in a 4-up strip; the chart panel floats on a soft glass
// surface. All visual decisions live in the design system (_components.scss
// :: `.alg-sector*`) so any sector (Marketing, Commercial, Operação) inherits
// the same treatment without forking styles.
//
// Pre-Cinematic refactor: this file owned ~190 lines of <style scoped> with
// hardcoded rgba and Georgia serif. Hoisted to the design system 2026-05-28.
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

// Chart palette — monochrome white in calibrated opacities so the chart
// reads as part of the editorial register, not a colored chart.js default.
const lineCollection = computed(() => ({
  labels: props.mock.chart?.labels ?? [],
  datasets: [
    {
      data: props.mock.chart?.data ?? [],
      borderColor: 'rgba(255, 255, 255, 0.72)',
      backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
        'rgba(255, 255, 255, 0.55)',
        'rgba(255, 255, 255, 0.38)',
        'rgba(255, 255, 255, 0.26)',
        'rgba(255, 255, 255, 0.16)',
        'rgba(255, 255, 255, 0.09)',
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
