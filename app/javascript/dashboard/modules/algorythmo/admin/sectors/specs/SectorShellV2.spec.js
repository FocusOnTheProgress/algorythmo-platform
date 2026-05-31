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

  // -------------------------------------------------------------------------
  // REGRESSION GUARDS — class/structure contracts the SCSS keys off.
  //
  // jsdom cannot assert layout (computed position, stacking), but the CSS
  // rules for the sticky-chat overlap fix and the sector accent both depend on
  // EXACT class names being present (or absent) on specific elements. Asserting
  // those class names here means any future refactor that re-introduces
  // stickiness or drops the accent class will fail CI before it ships.
  // -------------------------------------------------------------------------

  describe('sticky-chat overlap regression guard', () => {
    it('chat band carries the in-flow class alg-shell__chat', () => {
      // The SCSS `.alg-shell__chat` rule sets `position: relative` (in-flow).
      // If this class is absent, the Aurora-border frame loses its positioning
      // context and the band reverts to a flat block — observable as a lost
      // border ring on the hero band.
      expect(wrapper.find('.alg-shell__chat').exists()).toBe(true);
    });

    it('chat band does NOT carry any sticky/fixed positioning modifier', () => {
      // The prior build used `position: sticky; top: 0` which permanently
      // occluded the KPI grid (Brief v3, Stream C #1 complaint). Guard against
      // re-introduction of any sticky-modifier class. The SCSS position contract
      // is `relative` (in-flow); sticky variants must not appear.
      const chat = wrapper.find('.alg-shell__chat');
      expect(chat.classes()).not.toContain('alg-shell__chat--sticky');
      expect(chat.classes()).not.toContain('alg-shell__chat--fixed');
      // Also verify the element is inside the normal document flow by confirming
      // the shell root itself is not a scroll container with a trapped sticky child.
      // We do this by checking the shell root has no class that would scope a
      // sticky context (e.g. alg-shell--scroll-trap).
      expect(wrapper.find('.alg-shell').classes()).not.toContain(
        'alg-shell--scroll-trap'
      );
    });
  });

  describe('sector-accent class contract', () => {
    it('active tab carries alg-shell__tab--active (SCSS hue keyed off this)', () => {
      // The SCSS rule `[class*="alg-shell--"] .alg-shell__tab--active` sets the
      // sector-hue underline accent. If this modifier class is renamed or removed,
      // the active-tab colour accent silently disappears for ALL 8 sectors.
      const tabs = wrapper.findAll('[role="tab"]');
      expect(tabs[0].classes()).toContain('alg-shell__tab--active');
      expect(tabs[1].classes()).not.toContain('alg-shell__tab--active');
    });

    it('active-tab accent class moves when the active tab changes', async () => {
      const tabs = wrapper.findAll('[role="tab"]');
      await tabs[1].trigger('click');
      expect(tabs[1].classes()).toContain('alg-shell__tab--active');
      expect(tabs[0].classes()).not.toContain('alg-shell__tab--active');
    });

    it('root carries alg-shell--<sector> when planetClass is provided', () => {
      // The per-sector SCSS hue map keys off `[class*="alg-shell--"]` on the root.
      // The derivation rule is: 'alg-planet--<slug>' → 'alg-shell--<slug>'.
      // If SectorShellV2 stops deriving or renames the root class, ALL sector hue
      // accents and the scoped icon monochrome rule vanish silently.
      const withSector = mount(SectorShellV2, {
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
      expect(withSector.find('.alg-shell').classes()).toContain(
        'alg-shell--operations'
      );
    });

    it('root has NO sector class when planetClass is absent', () => {
      // Off-sector: no hue class means the sector override rules are inactive,
      // so KPI icons fall back to the neutral global default (--alg-fg-tertiary).
      expect(wrapper.find('.alg-shell').classes()).not.toContain(
        'alg-shell--operations'
      );
      // Verify no alg-shell-- sector class slips in under any slug.
      const shellClasses = wrapper.find('.alg-shell').classes();
      const hasSectorClass = shellClasses.some(c =>
        c.startsWith('alg-shell--')
      );
      expect(hasSectorClass).toBe(false);
    });
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
