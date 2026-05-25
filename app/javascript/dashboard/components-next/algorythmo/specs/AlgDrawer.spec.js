import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgDrawer from '../AlgDrawer.vue';

// Teleported elements go to document.body — query from there.
const q = sel => document.body.querySelector(sel);

function mountDrawer(
  props = {},
  slotContent = '<button id="inner-btn">Focus me</button>'
) {
  return mount(AlgDrawer, {
    props: { title: 'Test Drawer', open: true, ...props },
    attachTo: document.body,
    slots: { default: slotContent },
  });
}

describe('AlgDrawer', () => {
  afterEach(() => {
    // Clean up any remaining DOM.
    document.body.innerHTML = '';
  });

  it('renders dialog when open=true', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    expect(q('[role="dialog"]')).not.toBeNull();
    wrapper.unmount();
  });

  it('does not render dialog when open=false', async () => {
    const wrapper = mountDrawer({ open: false });
    await wrapper.vm.$nextTick();
    expect(q('[role="dialog"]')).toBeNull();
    wrapper.unmount();
  });

  it('has aria-modal=true on dialog element', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    expect(q('[role="dialog"]').getAttribute('aria-modal')).toBe('true');
    wrapper.unmount();
  });

  it('has aria-label matching title prop', async () => {
    const wrapper = mountDrawer({ open: true, title: 'Lead Details' });
    await wrapper.vm.$nextTick();
    expect(q('[role="dialog"]').getAttribute('aria-label')).toBe(
      'Lead Details'
    );
    wrapper.unmount();
  });

  it('emits update:open=false when close button clicked', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    q('button[aria-label="Fechar"]').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('emits update:open=false on Esc keydown', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    const dialog = q('[role="dialog"]');
    dialog.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    );
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('emits update:open=false when scrim clicked with closeOnBackdrop=true', async () => {
    const wrapper = mountDrawer({ open: true, closeOnBackdrop: true });
    await wrapper.vm.$nextTick();
    q('.alg-drawer-scrim').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('does NOT emit close when scrim clicked with closeOnBackdrop=false', async () => {
    const wrapper = mountDrawer({ open: true, closeOnBackdrop: false });
    await wrapper.vm.$nextTick();
    q('.alg-drawer-scrim').click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('update:open')).toBeFalsy();
    wrapper.unmount();
  });

  it('renders slot content inside the drawer', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    expect(q('#inner-btn')).not.toBeNull();
    wrapper.unmount();
  });

  it('renders footer slot when provided', async () => {
    const wrapper = mount(AlgDrawer, {
      props: { title: 'T', open: true },
      attachTo: document.body,
      slots: {
        default: '<p>body</p>',
        footer: '<button id="footer-btn">Save</button>',
      },
    });
    await wrapper.vm.$nextTick();
    expect(q('.alg-drawer__footer')).not.toBeNull();
    expect(q('#footer-btn')).not.toBeNull();
    wrapper.unmount();
  });

  it('does not render footer when no footer slot', async () => {
    const wrapper = mountDrawer({ open: true });
    await wrapper.vm.$nextTick();
    expect(q('.alg-drawer__footer')).toBeNull();
    wrapper.unmount();
  });

  it('has .alg-drawer__header with title', async () => {
    const wrapper = mountDrawer({ open: true, title: 'Detalhes do Lead' });
    await wrapper.vm.$nextTick();
    expect(q('.alg-drawer__title').textContent).toBe('Detalhes do Lead');
    wrapper.unmount();
  });

  describe('testid + dataset forwarding (CONTRACT_M1B §7)', () => {
    it('forwards rootTestid to the dialog root', async () => {
      const wrapper = mountDrawer({
        open: true,
        rootTestid: 'lead-detail-drawer',
      });
      await wrapper.vm.$nextTick();
      expect(q('[data-testid="lead-detail-drawer"]').getAttribute('role')).toBe(
        'dialog'
      );
      wrapper.unmount();
    });

    it('forwards titleTestid to the h2 title', async () => {
      const wrapper = mountDrawer({
        open: true,
        titleTestid: 'drawer-title',
      });
      await wrapper.vm.$nextTick();
      const title = q('[data-testid="drawer-title"]');
      expect(title).not.toBeNull();
      expect(title.tagName).toBe('H2');
      wrapper.unmount();
    });

    it('forwards closeTestid to the close button', async () => {
      const wrapper = mountDrawer({
        open: true,
        closeTestid: 'drawer-close',
      });
      await wrapper.vm.$nextTick();
      const close = q('[data-testid="drawer-close"]');
      expect(close).not.toBeNull();
      expect(close.tagName).toBe('BUTTON');
      wrapper.unmount();
    });

    it('spreads rootDataset onto the dialog root', async () => {
      const wrapper = mountDrawer({
        open: true,
        rootTestid: 'lead-detail-drawer',
        rootDataset: { 'data-lead-id': 91, 'data-foo': 'bar' },
      });
      await wrapper.vm.$nextTick();
      const root = q('[data-testid="lead-detail-drawer"]');
      expect(root.getAttribute('data-lead-id')).toBe('91');
      expect(root.getAttribute('data-foo')).toBe('bar');
      wrapper.unmount();
    });

    it('omits the testid attributes when props are not supplied', async () => {
      const wrapper = mountDrawer({ open: true });
      await wrapper.vm.$nextTick();
      const dialog = q('[role="dialog"]');
      expect(dialog.hasAttribute('data-testid')).toBe(false);
      expect(q('.alg-drawer__title').hasAttribute('data-testid')).toBe(false);
      expect(q('button[aria-label="Fechar"]').hasAttribute('data-testid')).toBe(
        false
      );
      wrapper.unmount();
    });
  });
});
