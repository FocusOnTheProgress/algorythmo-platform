import { shallowMount } from '@vue/test-utils';
import LineChart from '../charts/LineChart.vue';

// vue-chartjs components rely on canvas APIs not available in jsdom.
// Stub the underlying Line primitive so the test focuses on props plumbing.
vi.mock('vue-chartjs', () => ({
  Line: {
    name: 'Line',
    props: ['data', 'options'],
    template: '<canvas data-testid="line-canvas" />',
  },
}));

// chart.js registration side-effects require a real browser canvas.
// Stub the module so imports resolve cleanly in jsdom.
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  PointElement: {},
  LineElement: {},
  CategoryScale: {},
  LinearScale: {},
  Filler: {},
}));

const mockCollection = {
  labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
  datasets: [
    {
      label: 'Estoque (R$ K)',
      data: [412, 398, 425, 441],
      borderColor: '#6366f1',
      tension: 0.3,
      fill: false,
    },
  ],
};

describe('LineChart', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(LineChart);
    expect(wrapper.vm).toBeTruthy();
  });

  it('passes collection to the Line primitive', () => {
    const wrapper = shallowMount(LineChart, {
      props: { collection: mockCollection },
    });
    const line = wrapper.findComponent({ name: 'Line' });
    expect(line.props('data')).toEqual(mockCollection);
  });

  it('merges chartOptions on top of defaults', () => {
    const override = { animation: { duration: 300 } };
    const wrapper = shallowMount(LineChart, {
      props: { collection: mockCollection, chartOptions: override },
    });
    const line = wrapper.findComponent({ name: 'Line' });
    expect(line.props('options').animation.duration).toBe(300);
  });

  it('uses empty object defaults when no props are supplied', () => {
    const wrapper = shallowMount(LineChart);
    const line = wrapper.findComponent({ name: 'Line' });
    // default collection prop
    expect(line.props('data')).toEqual({});
    // options should carry the responsive flag from defaultChartOptions
    expect(line.props('options').responsive).toBe(true);
  });

  it('configures x-axis to hide chart-area grid lines by default', () => {
    const wrapper = shallowMount(LineChart, {
      props: { collection: mockCollection },
    });
    const line = wrapper.findComponent({ name: 'Line' });
    expect(line.props('options').scales.x.grid.drawOnChartArea).toBe(false);
  });
});
