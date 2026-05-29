// algorythmo: plan 0007 M2-e — Operations migrated to SectorShellV2.
// The route entry now delegates to OperationsShell, which composes the v2
// shell: dense Overview (default) + six mocked sub-tabs + a full-width agent
// chat. Asserts the shell wiring, the Overview watermark contract, and
// per-sub-tab cut-flag gating — without exercising the heavy chart internals
// (stubbed).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import OperacaoDashboard from '../OperacaoDashboard.vue';

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
  return mount(OperacaoDashboard, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        LineChart: { template: '<div class="alg-stub-line" />' },
      },
    },
  });
}

describe('OperacaoDashboard (M2-e)', () => {
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

  it('exposes Overview plus the six Operations sub-tabs when nothing is cut', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    // overview + estoque + reposicao + logistica + organizacao + entrega + expedicao
    expect(tabs).toHaveLength(7);
  });

  it('Overview pane carries the demonstration watermark', () => {
    // plan 0009: single .alg-sector__watermark per pane (premium layout).
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-sector__watermark').exists()).toBe(true);
  });

  it('anchors the agent chat at the foot via the chatHeadingKey', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.AGENT_CHAT_HEADING'
    );
  });

  it('hides a sub-tab when its cut flag is active (D10)', () => {
    featureGate.mockImplementation(
      (_accountId, flag) => flag === 'algorythmo_cut_sector_operations_estoque'
    );
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(6);
    expect(wrapper.find('#alg-sector-panel-estoque').exists()).toBe(false);
  });

  it('never cuts the Overview tab even if every sub-tab is cut', () => {
    featureGate.mockReturnValue(true);
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });
});
