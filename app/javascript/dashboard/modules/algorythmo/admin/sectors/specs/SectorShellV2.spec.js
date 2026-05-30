// algorythmo: plan 0007 M2-b — SectorShellV2 unit spec
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SectorShellV2 from '../SectorShellV2.vue';

// vue-i18n stub: t(key) → key, t(key, params) → "key [param=val …]"
// This mirrors what a *real* i18n fallback would produce if the key were
// missing — so assertions that check for a rendered label catch regressions
// where a key is absent from a locale file.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => {
      if (!params) return key;
      const interpolated = Object.entries(params)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ');
      return `${key} [${interpolated}]`;
    },
  }),
}));

const TABS = [
  { id: 'overview', labelKey: 'TAB.OVERVIEW' },
  { id: 'estoque', labelKey: 'TAB.ESTOQUE' },
  { id: 'logistica', labelKey: 'TAB.LOGISTICA' },
];

function mountShell(slots = {}) {
  return mount(SectorShellV2, {
    props: {
      titleKey: 'SECTOR.OPERACOES.TITLE',
      chatHeadingKey: 'SECTOR.OPERACOES.AGENT_CHAT_HEADING',
      tabs: TABS,
    },
    slots: {
      overview: '<div class="test-overview">overview body</div>',
      'subtab-estoque': '<div class="test-estoque">estoque body</div>',
      'subtab-logistica': '<div class="test-logistica">logistica body</div>',
      agentChat: '<div class="test-chat">chat body</div>',
      ...slots,
    },
    global: {},
  });
}

describe('SectorShellV2', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mountShell();
  });

  it('renders the sector title from titleKey', () => {
    expect(wrapper.find('.alg-shell__title').text()).toBe(
      'SECTOR.OPERACOES.TITLE'
    );
  });

  it('renders all three named slots (overview, subtab, agentChat)', () => {
    expect(wrapper.find('.test-overview').exists()).toBe(true);
    expect(wrapper.find('.test-estoque').exists()).toBe(true);
    expect(wrapper.find('.test-chat').exists()).toBe(true);
  });

  it('renders the agent chat heading from chatHeadingKey', () => {
    expect(wrapper.find('.alg-shell__chat-heading').text()).toBe(
      'SECTOR.OPERACOES.AGENT_CHAT_HEADING'
    );
  });

  it('makes Overview the default active tab', () => {
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs[1].attributes('aria-selected')).toBe('false');
  });

  it('wires aria-controls / aria-labelledby between tabs and panels', () => {
    const tab = wrapper.findAll('[role="tab"]')[1];
    const controlledId = tab.attributes('aria-controls');
    const panel = wrapper.find(`#${controlledId}`);
    expect(panel.exists()).toBe(true);
    expect(panel.attributes('role')).toBe('tabpanel');
    expect(panel.attributes('aria-labelledby')).toBe(tab.attributes('id'));
  });

  it('shows only the active panel content (v-show toggles)', () => {
    const overviewPanel = wrapper.find('#alg-sector-panel-overview');
    const estoquePanel = wrapper.find('#alg-sector-panel-estoque');
    expect(overviewPanel.isVisible()).toBe(true);
    expect(estoquePanel.isVisible()).toBe(false);
  });

  it('switches tab on click', async () => {
    const estoqueTab = wrapper.findAll('[role="tab"]')[1];
    await estoqueTab.trigger('click');
    expect(estoqueTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('#alg-sector-panel-estoque').isVisible()).toBe(true);
    expect(wrapper.find('#alg-sector-panel-overview').isVisible()).toBe(false);
  });

  it('moves to the next tab with ArrowRight', async () => {
    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0].trigger('keydown', { key: 'ArrowRight' });
    expect(tabs[1].attributes('aria-selected')).toBe('true');
  });

  it('wraps to the first tab when ArrowRight is pressed on the last', async () => {
    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[2].trigger('keydown', { key: 'ArrowRight' });
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('moves to the previous tab with ArrowLeft (wraps at the start)', async () => {
    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0].trigger('keydown', { key: 'ArrowLeft' });
    expect(tabs[2].attributes('aria-selected')).toBe('true');
  });

  it('jumps to the last tab with End and the first with Home', async () => {
    const tabs = wrapper.findAll('[role="tab"]');
    await tabs[0].trigger('keydown', { key: 'End' });
    expect(tabs[2].attributes('aria-selected')).toBe('true');
    await tabs[2].trigger('keydown', { key: 'Home' });
    expect(tabs[0].attributes('aria-selected')).toBe('true');
  });

  it('applies a roving tabindex (only the active tab is tabbable)', () => {
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('tabindex')).toBe('0');
    expect(tabs[1].attributes('tabindex')).toBe('-1');
  });

  it('renders the agent hero ABOVE the tablist (top, not foot)', () => {
    // F-B: the agent band is a fixed hero at the TOP. Assert DOM order — the
    // chat band must precede the tablist so it renders above the dense KPI grid.
    const html = wrapper.html();
    const chatIndex = html.indexOf('alg-shell__chat');
    const tablistIndex = html.indexOf('role="tablist"');
    expect(chatIndex).toBeGreaterThan(-1);
    expect(tablistIndex).toBeGreaterThan(-1);
    expect(chatIndex).toBeLessThan(tablistIndex);
  });

  it('renders the hero planet avatar when planetClass is provided', () => {
    const withPlanet = mount(SectorShellV2, {
      props: {
        titleKey: 'SECTOR.OPERACOES.TITLE',
        chatHeadingKey: 'SECTOR.OPERACOES.AGENT_CHAT_HEADING',
        tabs: TABS,
        planetClass: 'alg-planet--operations',
      },
      slots: {
        overview: '<div class="test-overview">overview body</div>',
        agentChat: '<div class="test-chat">chat body</div>',
      },
      global: {},
    });
    expect(withPlanet.find('.alg-shell__hero-planet').exists()).toBe(true);
  });

  it('omits the hero planet avatar when planetClass is absent', () => {
    // The shared story mounts without planetClass; the hero must stay null-safe.
    expect(wrapper.find('.alg-shell__hero-planet').exists()).toBe(false);
  });

  describe('tabs prop validator', () => {
    // Vue 3 passes multiple args to console.warn; inspect the first one.
    function expectPropValidationWarn(spy) {
      const firstCallFirstArg = spy.mock.calls[0]?.[0] ?? '';
      expect(firstCallFirstArg).toContain('Invalid prop');
    }

    it('rejects tabs where the first id is not "overview"', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mount(SectorShellV2, {
        props: {
          titleKey: 'T',
          chatHeadingKey: 'C',
          tabs: [
            { id: 'operacoes', labelKey: 'L.A' },
            { id: 'overview', labelKey: 'L.B' },
          ],
        },
        global: {},
      });
      expectPropValidationWarn(spy);
      spy.mockRestore();
    });

    it('rejects tabs with duplicate ids', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mount(SectorShellV2, {
        props: {
          titleKey: 'T',
          chatHeadingKey: 'C',
          tabs: [
            { id: 'overview', labelKey: 'L.A' },
            { id: 'overview', labelKey: 'L.B' },
          ],
        },
        global: {},
      });
      expectPropValidationWarn(spy);
      spy.mockRestore();
    });
  });
});
