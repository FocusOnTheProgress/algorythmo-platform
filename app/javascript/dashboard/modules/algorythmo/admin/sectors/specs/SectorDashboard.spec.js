// algorythmo: M6 PR-6b — SectorDashboard unit spec
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SectorDashboard from '../SectorDashboard.vue';
import operacaoMock from '../../mocks/sectors/operacao';

// vue-i18n's `t` is stubbed so assertions can target keys, not translations.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(SectorDashboard, {
    props: { mock: operacaoMock },
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('SectorDashboard', () => {
  it('renders the root with aria-label tied to mock heading', () => {
    const wrapper = mountDashboard();
    const root = wrapper.find('.alg-sector');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBe(operacaoMock.headingKey);
  });

  it('renders the demonstration watermark', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector__watermark').exists()).toBe(true);
  });

  it('renders editorial header with title + context', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector__title').text()).toBe(
      operacaoMock.headingKey
    );
    expect(wrapper.find('.alg-sector__context').text()).toBe(
      operacaoMock.contextKey
    );
  });

  it('renders exactly 2 anchor KPIs', () => {
    const wrapper = mountDashboard();
    expect(wrapper.findAll('.alg-sector__anchor')).toHaveLength(2);
  });

  it('renders exactly 4 secondary KPIs', () => {
    const wrapper = mountDashboard();
    expect(wrapper.findAll('.alg-sector__secondary')).toHaveLength(4);
  });

  it('exposes anchor KPI values from the mock verbatim', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['R$ 487.300', '42 dias']);
  });

  it('renders the chart slot when mock provides chart config', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector__chart').exists()).toBe(true);
    expect(wrapper.find('.alg-sector__chart-canvas').exists()).toBe(true);
  });

  it('mock has matching labels and data lengths (chart contract)', () => {
    // The dashboard renders whatever it's given; this assertion locks the
    // mock contract — labels.length === data.length is a hard rule for all
    // 6 derived sectors.
    expect(operacaoMock.chart.labels.length).toBe(
      operacaoMock.chart.data.length
    );
    expect(operacaoMock.chart.labels.length).toBe(12);
  });

  it('mock has exactly 2 anchors and 4 secondaries (layout contract)', () => {
    expect(operacaoMock.anchorKpis).toHaveLength(2);
    expect(operacaoMock.secondaryKpis).toHaveLength(4);
  });
});
