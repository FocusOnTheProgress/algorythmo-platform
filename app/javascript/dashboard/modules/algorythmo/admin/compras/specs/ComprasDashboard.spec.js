// algorythmo: M6.2 — ComprasDashboard composition spec.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ComprasDashboard from '../ComprasDashboard.vue';
import comprasMock from '../../mocks/sectors/compras';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(ComprasDashboard, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('ComprasDashboard (M6.2 derived)', () => {
  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('passes the founder-locked Compras mock to SectorDashboard', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      comprasMock.headingKey
    );
  });

  it('renders the Pedidos pendentes + Lead time anchor values', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['R$ 156.800', '8,4 dias']);
  });

  it('renders 4 secondary KPIs (fornecedores / pedidos / cotações / economia)', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['47', '23', '11', '4,2%']);
  });
});
