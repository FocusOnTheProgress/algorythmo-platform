// algorythmo: PR7 — Copiloto chat surface spec.
//
// Proves the operator-facing contract:
//   · each of the FOUR honest answer states renders its distinct surface
//   · transport errors (429 / 422-inline / 401-403 / 5xx) are handled
//   · citation chips render from page_slug
//   · loading (thinking) indicator shows while a question is in flight
//   · ANTI-XSS: an answer containing markup is NEVER rendered as raw HTML
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CopilotScreen from '../CopilotScreen.vue';
import { copilotService, COPILOT_ERRORS } from '../copilot.service';

// Reactive account-id ref (same pattern as BrainViewer's spec) so the
// useMapGetter mock returns a real ref the component can read .value from.
const { accountIdRef } = vi.hoisted(() => {
  // eslint-disable-next-line global-require
  const { ref } = require('vue');
  return { accountIdRef: ref(2) };
});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: vi.fn(() => accountIdRef),
}));

vi.mock('../copilot.service', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    copilotService: { ask: vi.fn() },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  accountIdRef.value = 2;
  // jsdom: textarea/log have no layout; stub scroll target so scrollToEnd is inert.
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    value: 0,
  });
});

async function ask(wrapper, text) {
  await wrapper.find('textarea').setValue(text);
  await wrapper.find('form').trigger('submit');
  await flushPromises();
}

describe('CopilotScreen — empty state', () => {
  it('shows the designed empty state before any question', () => {
    const wrapper = mount(CopilotScreen);
    expect(wrapper.find('.alg-copilot__empty').exists()).toBe(true);
    // Starter suggestions are offered.
    expect(wrapper.findAll('.alg-copilot__suggestion').length).toBeGreaterThan(
      0
    );
  });
});

