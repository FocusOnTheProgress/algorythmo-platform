import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgSectorAgentChat from '../AlgSectorAgentChat.vue';
import AlgSectorAgentChatTrigger from '../AlgSectorAgentChatTrigger.vue';
import {
  sectorAgentChatAnchorId,
  scrollToSectorAgentChat,
} from '../sectorAgentChat';

describe('sectorAgentChatAnchorId', () => {
  it('slugifies the sector name', () => {
    expect(sectorAgentChatAnchorId('Comercial')).toBe(
      'alg-sector-agent-chat-comercial'
    );
  });

  it('strips accents and spaces', () => {
    expect(sectorAgentChatAnchorId('Operação Logística')).toBe(
      'alg-sector-agent-chat-operacao-logistica'
    );
  });

  it('falls back to "setor" for empty input', () => {
    expect(sectorAgentChatAnchorId('')).toBe('alg-sector-agent-chat-setor');
  });
});

describe('AlgSectorAgentChat', () => {
  it('renders the locked header copy with the sector name', () => {
    const wrapper = mount(AlgSectorAgentChat, {
      props: { sector: 'Comercial' },
    });
    expect(wrapper.find('.alg-sector-agent-chat__title').text()).toBe(
      "Fale com o agente do setor 'Comercial'"
    );
  });

  it('carries the stable scroll-anchor id', () => {
    const wrapper = mount(AlgSectorAgentChat, {
      props: { sector: 'Marketing' },
    });
    expect(wrapper.find('section').attributes('id')).toBe(
      'alg-sector-agent-chat-marketing'
    );
  });

  it('renders a planet avatar for the agent', () => {
    const wrapper = mount(AlgSectorAgentChat, {
      props: { sector: 'RH', agentName: 'Manu' },
    });
    expect(wrapper.find('.alg-planet-avatar').exists()).toBe(true);
  });

  it('emits send with the trimmed draft and clears the input', async () => {
    const wrapper = mount(AlgSectorAgentChat, {
      props: { sector: 'Comercial' },
    });
    const input = wrapper.find('input');
    await input.setValue('  olá agente  ');
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('send')[0]).toEqual(['olá agente']);
    expect(wrapper.find('input').element.value).toBe('');
  });

  it('does not emit when the draft is empty', async () => {
    const wrapper = mount(AlgSectorAgentChat, {
      props: { sector: 'Comercial' },
    });
    await wrapper.find('form').trigger('submit');
    expect(wrapper.emitted('send')).toBeUndefined();
  });
});

describe('AlgSectorAgentChatTrigger', () => {
  it('points aria-controls at the matching chat anchor', () => {
    const wrapper = mount(AlgSectorAgentChatTrigger, {
      props: { sector: 'Comercial' },
    });
    expect(wrapper.attributes('aria-controls')).toBe(
      'alg-sector-agent-chat-comercial'
    );
  });

  it('scrolls to the chat on click', async () => {
    const el = document.createElement('section');
    el.id = 'alg-sector-agent-chat-comercial';
    document.body.appendChild(el);
    el.scrollIntoView = vi.fn();

    const wrapper = mount(AlgSectorAgentChatTrigger, {
      props: { sector: 'Comercial' },
    });
    await wrapper.find('button').trigger('click');
    expect(el.scrollIntoView).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});

describe('scrollToSectorAgentChat', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is a no-op when the target is absent', () => {
    expect(() => scrollToSectorAgentChat('Missing')).not.toThrow();
  });
});
