// algorythmo: cinematic-os DELTA-0009 — active-nav radius spec.
// Verifies that SidebarGroupHeader applies the inverse-tab treatment for active
// items: white fill (--alg-fg-primary), near-black text (--alg-black-1), no pill.
// Static source analysis + mount test — see SidebarChevron.spec.js for the
// test harness pattern (stubs, mocks).

import fs from 'node:fs';
import path from 'node:path';
import { mount } from '@vue/test-utils';
import SidebarGroupHeader from '../SidebarGroupHeader.vue';

vi.mock('dashboard/composables/store.js', () => ({
  useMapGetter: () => ({ value: null }),
}));

const IconStub = { template: '<span class="icon-stub" />' };

const mountHeader = (props = {}) =>
  mount(SidebarGroupHeader, {
    props: {
      name: 'TestGroup',
      label: 'Test Group',
      icon: 'i-lucide-test',
      expandable: false,
      isExpanded: false,
      isActive: false,
      hasActiveChild: false,
      to: '/test',
      ...props,
    },
    global: {
      stubs: {
        Icon: IconStub,
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });

// ---------------------------------------------------------------------------
// Source-level guarantee: active class string contains alg tokens, not the
// legacy bg-n-alpha-2 (grey fill) that existed before DELTA-0009.
// ---------------------------------------------------------------------------
const HEADER_PATH = path.resolve(__dirname, '..', 'SidebarGroupHeader.vue');
const source = fs.readFileSync(HEADER_PATH, 'utf8');

describe('SidebarGroupHeader active-nav inverse-tab (DELTA-0009)', () => {
  it('active item uses --alg-fg-primary fill token, not bg-n-alpha-2', () => {
    // The legacy grey fill must be gone from the active state binding.
    // Extract only the class binding line for the active condition.
    const activeClassMatch = source.match(
      /isActive && !hasActiveChild.*?\n.*?'([^']+)'/s
    );
    expect(activeClassMatch).not.toBeNull();
    const activeClasses = activeClassMatch ? activeClassMatch[1] : '';
    expect(activeClasses).toContain('--alg-fg-primary');
    expect(activeClasses).not.toContain('bg-n-alpha-2');
  });

  it('active item uses --alg-black-1 text token', () => {
    const activeClassMatch = source.match(
      /isActive && !hasActiveChild.*?\n.*?'([^']+)'/s
    );
    const activeClasses = activeClassMatch ? activeClassMatch[1] : '';
    expect(activeClasses).toContain('--alg-black-1');
  });

  it('active item does NOT use pill radius (--alg-radius-pill / 9999px)', () => {
    // The active binding must not reference pill radius.
    // We scan the full isActive block (up to the next key).
    const activeBlockMatch = source.match(
      /'(\[background-color[^']+)'\s*:\s*isActive && !hasActiveChild/
    );
    if (activeBlockMatch) {
      expect(activeBlockMatch[1]).not.toContain('pill');
      expect(activeBlockMatch[1]).not.toContain('9999');
    }
    // At minimum the source must not use rounded-full on the active block
    // (rounded-full maps to border-radius:9999px in Tailwind).
    const sourceAroundActive = source.slice(
      source.indexOf('isActive && !hasActiveChild') - 100,
      source.indexOf('isActive && !hasActiveChild') + 200
    );
    expect(sourceAroundActive).not.toContain('rounded-full');
  });

  // ---------------------------------------------------------------------------
  // Mount-level: verify that active state classes are applied correctly.
  // ---------------------------------------------------------------------------
  it('applies inverse-tab class when isActive=true and hasActiveChild=false', () => {
    const wrapper = mountHeader({ isActive: true, hasActiveChild: false });
    const el = wrapper.element;
    // The element should have the arbitrary bg class applied
    // We check by looking at the class attribute string for the token reference
    const classAttr = el.getAttribute('class') || '';
    // Tailwind processes arbitrary values at build time; in test env the class
    // string will contain the arbitrary-value class name verbatim.
    expect(classAttr).toContain('alg-fg-primary');
    expect(classAttr).not.toContain('bg-n-alpha-2');
  });

  it('does NOT apply inverse-tab class when isActive=false', () => {
    const wrapper = mountHeader({ isActive: false, hasActiveChild: false });
    const classAttr = wrapper.element.getAttribute('class') || '';
    expect(classAttr).not.toContain('alg-fg-primary');
  });

  it('does NOT apply inverse-tab class when hasActiveChild=true (parent-of-active)', () => {
    // Parent with active child uses a different style (just font-medium, no white fill)
    const wrapper = mountHeader({ isActive: true, hasActiveChild: true });
    const classAttr = wrapper.element.getAttribute('class') || '';
    expect(classAttr).not.toContain('alg-fg-primary');
    expect(classAttr).toContain('font-medium');
  });

  it('base class uses rounded-xl (12 px = --alg-radius-md), not rounded-lg (8 px) or rounded-full', () => {
    // All items — active or not — must use the design-system default radius (12 px).
    // rounded-xl in Tailwind v3 = 0.75 rem = 12 px = var(--alg-radius-md).
    const templateStart = source.indexOf('<template>');
    const template = templateStart >= 0 ? source.slice(templateStart) : source;
    // The base class on the root element must use rounded-xl
    expect(template).toContain('rounded-xl');
    expect(template).not.toContain('rounded-full');
  });
});
