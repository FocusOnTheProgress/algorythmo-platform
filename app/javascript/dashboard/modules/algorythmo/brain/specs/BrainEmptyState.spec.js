// algorythmo: M3-PR3 — BrainEmptyState unit spec
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainEmptyState from '../BrainEmptyState.vue';

// Global i18n and plugins are wired in vitest.setup.js.

function mountComponent() {
  return mount(BrainEmptyState);
}

describe('BrainEmptyState', () => {
  it('renders all 3 onboarding steps', () => {
    const wrapper = mountComponent();
    const steps = wrapper.findAll('.alg-brain-empty__step');
    expect(steps).toHaveLength(3);
  });

  it('numbers the steps 1, 2, 3 in order', () => {
    const wrapper = mountComponent();
    const numbers = wrapper
      .findAll('.alg-brain-empty__step-number')
      .map(el => el.text().trim());
    expect(numbers).toEqual(['1', '2', '3']);
  });

  it('renders a title for each step', () => {
    const wrapper = mountComponent();
    const titles = wrapper.findAll('.alg-brain-empty__step-title');
    expect(titles).toHaveLength(3);
    titles.forEach(t => expect(t.text().trim().length).toBeGreaterThan(0));
  });

  it('renders a description for each step', () => {
    const wrapper = mountComponent();
    const descs = wrapper.findAll('.alg-brain-empty__step-desc');
    expect(descs).toHaveLength(3);
    descs.forEach(d => expect(d.text().trim().length).toBeGreaterThan(0));
  });

  it('renders an accessible ordered list with aria-label', () => {
    const wrapper = mountComponent();
    const list = wrapper.find('ol.alg-brain-empty__steps');
    expect(list.exists()).toBe(true);
    expect(list.attributes('aria-label')).toBeTruthy();
  });

  it('renders the Day-1 footer text', () => {
    const wrapper = mountComponent();
    const footer = wrapper.find('.alg-brain-empty__footer');
    expect(footer.exists()).toBe(true);
    expect(footer.text().trim().length).toBeGreaterThan(0);
  });
});
