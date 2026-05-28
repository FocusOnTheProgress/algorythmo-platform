// algorythmo: M6.1-c — ReportsCommercialOverlay composition spec.
// Mirrors the pattern established by OperacaoDashboard.spec.js (canonical) and
// MarketingDashboard.spec.js (derived). Asserts: layout, anchor KPIs, secondary
// KPIs, chart container, agent panel — without forking SectorDashboard internals.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReportsCommercialOverlay from '../ReportsCommercialOverlay.vue';
import commercialMock from '../../mocks/sectors/commercial';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountOverlay() {
  return mount(ReportsCommercialOverlay, {
    global: {
      stubs: {
        LineChart: { template: '<div class="alg-stub-line" />' },
        PieChart: { template: '<div class="alg-stub-pie" />' },
      },
    },
  });
}

describe('ReportsCommercialOverlay (M6.1-c)', () => {
  it('mounts without error', () => {
    expect(() => mountOverlay()).not.toThrow();
  });

  it('renders side-by-side layout (dashboard + agent chat)', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(true);
    expect(wrapper.find('.alg-sector').exists()).toBe(true);
    expect(wrapper.find('.alg-agent').exists()).toBe(true);
  });

  it('watermark element is present (DADOS DE DEMONSTRAÇÃO)', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-sector__watermark').exists()).toBe(true);
  });

  it('renders 2 anchor KPIs — Receita fechada + Conversão', () => {
    const wrapper = mountOverlay();
    const values = wrapper
      .findAll('.alg-sector__anchor-value')
      .map(el => el.text());
    expect(values).toEqual(['R$ 184.720', '18,4%']);
  });

  it('renders 4 secondary KPIs — Leads / Ciclo / Ticket / Canal', () => {
    const wrapper = mountOverlay();
    const values = wrapper
      .findAll('.alg-sector__secondary-value')
      .map(el => el.text());
    expect(values).toEqual(['412', '11,2 dias', 'R$ 484,90', 'WhatsApp · 48%']);
  });

  it('chart container exists (12-week Receita por semana)', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-sector__chart').exists()).toBe(true);
  });

  it('passes the commercial headingKey to SectorDashboard aria-label', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-sector').attributes('aria-label')).toBe(
      commercialMock.headingKey
    );
  });
});
