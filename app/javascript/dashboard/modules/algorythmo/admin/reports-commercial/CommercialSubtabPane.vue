<script setup>
// algorythmo: plan 0007 M2-c — Commercial sub-tab deep view (legacy reports).
// One focused mock (anchor + 12-week chart, watermarked) per legacy Chatwoot
// report, plus a link into the unabridged upstream report. The heavy report
// SFCs are deliberately NOT embedded here (own store + chrome); the link keeps
// them one click away while real KPIs are pending.
import { defineAsyncComponent, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';

const props = defineProps({
  // One descriptor from mocks/sectors/commercial-subtabs.js.
  view: {
    type: Object,
    required: true,
  },
});

const { t } = useI18n();
const { accountScopedRoute } = useAccount();

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

const fullReportTo = computed(() => accountScopedRoute(props.view.routeName));
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
      <RouterLink class="alg-subtab__link" :to="fullReportTo">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OPEN_FULL_REPORT') }}
      </RouterLink>
    </div>
    <div class="alg-sector__chart alg-subtab__chart">
      <p class="alg-sector__chart-title">{{ t(view.chartTitleKey) }}</p>
      <div class="alg-sector__chart-canvas">
        <LineChart :collection="collection" />
      </div>
    </div>
  </section>
</template>
