// algorythmo: plan 0007 M2-g — Facilities sector on SectorShellV2.
// The route entry delegates to FacilitiesShell, which composes the v2 shell:
// dense Overview (default) + a Controle sub-tab + a full-width agent chat.
// Asserts the shell wiring, the Overview watermark contract, the Controle tab,
// and per-sub-tab cut-flag gating — without exercising chart/store internals.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import FacilitiesDashboard from '../FacilitiesDashboard.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '1' } }),
}));

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountId: { value: 1 },
    accountScopedRoute: name => ({ name }),
  }),
}));

// Default: no cut flags active → Controle visible. The current-user getter
// feeds the Controle localStorage scope; both go through useMapGetter.
const featureGate = vi.fn(() => false);
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: getter =>
    getter === 'auth/getCurrentUser'
      ? { value: { id: 7 } }
      : { value: featureGate },
}));

function mountDashboard() {
  return mount(FacilitiesDashboard, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        LineChart: { template: '<div class="alg-stub-line" />' },
      },
    },
  });
}

describe('FacilitiesDashboard (M2-g)', () => {
  beforeEach(() => {
    featureGate.mockReset();
    featureGate.mockReturnValue(false);
    localStorage.clear();
  });

  it('mounts without error', () => {
    expect(() => mountDashboard()).not.toThrow();
  });

  it('renders the SectorShellV2 shell', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell').exists()).toBe(true);
  });

  it('Overview is the first tab and is selected by default', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('exposes Overview plus the Controle sub-tab when nothing is cut', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
  });

  it('renders a Controle panel wired to its tab', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('#alg-sector-panel-controle').exists()).toBe(true);
  });

  it('Overview pane carries the demonstration watermark', () => {
    // plan 0009: single .alg-sector__watermark per pane (premium layout).
    const wrapper = mountDashboard();
    expect(
      wrapper
        .find('#alg-sector-panel-overview .alg-sector__watermark')
        .exists()
    ).toBe(true);
  });

  it('anchors the agent chat at the foot via the chatHeadingKey', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.AGENT_CHAT_HEADING'
    );
  });

  it('watermark is in Overview pane, not in the Controle tables', () => {
    const wrapper = mountDashboard();
    // Overview carries the demonstration watermark (D12 contract).
    expect(
      wrapper
        .find('#alg-sector-panel-overview .alg-sector__watermark')
        .exists()
    ).toBe(true);
    // Controle tables must NOT carry it — data is real, not mocked.
    expect(
      wrapper
        .find('#alg-sector-panel-controle .alg-control__watermark')
        .exists()
    ).toBe(false);
    expect(
      wrapper
        .find('#alg-sector-panel-controle .alg-sector__watermark')
        .exists()
    ).toBe(false);
  });

  it('hides the Controle sub-tab when its cut flag is active (D10)', () => {
    featureGate.mockImplementation(
      (_accountId, flag) => flag === 'algorythmo_cut_sector_facilities_controle'
    );
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(wrapper.find('#alg-sector-panel-controle').exists()).toBe(false);
  });

  it('never cuts the Overview tab even if every cut is set', () => {
    featureGate.mockReturnValue(true);
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(1);
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });
});
