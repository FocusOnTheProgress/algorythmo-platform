// algorythmo: plan 0007 M2-f — Finance migrated to SectorShellV2.
// The route entry now delegates to FinanceShell, which composes the v2 shell:
// dense Overview (default) + six mocked sub-tabs + a full-width agent chat.
// Asserts the shell wiring, the Overview watermark contract, and per-sub-tab
// cut-flag gating (D10) — without exercising the heavy chart internals (stubbed).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FinanceiroDashboard from '../FinanceiroDashboard.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '1' } }),
}));

// Default: no cut flags active → all six sub-tabs visible. Individual tests
// override the getter to assert gating.
const featureGate = vi.fn(() => false);
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ({ value: featureGate }),
}));

function mountDashboard() {
  return mount(FinanceiroDashboard, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        LineChart: { template: '<div class="alg-stub-line" />' },
      },
    },
  });
}

describe('FinanceiroDashboard (M2-f)', () => {
  beforeEach(() => {
    featureGate.mockReset();
    featureGate.mockReturnValue(false);
  });

  it('mounts without error', () => {
    expect(() => mountDashboard()).not.toThrow();
  });

  it('renders the SectorShellV2 shell (not the old side-by-side layout)', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell').exists()).toBe(true);
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(false);
  });

  it('Overview is the first tab and is selected by default', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('exposes Overview plus the six Finance sub-tabs when nothing is cut', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    // overview + a_pagar + a_receber + fluxo + margem + lucro + planejamento
    expect(tabs).toHaveLength(7);
  });

  it('Overview cards each carry the demonstration watermark', () => {
    const wrapper = mountDashboard();
    const watermarks = wrapper.findAll('.alg-overview__watermark');
    expect(watermarks.length).toBe(6);
  });

  it('anchors the agent chat at the foot via the chatHeadingKey', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.FINANCE.AGENT_CHAT_HEADING'
    );
  });

  it('hides a sub-tab when its cut flag is active (D10)', () => {
    // Cut only the Planejamento sub-tab; Overview + the other five stay visible.
    featureGate.mockImplementation(
      (_accountId, flag) =>
        flag === 'algorythmo_cut_sector_finance_planejamento'
    );
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(6);
    expect(wrapper.find('#alg-sector-panel-planejamento').exists()).toBe(false);
  });

  it('never cuts the Overview tab even if a phantom overview cut is set', () => {
    featureGate.mockReturnValue(true);
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    // Every operational sub-tab cut → only Overview remains.
    expect(tabs).toHaveLength(1);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });
});
