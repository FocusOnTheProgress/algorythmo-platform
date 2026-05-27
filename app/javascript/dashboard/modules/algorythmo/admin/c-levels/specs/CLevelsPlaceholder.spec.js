// algorythmo: M7 — CLevelsPlaceholder unit spec
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CLevelsPlaceholder from '../CLevelsPlaceholder.vue';

function mountComponent() {
  return mount(CLevelsPlaceholder);
}

describe('CLevelsPlaceholder', () => {
  it('renders the atmospheric stage container', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('.alg-clevels__stage').exists()).toBe(true);
  });

  it('renders the decorative halo behind the stage', () => {
    const wrapper = mountComponent();
    const halo = wrapper.find('.alg-clevels__halo');
    expect(halo.exists()).toBe(true);
    expect(halo.attributes('aria-hidden')).toBe('true');
  });

  it('renders the inline boardroom glyph as decorative SVG', () => {
    const wrapper = mountComponent();
    const glyph = wrapper.find('svg.alg-clevels__glyph');
    expect(glyph.exists()).toBe(true);
    expect(glyph.attributes('aria-hidden')).toBe('true');
  });

  it('renders the title heading with non-empty text', () => {
    const wrapper = mountComponent();
    const title = wrapper.find('.alg-clevels__title');
    expect(title.exists()).toBe(true);
    expect(title.text().trim().length).toBeGreaterThan(0);
  });

  it('renders the body copy with non-empty text', () => {
    const wrapper = mountComponent();
    const body = wrapper.find('.alg-clevels__body');
    expect(body.exists()).toBe(true);
    expect(body.text().trim().length).toBeGreaterThan(0);
  });
});
