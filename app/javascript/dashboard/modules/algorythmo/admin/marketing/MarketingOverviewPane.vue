<script setup>
// algorythmo: plan 0007 M2-d — Marketing Overview central (D2 + D12).
// Dense data grid: one anchor KPI + one mini sparkline per Marketing sub-area.
// Mock-backed (marketing-overview.js); every card carries the demonstration
// watermark so the mock never reads as a real source of truth.
import { defineAsyncComponent, h, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import overviewCards from '../mocks/sectors/marketing-overview';

const { t } = useI18n();

const ChartLoading = () =>
  h('div', {
    class: 'alg-overview__spark alg-overview__spark--loading',
    'aria-hidden': 'true',
  });
const ChartError = () =>
  h(
    'div',
    { class: 'alg-overview__spark alg-overview__spark--error', role: 'note' },
    t('ALGORYTHMO_ADMIN.SECTORS.CHART_ERROR')
  );

const LineChart = defineAsyncComponent({
  loader: () => import('shared/components/charts/LineChart.vue'),
  loadingComponent: ChartLoading,
  errorComponent: ChartError,
  delay: 120,
  timeout: 8000,
});

// Sparkline chrome: no axes, no grid, no ticks — a glance, not a report.
const sparkOptions = {
  scales: { x: { display: false }, y: { display: false } },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  elements: { point: { radius: 0 } },
};

const cards = computed(() =>
  overviewCards.map(card => ({
    ...card,
    collection: {
      labels: card.sparkline.map((_, idx) => String(idx + 1)),
      datasets: [
        {
          data: card.sparkline,
          borderColor: 'rgba(255, 255, 255, 0.72)',
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
          borderWidth: 1.5,
          tension: 0.35,
          fill: true,
        },
      ],
    },
  }))
);
</script>

<template>
  <div
    class="alg-overview"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.ARIA')"
  >
    <article
      v-for="card in cards"
      :key="card.id"
      class="alg-card alg-overview__card"
    >
      <span class="alg-overview__watermark" aria-hidden="true">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
      </span>
      <p class="alg-overview__label">{{ t(card.labelKey) }}</p>
      <p class="alg-overview__value">{{ card.value }}</p>
      <p class="alg-overview__delta">
        <span class="alg-overview__delta-glyph" aria-hidden="true">{{
          card.delta.glyph
        }}</span>
        <span>{{ card.delta.text }}</span>
      </p>
      <div class="alg-overview__spark-wrap">
        <p class="alg-overview__spark-title">{{ t(card.chartTitleKey) }}</p>
        <div class="alg-overview__spark-canvas">
          <LineChart
            :collection="card.collection"
            :chart-options="sparkOptions"
          />
        </div>
      </div>
    </article>
  </div>
</template>
