// algorythmo: plan 0007 M2-c — Commercial migrated to SectorShellV2.
// The overlay now delegates to CommercialShell, which composes the v2 shell:
// dense Overview (default) + legacy report sub-tabs + read-only Customer
// Support + a full-width agent chat. Asserts the shell wiring, the Overview
// watermark contract, and the Customer Support tab — without exercising the
// heavy chart / store internals (stubbed).
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ReportsCommercialOverlay from '../ReportsCommercialOverlay.vue';
import subtabViews from '../../mocks/sectors/commercial-subtabs';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
}));

// useAccount.accountScopedRoute is exercised by CommercialSubtabPane links.
vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({
    accountScopedRoute: name => ({ name }),
  }),
}));

// CustomerSupportPane reads the Help Center store; stub it to a flat read-only
// surface so this suite stays focused on the shell composition.
vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch: vi.fn().mockResolvedValue(undefined) }),
  useMapGetter: () => ({ value: [] }),
}));

function mountOverlay() {
  return mount(ReportsCommercialOverlay, {
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
        LineChart: { template: '<div class="alg-stub-line" />' },
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });
}

describe('ReportsCommercialOverlay (M2-c)', () => {
  it('mounts without error', () => {
    expect(() => mountOverlay()).not.toThrow();
  });

  it('renders the SectorShellV2 shell (not the old side-by-side layout)', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-shell').exists()).toBe(true);
    expect(wrapper.find('.alg-sector-layout').exists()).toBe(false);
  });

  it('Overview is the first tab and is selected by default', () => {
    const wrapper = mountOverlay();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('exposes one tab per legacy report plus Overview and Customer Support', () => {
    const wrapper = mountOverlay();
    const tabs = wrapper.findAll('[role="tab"]');
    // overview + 6 legacy reports + customer_support
    expect(tabs).toHaveLength(subtabViews.length + 2);
  });

  it('renders a Customer Support panel wired to its tab', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('#alg-sector-panel-customer_support').exists()).toBe(
      true
    );
  });

  it('Overview cards each carry the demonstration watermark', () => {
    const wrapper = mountOverlay();
    const watermarks = wrapper.findAll('.alg-overview__watermark');
    expect(watermarks.length).toBeGreaterThanOrEqual(subtabViews.length);
  });

  it('anchors the agent chat at the foot via the chatHeadingKey', () => {
    const wrapper = mountOverlay();
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.AGENT_CHAT_HEADING'
    );
  });
});
