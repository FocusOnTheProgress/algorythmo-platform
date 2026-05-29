// algorythmo: plan 0007 M2-d — Marketing migrated to SectorShellV2.
// The route entry now delegates to MarketingShell, which composes the v2 shell:
// dense Overview (default) + five mocked sub-tabs + a live Campanhas tab + a
// full-width agent chat. Asserts the shell wiring, the Overview watermark
// contract, the Campanhas tab, and per-sub-tab cut-flag gating — without
// exercising the heavy chart internals (stubbed).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MarketingDashboard from '../MarketingDashboard.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '1' } }),
}));

// useAccount.accountScopedRoute is exercised by MarketingCampaignsPane links.
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: name => ({ name }),
  }),
}));

// Default: no cut flags active → all six sub-tabs visible. Individual tests
// override the getter to assert gating.
const featureGate = vi.fn(() => false);
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: () => ({ value: featureGate }),
}));

function mountDashboard() {
  return mount(MarketingDashboard, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        LineChart: { template: '<div class="alg-stub-line" />' },
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
}

describe('MarketingDashboard (M2-d)', () => {
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

  it('exposes Overview plus the six Marketing sub-tabs when nothing is cut', () => {
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    // overview + branding + campanhas + redes_sociais + trafego + crm + retencao
    expect(tabs).toHaveLength(7);
  });

  it('renders a Campanhas panel wired to its tab', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('#alg-sector-panel-campanhas').exists()).toBe(true);
  });

  it('Campanhas links to the two live campaign routes (D8)', () => {
    const wrapper = mountDashboard();
    const links = wrapper.findAll('#alg-sector-panel-campanhas a');
    // Exactly the two D8 campaign families (ongoing + one-off) are surfaced.
    expect(links).toHaveLength(2);
    // The pane now renders labels via i18n keys (the stub echoes the key), and
    // each card also contains the "Acessar" chip + description, so the link
    // text is a concatenation — assert the label key is *present* in the
    // combined text of the two links rather than an exact array membership.
    const combined = links.map(a => a.text()).join(' | ');
    expect(combined).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONGOING_LABEL'
    );
    expect(combined).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ONE_OFF_LABEL'
    );
  });

  it('Overview pane carries the demonstration watermark', () => {
    // plan 0009: premium layout uses a single .alg-sector__watermark per pane,
    // not one per card (the old alg-overview__watermark pattern is replaced).
    const wrapper = mountDashboard();
    const watermark = wrapper.find('.alg-sector__watermark');
    expect(watermark.exists()).toBe(true);
  });

  it('anchors the agent chat at the foot via the chatHeadingKey', () => {
    const wrapper = mountDashboard();
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.MARKETING.AGENT_CHAT_HEADING'
    );
  });

  it('hides a sub-tab when its cut flag is active (D10)', () => {
    // Cut only the Campanhas sub-tab; Overview + the other five stay visible.
    featureGate.mockImplementation(
      (_accountId, flag) => flag === 'algorythmo_cut_sector_marketing_campanhas'
    );
    const wrapper = mountDashboard();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(6);
    expect(wrapper.find('#alg-sector-panel-campanhas').exists()).toBe(false);
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
