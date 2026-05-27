import { shallowMount } from '@vue/test-utils';
import PieChart from '../charts/PieChart.vue';

// vue-chartjs components rely on canvas APIs not available in jsdom.
// Stub the underlying Pie primitive so the test focuses on props plumbing.
vi.mock('vue-chartjs', () => ({
  Pie: {
    name: 'Pie',
    props: ['data', 'options'],
    template: '<canvas data-testid="pie-canvas" />',
  },
}));

// chart.js registration side-effects require a real browser canvas.
// Stub the module so imports resolve cleanly in jsdom.
vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  Title: {},
  Tooltip: {},
  Legend: {},
  ArcElement: {},
}));

const mockCollection = {
  labels: ['Alpha', 'Beta', 'Gamma'],
  datasets: [
    {
      data: [30, 50, 20],
      backgroundColor: ['#e07', '#07e', '#0e7'],
    },
  ],
};

describe('PieChart', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PieChart);
    expect(wrapper.vm).toBeTruthy();
  });

  it('passes collection to the Pie primitive', () => {
    const wrapper = shallowMount(PieChart, {
      props: { collection: mockCollection },
    });
    const pie = wrapper.findComponent({ name: 'Pie' });
    expect(pie.props('data')).toEqual(mockCollection);
  });

  it('merges chartOptions on top of defaults', () => {
    const override = { animation: { duration: 500 } };
    const wrapper = shallowMount(PieChart, {
      props: { collection: mockCollection, chartOptions: override },
    });
    const pie = wrapper.findComponent({ name: 'Pie' });
    expect(pie.props('options').animation.duration).toBe(500);
  });

  it('uses empty object defaults when no props are supplied', () => {
    const wrapper = shallowMount(PieChart);
    const pie = wrapper.findComponent({ name: 'Pie' });
    // default collection prop
    expect(pie.props('data')).toEqual({});
    // options should still carry the responsive flag from defaultChartOptions
    expect(pie.props('options').responsive).toBe(true);
  });
});
