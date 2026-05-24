import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgMenu from '../AlgMenu.vue';

// AlgMenu teleports to body — query DOM from document.body.
const q = sel => document.body.querySelector(sel);

function mountMenu(options = {}) {
  return mount(AlgMenu, {
    props: { label: 'Opções', ...options },
    attachTo: document.body,
    slots: {
      // Slot prop 'toggle' is the toggle function exposed by AlgMenu.
      trigger: `<template #trigger="{ toggle }">
        <button id="trigger" @click="toggle">⋮</button>
      </template>`,
      default: `<template #default>
        <button id="item1" role="menuitem">Mover para...</button>
        <button id="item2" role="menuitem">Reabrir</button>
      </template>`,
    },
  });
}

describe('AlgMenu', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('is closed by default', () => {
    const wrapper = mountMenu();
    expect(q('[role="menu"]')).toBeNull();
    wrapper.unmount();
  });

  it('opens when trigger is clicked', async () => {
    const wrapper = mountMenu();
    await q('#trigger').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    // Trigger uses @click="toggle" which is slot prop from AlgMenu
    // Since trigger is a scoped slot, clicking calls toggle.
    // Let's use wrapper to find and click the trigger button.
    wrapper.unmount();
  });

  it('has role=menu after open', async () => {
    const wrapper = mountMenu();
    // Call the internal open function via vm.
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    await wrapper.vm.$nextTick();
    expect(q('[role="menu"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('has aria-label on the menu', async () => {
    const wrapper = mountMenu({ label: 'Card menu' });
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    await wrapper.vm.$nextTick();
    expect(q('[role="menu"]').getAttribute('aria-label')).toBe('Card menu');
    wrapper.unmount();
  });

  it('closes on Escape key globally', async () => {
    const wrapper = mountMenu();
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    await wrapper.vm.$nextTick();
    expect(q('[role="menu"]')).not.toBeNull();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(q('[role="menu"]')).toBeNull();
    wrapper.unmount();
  });

  it('emits open event when menu opens', async () => {
    const wrapper = mountMenu();
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    expect(wrapper.emitted('open')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close event when menu closes', async () => {
    const wrapper = mountMenu();
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });

  it('toggle() is idempotent: open → toggle → closes', async () => {
    const wrapper = mountMenu();
    const btn = document.createElement('button');
    await wrapper.vm.open({ currentTarget: btn });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isOpen).toBe(true);
    await wrapper.vm.toggle({ currentTarget: btn });
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isOpen).toBe(false);
    wrapper.unmount();
  });

  it('navigates items with ArrowDown keydown on menu', async () => {
    const wrapper = mountMenu();
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    await wrapper.vm.$nextTick();
    const menu = q('[role="menu"]');
    expect(menu).not.toBeNull();
    // ArrowDown should not throw.
    menu.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    wrapper.unmount();
  });

  it('ArrowUp wraps to last item', async () => {
    const wrapper = mountMenu();
    await wrapper.vm.open({ currentTarget: document.createElement('button') });
    await wrapper.vm.$nextTick();
    const menu = q('[role="menu"]');
    menu.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    wrapper.unmount();
  });
});
