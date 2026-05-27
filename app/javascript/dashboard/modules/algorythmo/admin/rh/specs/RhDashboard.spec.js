// algorythmo: M6.5 — RhDashboard composition spec.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RhDashboard from '../RhDashboard.vue';
import rhMock from '../../mocks/sectors/rh';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(RhDashboard, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('RhDashboard (M6.5 derived)', () => {
  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('passes the founder-locked RH mock to SectorDashboard', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      rhMock.headingKey
    );
  });

  it('renders the Headcount + Turnover anchor values', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['84', '4,8%']);
  });

  it('renders 4 secondary KPIs (contratações / vagas / absenteísmo / eNPS)', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['5', '7', '2,1%', '+42']);
  });
});
