// algorythmo: M2-a — D6 chevron indicator spec.
// Verifies that SidebarGroupHeader renders a chevron for expandable items,
// that it's always visible (not just when expanded), that `aria-expanded` is
// correct on the trigger button, and that `aria-controls` links to the children ul.

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
      expandable: true,
      isExpanded: false,
      isActive: false,
      hasActiveChild: false,
      ...props,
    },
    global: {
      stubs: {
        Icon: IconStub,
        RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      },
    },
  });

describe('SidebarGroupHeader chevron (D6)', () => {
  it('renders a chevron icon when expandable', () => {
    const wrapper = mountHeader({ expandable: true });
    // Chevron uses i-lucide-chevron-down class
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.exists()).toBe(true);
  });

  it('does NOT render a chevron when not expandable', () => {
    const wrapper = mountHeader({ expandable: false });
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.exists()).toBe(false);
  });

  it('chevron is visible when collapsed (not v-show gated)', () => {
    const wrapper = mountHeader({ expandable: true, isExpanded: false });
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.exists()).toBe(true);
    // v-show="isExpanded" would make it hidden — confirm it's visible when collapsed
    expect(chevron.isVisible()).toBe(true);
  });

  it('chevron has rotate-180 class when expanded', () => {
    const wrapper = mountHeader({ expandable: true, isExpanded: true });
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.classes()).toContain('rotate-180');
  });

  it('chevron has rotate-0 class when collapsed', () => {
    const wrapper = mountHeader({ expandable: true, isExpanded: false });
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.classes()).toContain('rotate-0');
  });

  it('trigger has aria-expanded=true when expanded', () => {
    const wrapper = mountHeader({ expandable: true, isExpanded: true });
    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-expanded')).toBe('true');
  });

  it('trigger has aria-expanded=false when collapsed', () => {
    const wrapper = mountHeader({ expandable: true, isExpanded: false });
    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-expanded')).toBe('false');
  });

  it('trigger has aria-controls linking to children ul id', () => {
    const wrapper = mountHeader({ name: 'Reports', expandable: true });
    const trigger = wrapper.find('button');
    expect(trigger.attributes('aria-controls')).toBe(
      'sidebar-children-Reports'
    );
  });

  it('non-expandable header does not expose aria-expanded', () => {
    const wrapper = mountHeader({ expandable: false, to: '/reports' });
    // Non-expandable renders as router-link, not button — no aria-expanded
    const button = wrapper.find('button');
    expect(button.exists()).toBe(false);
  });

  it('chevron has aria-hidden to avoid double-announcing to screen readers', () => {
    const wrapper = mountHeader({ expandable: true });
    const chevron = wrapper.find('.i-lucide-chevron-down');
    expect(chevron.attributes('aria-hidden')).toBe('true');
  });
});
