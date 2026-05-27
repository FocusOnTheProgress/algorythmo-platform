// algorythmo: M6.6 — MarketingDashboard composition spec.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MarketingDashboard from '../MarketingDashboard.vue';
import marketingMock from '../../mocks/sectors/marketing';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(MarketingDashboard, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('MarketingDashboard (M6.6 derived)', () => {
  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('passes the founder-locked Marketing mock to SectorDashboard', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      marketingMock.headingKey
    );
  });

  it('renders the CAC + ROAS anchor values', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['R$ 187', '4,2x']);
  });

  it('renders 4 secondary KPIs (leads / MQLs / CTR / CPL)', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['1.842', '387', '2,8%', 'R$ 23,40']);
  });
});
