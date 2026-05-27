// algorythmo: M6.0 — OperacaoDashboard composition spec.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import OperacaoDashboard from '../OperacaoDashboard.vue';
import operacaoMock from '../../mocks/sectors/operacao';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(OperacaoDashboard, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('OperacaoDashboard (M6.0 canonical)', () => {
  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('passes the founder-locked Operação mock to SectorDashboard', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      operacaoMock.headingKey
    );
  });

  it('renders the canonical Estoque + Giro anchor values', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['R$ 487.300', '42 dias']);
  });

  it('renders 4 secondary KPIs (SKUs / ruptura / expedição / CMV)', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['1.247', '3,8%', '2,4h', '62,3%']);
  });
});
