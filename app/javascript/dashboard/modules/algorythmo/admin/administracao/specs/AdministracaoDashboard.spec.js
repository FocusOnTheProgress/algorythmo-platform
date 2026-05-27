// algorythmo: M6.3 — AdministracaoDashboard composition spec.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AdministracaoDashboard from '../AdministracaoDashboard.vue';
import administracaoMock from '../../mocks/sectors/administracao';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountDashboard() {
  return mount(AdministracaoDashboard, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('AdministracaoDashboard (M6.3 derived)', () => {
  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('passes the founder-locked Administração mock to SectorDashboard', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      administracaoMock.headingKey
    );
  });

  it('renders the Contratos + Renovações anchor values', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['138', '9']);
  });

  it('renders 4 secondary KPIs (documentos / aprovações / cadastros / auditorias)', () => {
    const wrapper = mountDashboard();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['24', '7', '18', '3']);
  });
});
