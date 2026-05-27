// algorythmo: M8c — MarketplacePlaceholder unit spec
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MarketplacePlaceholder from '../MarketplacePlaceholder.vue';

// Global i18n (with Algorythmo overrides deep-merged) is wired in vitest.setup.js.

function mountComponent() {
  return mount(MarketplacePlaceholder);
}

describe('MarketplacePlaceholder — page structure', () => {
  it('renders the page header with a non-empty title', () => {
    const wrapper = mountComponent();
    const h1 = wrapper.find('h1');
    expect(h1.exists()).toBe(true);
    expect(h1.text().trim().length).toBeGreaterThan(0);
  });

  it('renders the page subheading', () => {
    const wrapper = mountComponent();
    // Subhead is the <p> inside the <header>
    const header = wrapper.find('header');
    const subhead = header.find('p');
    expect(subhead.exists()).toBe(true);
    expect(subhead.text().trim().length).toBeGreaterThan(0);
  });
});

describe('MarketplacePlaceholder — catalog grid', () => {
  it('renders at least 6 agent cards', () => {
    const wrapper = mountComponent();
    const cards = wrapper.findAll('[data-testid="marketplace-agent-card"]');
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });

  it('renders exactly 8 agent cards (full catalog)', () => {
    const wrapper = mountComponent();
    const cards = wrapper.findAll('[data-testid="marketplace-agent-card"]');
    expect(cards).toHaveLength(8);
  });

  it('every card has a non-empty agent name', () => {
    const wrapper = mountComponent();
    const names = wrapper.findAll('[data-testid="marketplace-agent-name"]');
    expect(names).toHaveLength(8);
    names.forEach(n => expect(n.text().trim().length).toBeGreaterThan(0));
  });

  it('every card has a non-empty description', () => {
    const wrapper = mountComponent();
    const descs = wrapper.findAll(
      '[data-testid="marketplace-agent-description"]'
    );
    expect(descs).toHaveLength(8);
    descs.forEach(d => expect(d.text().trim().length).toBeGreaterThan(0));
  });

  it('every card has a status chip with non-empty text', () => {
    const wrapper = mountComponent();
    const chips = wrapper.findAll('[data-testid="marketplace-status-chip"]');
    expect(chips).toHaveLength(8);
    chips.forEach(c => expect(c.text().trim().length).toBeGreaterThan(0));
  });

  it('uses an unordered list for the grid (semantically a catalog)', () => {
    const wrapper = mountComponent();
    const grid = wrapper.find('[data-testid="marketplace-catalog-grid"]');
    expect(grid.element.tagName.toLowerCase()).toBe('ul');
  });
});
