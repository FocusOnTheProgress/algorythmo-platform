// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import LeadCard from '../LeadCard.vue';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
});

const baseLead = () => ({
  id: 42,
  name: 'Maria Santos',
  stage_id: 7,
  stage_name: 'Qualificado',
  channel_origin: 'whatsapp',
  channel_icon: '\u{1F4AC}',
  time_human: '3h',
  time_aria_long: 'há 3 horas',
  aging_state: 'green',
  owner: null,
});

const ownerSample = () => ({
  id: 11,
  name: 'Gustavo Bittencourt',
  thumbnail: 'https://cdn.example/avatars/11.png',
});

const mountCard = (overrides = {}) =>
  mount(LeadCard, {
    props: { lead: { ...baseLead(), ...overrides } },
    global: {
      plugins: [i18n],
    },
  });

describe('LeadCard (CONTRACT_M1B §3 v1.1.0)', () => {
  describe('shell attributes', () => {
    it('renders an article with role="button" and tabindex="0"', () => {
      const wrapper = mountCard();
      const card = wrapper.find('[data-testid="lead-card"]');
      expect(card.exists()).toBe(true);
      expect(card.element.tagName).toBe('ARTICLE');
      expect(card.attributes('role')).toBe('button');
      expect(card.attributes('tabindex')).toBe('0');
    });

    it('exposes data-lead-id, data-stage-id, data-channel on the card', () => {
      const wrapper = mountCard();
      const card = wrapper.find('[data-testid="lead-card"]');
      expect(card.attributes('data-lead-id')).toBe('42');
      expect(card.attributes('data-stage-id')).toBe('7');
      expect(card.attributes('data-channel')).toBe('whatsapp');
    });

    it('builds the full pt_BR aria-label sentence (channel label translated)', () => {
      const wrapper = mountCard();
      expect(
        wrapper.find('[data-testid="lead-card"]').attributes('aria-label')
      ).toBe(
        'Lead Maria Santos, etapa Qualificado, há 3 horas nesta etapa, canal WhatsApp'
      );
    });
  });

  describe('content slots', () => {
    it('renders an inline SVG channel icon (no emoji) hidden from screen readers', () => {
      const wrapper = mountCard();
      const icon = wrapper.find('[data-testid="lead-card-channel-icon"]');
      // Founder: no emoji in chrome. The glyph is an inline Lucide-style SVG
      // derived from channel_origin (whatsapp → the chat-bubble path).
      expect(icon.exists()).toBe(true);
      expect(icon.element.tagName.toLowerCase()).toBe('svg');
      expect(icon.attributes('aria-hidden')).toBe('true');
      expect(icon.html()).toContain('path');
      // No emoji codepoint leaks into the rendered chrome.
      expect(icon.text()).not.toContain('\u{1F4AC}');
    });

    it('derives the channel icon from channel_origin, not a passed glyph', () => {
      // whatsapp and email resolve to different SVG paths.
      const whatsapp = mountCard({ channel_origin: 'whatsapp' });
      const email = mountCard({ channel_origin: 'email' });
      const waHtml = whatsapp
        .find('[data-testid="lead-card-channel-icon"]')
        .html();
      const emHtml = email
        .find('[data-testid="lead-card-channel-icon"]')
        .html();
      expect(waHtml).not.toBe(emHtml);
      // email uses the envelope rect; whatsapp does not.
      expect(emHtml).toContain('rect');
      expect(waHtml).not.toContain('rect');
    });

    it('renders the translated channel label', () => {
      const wrapper = mountCard();
      expect(
        wrapper.find('[data-testid="lead-card-channel-label"]').text()
      ).toBe('WhatsApp');
    });

    it('falls back to "Outro canal" when channel_origin is unknown', () => {
      const wrapper = mountCard({ channel_origin: 'mystery-bus' });
      expect(
        wrapper.find('[data-testid="lead-card-channel-label"]').text()
      ).toBe('Outro canal');
    });

    it('normalizes Channel::WebWidget to "Chat no site"', () => {
      const wrapper = mountCard({ channel_origin: 'Channel::WebWidget' });
      expect(
        wrapper.find('[data-testid="lead-card-channel-label"]').text()
      ).toBe('Chat no site');
    });

    it('renders name and compact time', () => {
      const wrapper = mountCard();
      expect(wrapper.find('[data-testid="lead-card-name"]').text()).toBe(
        'Maria Santos'
      );
      expect(wrapper.find('[data-testid="lead-card-time"]').text()).toBe('3h');
    });

    it('embeds the LeadAgingChip with state and time', () => {
      const wrapper = mountCard({ aging_state: 'yellow' });
      const chip = wrapper.find('[data-testid="lead-aging-chip"]');
      expect(chip.exists()).toBe(true);
      expect(chip.attributes('data-state')).toBe('yellow');
      expect(chip.attributes('aria-label')).toBe('há 3 horas nesta etapa');
      expect(wrapper.find('[data-testid="lead-aging-chip-label"]').text()).toBe(
        '3h'
      );
    });
  });

  describe('owner slot (v1.1.0)', () => {
    it('renders the unassigned placeholder when lead.owner is null', () => {
      const wrapper = mountCard({ owner: null });
      const avatar = wrapper.find('[data-testid="lead-card-owner-avatar"]');
      expect(avatar.exists()).toBe(true);
      expect(avatar.attributes('data-owner-state')).toBe('unassigned');
      expect(avatar.attributes('data-owner-id')).toBeUndefined();
      expect(avatar.attributes('aria-label')).toBe(
        'Lead disponível, sem dono atribuído'
      );
      expect(avatar.attributes('aria-disabled')).toBe('true');
      expect(avatar.attributes('role')).toBe('img');
      expect(avatar.attributes('title')).toBe(
        'Disponível · clique para atribuir'
      );
    });

    it('renders the real avatar when lead.owner is set', () => {
      const wrapper = mountCard({ owner: ownerSample() });
      const avatar = wrapper.find('[data-testid="lead-card-owner-avatar"]');
      expect(avatar.exists()).toBe(true);
      expect(avatar.attributes('data-owner-state')).toBe('assigned');
      expect(avatar.attributes('data-owner-id')).toBe('11');
      expect(avatar.attributes('title')).toBe('Gustavo Bittencourt');
      const img = avatar.find('img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://cdn.example/avatars/11.png');
      expect(img.attributes('alt')).toBe('Gustavo Bittencourt');
    });

    it('owner avatar click does NOT bubble open (M2 reassign placeholder)', async () => {
      const wrapper = mountCard({ owner: ownerSample() });
      await wrapper
        .find('[data-testid="lead-card-owner-avatar"]')
        .trigger('click');
      expect(wrapper.emitted('open')).toBeUndefined();
    });

    it('unassigned placeholder click does NOT bubble open either', async () => {
      const wrapper = mountCard({ owner: null });
      await wrapper
        .find('[data-testid="lead-card-owner-avatar"]')
        .trigger('click');
      expect(wrapper.emitted('open')).toBeUndefined();
    });
  });

  describe('menu trigger', () => {
    it('renders a real <button> with aria-haspopup="menu"', () => {
      const wrapper = mountCard();
      const trigger = wrapper.find('[data-testid="lead-card-menu-trigger"]');
      expect(trigger.exists()).toBe(true);
      expect(trigger.element.tagName).toBe('BUTTON');
      expect(trigger.attributes('aria-haspopup')).toBe('menu');
      expect(trigger.attributes('aria-label')).toBe(
        'Ações para lead Maria Santos'
      );
    });

    it('emits "menu" with lead + anchor and does NOT bubble to the card', async () => {
      const wrapper = mountCard();
      const trigger = wrapper.find('[data-testid="lead-card-menu-trigger"]');
      await trigger.trigger('click');
      const menuEvents = wrapper.emitted('menu');
      const openEvents = wrapper.emitted('open');
      expect(menuEvents).toHaveLength(1);
      expect(menuEvents[0][0].lead.id).toBe(42);
      expect(menuEvents[0][0].anchor).toBe(trigger.element);
      expect(openEvents).toBeUndefined();
    });
  });

  describe('activation', () => {
    it('emits "open" on click', async () => {
      const wrapper = mountCard();
      await wrapper.find('[data-testid="lead-card"]').trigger('click');
      const openEvents = wrapper.emitted('open');
      expect(openEvents).toHaveLength(1);
      expect(openEvents[0][0].id).toBe(42);
    });

    it('emits "open" on Enter keydown', async () => {
      const wrapper = mountCard();
      await wrapper
        .find('[data-testid="lead-card"]')
        .trigger('keydown', { key: 'Enter' });
      expect(wrapper.emitted('open')).toHaveLength(1);
    });

    it('emits "open" on Space keydown', async () => {
      const wrapper = mountCard();
      await wrapper
        .find('[data-testid="lead-card"]')
        .trigger('keydown', { key: ' ' });
      expect(wrapper.emitted('open')).toHaveLength(1);
    });

    it('does not activate on unrelated keys (Tab, ArrowDown)', async () => {
      const wrapper = mountCard();
      const card = wrapper.find('[data-testid="lead-card"]');
      await card.trigger('keydown', { key: 'Tab' });
      await card.trigger('keydown', { key: 'ArrowDown' });
      expect(wrapper.emitted('open')).toBeUndefined();
    });

    it('does NOT emit "open" when Enter/Space is pressed on the menu trigger', async () => {
      // Regression guard. Without the `event.target !== event.currentTarget`
      // check in handleKeydown, a keydown on the focused menu button bubbles
      // to the article and double-fires (drawer + menu). Adversarial review
      // PR #48 H1.
      const wrapper = mountCard();
      const trigger = wrapper.find('[data-testid="lead-card-menu-trigger"]');
      await trigger.trigger('keydown', { key: 'Enter' });
      await trigger.trigger('keydown', { key: ' ' });
      expect(wrapper.emitted('open')).toBeUndefined();
    });
  });
});
