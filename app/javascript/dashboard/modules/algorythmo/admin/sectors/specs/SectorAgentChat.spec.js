// algorythmo: M6 PR-6b — SectorAgentChat unit spec
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SectorAgentChat from '../SectorAgentChat.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountChat() {
  return mount(SectorAgentChat, {
    props: { sectorNameKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERACAO.HEADING' },
  });
}

describe('SectorAgentChat', () => {
  it('renders the 360px aside with aria-label', () => {
    const wrapper = mountChat();
    const root = wrapper.find('.alg-agent');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBeTruthy();
  });

  it('renders a geometric monogram avatar (inline SVG, not Lucide)', () => {
    const wrapper = mountChat();
    const svg = wrapper.find('.alg-agent__monogram');
    expect(svg.exists()).toBe(true);
    expect(svg.element.tagName.toLowerCase()).toBe('svg');
  });

  it('renders sector name + lowercase "agente" suffix', () => {
    const wrapper = mountChat();
    const name = wrapper.find('.alg-agent__name');
    expect(name.text()).toContain('ALGORYTHMO_ADMIN.SECTORS.OPERACAO.HEADING');
    expect(wrapper.find('.alg-agent__name-suffix').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.NAME_SUFFIX'
    );
  });

  it('renders the offline status row', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__status').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__status-dot').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__status-label').text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.STATUS_OFFLINE'
    );
  });

  it('renders the empty state when no messages exist', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__empty').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__list').exists()).toBe(false);
  });

  it('renders the input + cmd+enter hint chip', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__input').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__hint').exists()).toBe(true);
  });

  it('clears draft on cmd+enter submission', async () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    await textarea.setValue('hello');
    await textarea.trigger('keydown', { key: 'Enter', metaKey: true });
    expect(textarea.element.value).toBe('');
  });
});
