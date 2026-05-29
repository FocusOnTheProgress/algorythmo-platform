// algorythmo: M6 PR-6b — SectorAgentChat unit spec
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SectorAgentChat from '../SectorAgentChat.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

function mountChat() {
  return mount(SectorAgentChat, {
    props: { sectorNameKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.HEADING' },
  });
}

describe('SectorAgentChat', () => {
  it('renders the agent strip root with aria-label', () => {
    const wrapper = mountChat();
    const root = wrapper.find('.alg-agent');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBeTruthy();
  });

  it('voices a seeded opening line via the typewriter (full text exposed)', () => {
    // F-B: identity (planet + heading) now lives in the hero; the agent strip
    // voices ONE seeded opening line. AlgTypewriter exposes the full line via
    // aria-label even mid-type, so assistive tech reads it immediately.
    const wrapper = mountChat();
    const opening = wrapper.find('.alg-agent__opening');
    expect(opening.exists()).toBe(true);
    expect(wrapper.find('.alg-typewriter').attributes('aria-label')).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.OPENING'
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

  it('shows the opening line (not a message list) when no messages exist', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__opening').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__list').exists()).toBe(false);
  });

  it('renders the input + cmd+enter hint chip', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__input').exists()).toBe(true);
    expect(wrapper.find('.alg-agent__hint').exists()).toBe(true);
  });

  it('renders a voice (mic) button — visual only, with an aria-label', () => {
    const wrapper = mountChat();
    const mic = wrapper.find('.alg-agent__mic');
    expect(mic.exists()).toBe(true);
    // Visual-only affordance: must be type="button" so it never submits.
    expect(mic.attributes('type')).toBe('button');
    expect(mic.attributes('aria-label')).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.MIC_ARIA'
    );
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
