<script setup>
// algorythmo: plan 0007 M2-e — Administration sub-tab deep view.
// One focused mock (anchor + 12-month chart, watermarked) per Administration
// sub-area. These sub-tabs have no live upstream report to deep-link into —
// real KPIs land when the founder unblocks the backend.
import { defineAsyncComponent, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlgChartTheme } from 'dashboard/composables/algorythmo/useAlgChartTheme';

const props = defineProps({
  // One descriptor from mocks/sectors/administration-subtabs.js.
  view: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();
// algorythmo: Stream E — theme-reactive chart colours (ink on paper, white on dark).
const { lineColor, fillColor } = useAlgChartTheme();

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

const LineChart = defineAsyncComponent({
  loader: () => import('shared/components/charts/LineChart.vue'),
  loadingComponent: ChartLoading,
  errorComponent: ChartError,
  delay: 120,
  timeout: 8000,
});

const collection = computed(() => ({
  labels: props.view.chartLabels,
  datasets: [
    {
      data: props.view.chartData,
      borderColor: lineColor.value,
      backgroundColor: fillColor.value,
      borderWidth: 1.5,
      tension: 0.35,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 4,
    },
  ],
}));
</script>

<template>
  <section class="alg-subtab" :aria-label="t(view.labelKey)">
    <span class="alg-subtab__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>
    <div class="alg-subtab__head">
      <div class="alg-subtab__anchor">
        <p class="alg-subtab__value">{{ view.value }}</p>
        <p class="alg-subtab__label">{{ t(view.labelKey) }}</p>
        <p class="alg-subtab__delta">
          <span class="alg-subtab__delta-glyph" aria-hidden="true">{{
            view.delta.glyph
          }}</span>
          <span>{{ view.delta.text }}</span>
        </p>
      </div>
    </div>
    <div class="alg-sector__chart alg-subtab__chart">
      <p class="alg-sector__chart-title">{{ t(view.chartTitleKey) }}</p>
      <div class="alg-sector__chart-canvas">
        <LineChart :collection="collection" />
      </div>
    </div>
  </section>
</template>
