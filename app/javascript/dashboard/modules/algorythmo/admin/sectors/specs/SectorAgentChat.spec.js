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

  it('exposes a visible send button (not keyboard-only)', () => {
    const wrapper = mountChat();
    const send = wrapper.find('.alg-agent__send');
    expect(send.exists()).toBe(true);
    expect(send.attributes('type')).toBe('submit');
    expect(send.attributes('aria-label')).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.SEND_ARIA'
    );
  });

  it('disables the send button when the draft is empty/whitespace', async () => {
    const wrapper = mountChat();
    const send = wrapper.find('.alg-agent__send');
    expect(send.attributes('disabled')).toBeDefined();
    await wrapper.find('.alg-agent__input').setValue('   ');
    expect(send.attributes('disabled')).toBeDefined();
    await wrapper.find('.alg-agent__input').setValue('hi');
    expect(send.attributes('disabled')).toBeUndefined();
  });

  it('declares keyboard shortcut + describedby on the textarea', () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    expect(textarea.attributes('aria-keyshortcuts')).toBe(
      'Meta+Enter Control+Enter'
    );
    expect(textarea.attributes('aria-describedby')).toBe('alg-agent-hint');
  });

  it('clears draft on cmd+enter submission', async () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    await textarea.setValue('hello');
    await textarea.trigger('keydown', { key: 'Enter', metaKey: true });
    expect(textarea.element.value).toBe('');
  });

  it('also clears draft when the visible send button is clicked', async () => {
    const wrapper = mountChat();
    await wrapper.find('.alg-agent__input').setValue('hello');
    await wrapper.find('.alg-agent__form').trigger('submit');
    expect(wrapper.find('.alg-agent__input').element.value).toBe('');
  });
});
