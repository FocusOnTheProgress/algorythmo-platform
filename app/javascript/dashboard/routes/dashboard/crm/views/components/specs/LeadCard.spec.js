// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import LeadCard from '../LeadCard.vue';

const baseLead = () => ({
  id: 42,
  name: 'Maria Santos',
  stage_id: 7,
  stage_name: 'Qualificado',
  channel_origin: 'whatsapp',
  channel_icon: '\u260E', // ☎
  time_human: '3h',
  time_aria_long: 'há 3 horas',
  aging_state: 'green',
});

const mountCard = (overrides = {}) =>
  mount(LeadCard, {
    props: { lead: { ...baseLead(), ...overrides } },
    global: {
      stubs: {
        // Keep LeadAgingChip real — we assert on its rendered output below.
      },
    },
  });

describe('LeadCard (CONTRACT_M1B §3)', () => {
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

    it('builds the full pt_BR aria-label sentence', () => {
      const wrapper = mountCard();
      expect(
        wrapper.find('[data-testid="lead-card"]').attributes('aria-label')
      ).toBe(
        'Lead Maria Santos, etapa Qualificado, há 3 horas nesta etapa, canal whatsapp'
      );
    });
  });

  describe('content slots', () => {
    it('renders channel icon hidden from screen readers', () => {
      const wrapper = mountCard();
      const icon = wrapper.find('[data-testid="lead-card-channel-icon"]');
      expect(icon.text()).toBe('\u260E');
      expect(icon.attributes('aria-hidden')).toBe('true');
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