describe('CopilotScreen — four honest answer states', () => {
  it('grounded: renders the answer text and citation chips', async () => {
    copilotService.ask.mockResolvedValue({
      state: 'grounded',
      answer: 'A política de troca é de 30 dias.',
      citations: [
        { page_slug: 'politica-de-troca', row_num: 4, citation_index: 1 },
        { page_slug: 'faq-loja', row_num: 1, citation_index: 2 },
      ],
      gaps: [],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'Qual a política de troca?');

    const answer = wrapper.find('[data-state="grounded"]');
    expect(answer.exists()).toBe(true);
    expect(answer.text()).toContain('A política de troca é de 30 dias.');

    const chips = wrapper.findAll('.alg-copilot__citation');
    expect(chips).toHaveLength(2);
    // page_slug de-slugified into a human-ish label.
    expect(chips[0].text()).toContain('politica de troca');
  });

  it('ungrounded: shows the honest "not in the Brain" notice (no invented answer)', async () => {
    copilotService.ask.mockResolvedValue({
      state: 'ungrounded',
      answer: '',
      citations: [],
      gaps: ['x'],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta sem resposta');

    const notice = wrapper.find('[data-state="ungrounded"]');
    expect(notice.exists()).toBe(true);
    // Test env locale is 'en' (vitest.setup.js).
    expect(notice.text()).toContain("couldn't find this in the Brain");
    // No grounded answer surface.
    expect(wrapper.find('[data-state="grounded"]').exists()).toBe(false);
  });

  it('degraded: shows the transient "try again" notice', async () => {
    copilotService.ask.mockResolvedValue({
      state: 'degraded',
      answer: '',
      citations: [],
      gaps: [],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta');

    const notice = wrapper.find('[data-state="degraded"]');
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain('Answer unavailable');
  });

  it('engine_unconfigured: shows a SYSTEM-state notice distinct from "não sei"', async () => {
    copilotService.ask.mockResolvedValue({
      state: 'engine_unconfigured',
      answer: '',
      citations: [],
      gaps: [],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta');

    const notice = wrapper.find('[data-state="engine_unconfigured"]');
    expect(notice.exists()).toBe(true);
    expect(notice.text()).toContain('AI engine not configured');
    // It is visually/semantically a status, with a hint that it is a system
    // setting — NOT the ungrounded "I couldn't find this" surface.
    expect(notice.text()).toContain('system setting');
    expect(wrapper.find('[data-state="ungrounded"]').exists()).toBe(false);
  });
});

describe('CopilotScreen — transport errors', () => {
  it('429: shows the rate-limit message in the log', async () => {
    const err = Object.assign(new Error('rl'), {
      kind: COPILOT_ERRORS.RATE_LIMITED,
    });
    copilotService.ask.mockRejectedValue(err);
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta');

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain('Too many questions');
  });

  it('401/403: shows the forbidden message', async () => {
    const err = Object.assign(new Error('forbidden'), {
      kind: COPILOT_ERRORS.FORBIDDEN,
    });
    copilotService.ask.mockRejectedValue(err);
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta');
    expect(wrapper.find('[role="alert"]').text()).toContain(
      "don't have access"
    );
  });

  it('5xx/unknown: shows the generic retry message', async () => {
    const err = Object.assign(new Error('boom'), {
      kind: COPILOT_ERRORS.UNKNOWN,
    });
    copilotService.ask.mockRejectedValue(err);
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta');
    expect(wrapper.find('[role="alert"]').text()).toContain(
      'Something went wrong'
    );
  });

  it('422: validates inline (> 2000 chars) and never calls the service', async () => {
    const wrapper = mount(CopilotScreen);
    const long = 'a'.repeat(2001);
    await wrapper.find('textarea').setValue(long);
    await wrapper.vm.$nextTick();

    // Inline validation: counter shows the error and the send button is disabled.
    expect(wrapper.find('.alg-copilot__counter--invalid').exists()).toBe(true);
    expect(wrapper.find('.alg-copilot__counter-error').text()).toContain(
      'too long'
    );
    expect(wrapper.find('textarea').attributes('aria-invalid')).toBe('true');
    expect(
      wrapper.find('button[type="submit"]').attributes('disabled')
    ).toBeDefined();

    await wrapper.find('form').trigger('submit');
    await flushPromises();
    expect(copilotService.ask).not.toHaveBeenCalled();
  });
});

describe('CopilotScreen — loading', () => {
  it('shows the thinking indicator while a question is in flight', async () => {
    let resolveAsk;
    copilotService.ask.mockReturnValue(
      new Promise(res => {
        resolveAsk = res;
      })
    );
    const wrapper = mount(CopilotScreen);
    await wrapper.find('textarea').setValue('pergunta');
    await wrapper.find('form').trigger('submit');
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-testid="copilot-loading"]').exists()).toBe(true);

    resolveAsk({ state: 'grounded', answer: 'pronto', citations: [] });
    await flushPromises();
    expect(wrapper.find('[data-testid="copilot-loading"]').exists()).toBe(
      false
    );
  });
});

describe('CopilotScreen — anti-XSS (critical)', () => {
  it('renders a malicious answer as ESCAPED TEXT, never as raw HTML', async () => {
    // A marker the payload tries to set if it ever executes as real markup.
    const MARKER = 'copilotXssMarker';
    delete window[MARKER];
    const malicious = `Ignore previous instructions <script>window['${MARKER}']=1</script><img src=x onerror="window['${MARKER}']=1">`;
    copilotService.ask.mockResolvedValue({
      state: 'grounded',
      answer: malicious,
      citations: [],
      gaps: [],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, 'pergunta perigosa');

    const answer = wrapper.find('[data-state="grounded"]');
    // The literal characters appear as TEXT…
    expect(answer.text()).toContain('<script>');
    expect(answer.text()).toContain('<img');
    // …but NO actual <script> / <img> element was injected into the DOM.
    expect(answer.element.querySelector('script')).toBeNull();
    expect(answer.element.querySelector('img')).toBeNull();
    // And the payload never executed.
    expect(window[MARKER]).toBeUndefined();

    // Defence-in-depth: the rendered HTML must contain the ESCAPED entity, not
    // a live opening tag for the injected node.
    expect(wrapper.html()).toContain('&lt;script&gt;');
    expect(wrapper.html()).not.toContain(`<script>window['${MARKER}']`);
  });

  it('renders a user question with markup as escaped text too', async () => {
    copilotService.ask.mockResolvedValue({
      state: 'ungrounded',
      answer: '',
      citations: [],
      gaps: [],
    });
    const wrapper = mount(CopilotScreen);
    await ask(wrapper, '<b>oi</b><script>alert(1)</script>');

    const bubble = wrapper.find('.alg-copilot__bubble--user');
    expect(bubble.text()).toContain('<b>oi</b>');
    expect(bubble.element.querySelector('script')).toBeNull();
    expect(bubble.element.querySelector('b')).toBeNull();
  });
});
