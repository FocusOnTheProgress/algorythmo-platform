import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgGlassCard from '../AlgGlassCard.vue';
import AlgGlassTile from '../AlgGlassTile.vue';

describe('AlgGlassCard', () => {
  it('defaults to the soft tier', () => {
    const wrapper = mount(AlgGlassCard);
    expect(wrapper.classes()).toContain('alg-glass-card--soft');
  });

  it('applies the requested tier', () => {
    const wrapper = mount(AlgGlassCard, { props: { tier: 'hard' } });
    expect(wrapper.classes()).toContain('alg-glass-card--hard');
  });

  it('always carries a grain overlay (the visionOS tell)', () => {
    const wrapper = mount(AlgGlassCard);
    expect(wrapper.find('.alg-glass-card__grain').exists()).toBe(true);
  });

  it('renders slot content', () => {
    const wrapper = mount(AlgGlassCard, { slots: { default: 'Hello' } });
    expect(wrapper.text()).toContain('Hello');
  });

  it('adds the interactive modifier and renders the chosen element', () => {
    const wrapper = mount(AlgGlassCard, {
      props: { interactive: true, as: 'button' },
    });
    expect(wrapper.classes()).toContain('alg-glass-card--interactive');
    expect(wrapper.element.tagName).toBe('BUTTON');
  });
});

describe('AlgGlassTile', () => {
  it('renders the label and value', () => {
    const wrapper = mount(AlgGlassTile, {
      props: { label: 'Receita', value: 'R$ 482k' },
    });
    expect(wrapper.text()).toContain('Receita');
    expect(wrapper.text()).toContain('R$ 482k');
  });

  it('omits the caption when not provided', () => {
    const wrapper = mount(AlgGlassTile, {
      props: { label: 'X', value: 1 },
    });
    expect(wrapper.find('.alg-glass-tile__caption').exists()).toBe(false);
  });

  it('tints the caption by tone', () => {
    const wrapper = mount(AlgGlassTile, {
      props: { label: 'X', value: 1, caption: '+1%', tone: 'success' },
    });
    expect(wrapper.find('.alg-glass-tile__caption').classes()).toContain(
      'alg-glass-tile__caption--success'
    );
  });
});
