// algorythmo: plan 0007 M2-b — SectorShellV2 unit spec
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import SectorShellV2 from '../SectorShellV2.vue';

// vue-i18n's `t` is stubbed so assertions target keys + interpolation params,
// not translated strings.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}::${JSON.stringify(params)}` : key),
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
    global: {
      stubs: {
        Icon: { props: ['icon'], template: '<i :data-icon="icon" />' },
      },
    },
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

  it('triggers smooth scroll into view when jump-to-chat is clicked', async () => {
    const scrollSpy = vi.fn();
    // jsdom does not implement scrollIntoView; attach a spy to the anchor.
    wrapper.find('.alg-shell__chat').element.scrollIntoView = scrollSpy;
    await wrapper.find('.alg-shell__jump').trigger('click');
    expect(scrollSpy).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
  });

  it('labels the jump-to-chat button with the sector name', () => {
    const label = wrapper.find('.alg-shell__jump').attributes('aria-label');
    expect(label).toContain('ALGORYTHMO_ADMIN.SECTORS.JUMP_TO_CHAT');
    expect(label).toContain('SECTOR.OPERACOES.TITLE');
  });
});
