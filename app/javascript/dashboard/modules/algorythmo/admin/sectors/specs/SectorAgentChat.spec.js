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

  // algorythmo: A7 — the OFFLINE status row is intentionally REMOVED (clutter).
  it('does not render an offline status row', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__status').exists()).toBe(false);
  });

  // algorythmo: A7 — the agent surface is centred, not full-span.
  it('renders the centred variant', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent--centered').exists()).toBe(true);
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

  // algorythmo: A7 — the single bottom-corner affordance is the ENLARGED mic,
  // and it is the form's submit control (the separate "+"/arrow send is removed).
  it('renders the enlarged mic as the single composer submit affordance', () => {
    const wrapper = mountChat();
    const mic = wrapper.find('.alg-agent__mic');
    expect(mic.exists()).toBe(true);
    expect(mic.attributes('type')).toBe('submit');
    expect(mic.attributes('aria-label')).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.AGENT.MIC_ARIA'
    );
  });

  it('removes the separate send ("+") affordance', () => {
    const wrapper = mountChat();
    expect(wrapper.find('.alg-agent__send').exists()).toBe(false);
    expect(wrapper.find('.alg-agent__actions').exists()).toBe(false);
  });

  it('declares keyboard shortcut + describedby on the textarea', () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    expect(textarea.attributes('aria-keyshortcuts')).toBe(
      'Enter Meta+Enter Control+Enter'
    );
    expect(textarea.attributes('aria-describedby')).toBe('alg-agent-hint');
  });

  it('clears draft on Enter submission', async () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    await textarea.setValue('hello');
    await textarea.trigger('keydown', { key: 'Enter' });
    expect(textarea.element.value).toBe('');
  });

  it('keeps a newline on Shift+Enter (does not submit)', async () => {
    const wrapper = mountChat();
    const textarea = wrapper.find('.alg-agent__input');
    await textarea.setValue('hello');
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true });
    expect(textarea.element.value).toBe('hello');
  });

  it('clears draft when the form is submitted (mic click)', async () => {
    const wrapper = mountChat();
    await wrapper.find('.alg-agent__input').setValue('hello');
    await wrapper.find('.alg-agent__form').trigger('submit');
    expect(wrapper.find('.alg-agent__input').element.value).toBe('');
  });
});
