<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Filler,
} from 'chart.js';

const props = defineProps({
  collection: {
    type: Object,
    default: () => ({}),
  },
  chartOptions: {
    type: Object,
    default: () => ({}),
  },
});

ChartJS.register(
  Title,
  Tooltip,
  PointElement,
  LineElement,
  CategoryScale,
  LinearScale,
  Filler
);

const fontFamily =
  'Inter,-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';

const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0,
  },
  plugins: {
    legend: {
      display: false,
      labels: {
        font: {
          family: fontFamily,
        },
      },
    },
    tooltip: {
      titleFont: {
        family: fontFamily,
      },
      bodyFont: {
        family: fontFamily,
      },
    },
  },
  scales: {
    x: {
      ticks: {
        font: {
          family: fontFamily,
        },
      },
      grid: {
        drawOnChartArea: false,
      },
    },
    y: {
      type: 'linear',
      position: 'left',
      ticks: {
        font: {
          family: fontFamily,
        },
        beginAtZero: false,
      },
      grid: {
        drawOnChartArea: false,
      },
    },
  },
};

const options = computed(() => {
  return { ...defaultChartOptions, ...props.chartOptions };
});
</script>

<template>
  <Line :data="collection" :options="options" />
</template>
