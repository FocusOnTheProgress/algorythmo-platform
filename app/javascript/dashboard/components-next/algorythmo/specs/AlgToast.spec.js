import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgToast from '../AlgToast.vue';

function makeToast(overrides = {}) {
  return {
    id: 1,
    type: 'success',
    message: 'Operação realizada',
    retry: null,
    ...overrides,
  };
}

function mountToast(toast) {
  return mount(AlgToast, {
    props: { toast },
  });
}

describe('AlgToast', () => {
  it('renders the message', () => {
    const wrapper = mountToast(makeToast({ message: 'Salvo com sucesso' }));
    expect(wrapper.text()).toContain('Salvo com sucesso');
  });

  it('applies the correct type class', () => {
    const wrapper = mountToast(makeToast({ type: 'error' }));
    expect(wrapper.find('.alg-toast--error').exists()).toBe(true);
  });

  it('has role=status for screen reader', () => {
    const wrapper = mountToast(makeToast());
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it('has aria-live=polite', () => {
    const wrapper = mountToast(makeToast());
    expect(wrapper.attributes('aria-live')).toBe('polite');
  });

  it('emits dismiss with toast id when close button clicked', async () => {
    const toast = makeToast({ id: 42 });
    const wrapper = mountToast(toast);
    await wrapper.find('.alg-toast__close').trigger('click');
    expect(wrapper.emitted('dismiss')).toEqual([[42]]);
  });

  it('shows retry button when toast.retry is provided', () => {
    const toast = makeToast({ type: 'error', retry: vi.fn() });
    const wrapper = mountToast(toast);
    expect(wrapper.find('.alg-toast__action').exists()).toBe(true);
    expect(wrapper.find('.alg-toast__action').text()).toContain(
      'Tentar de novo'
    );
  });

  it('does NOT show retry button when retry is null', () => {
    const toast = makeToast({ retry: null });
    const wrapper = mountToast(toast);
    expect(wrapper.find('.alg-toast__action').exists()).toBe(false);
  });

  it('calls retry fn and emits dismiss when retry button clicked', async () => {
    const retryFn = vi.fn();
    const toast = makeToast({ id: 7, type: 'error', retry: retryFn });
    const wrapper = mountToast(toast);
    await wrapper.find('.alg-toast__action').trigger('click');
    expect(retryFn).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted('dismiss')).toEqual([[7]]);
  });

  it('close button has descriptive aria-label', () => {
    const toast = makeToast({ message: 'Erro crítico' });
    const wrapper = mountToast(toast);
    expect(
      wrapper.find('.alg-toast__close').attributes('aria-label')
    ).toContain('Erro crítico');
  });

  it('renders success icon for type=success', () => {
    const wrapper = mountToast(makeToast({ type: 'success' }));
    expect(wrapper.find('.alg-toast__icon polyline').exists()).toBe(true);
  });

  it('renders error icon for type=error', () => {
    const wrapper = mountToast(makeToast({ type: 'error' }));
    // Error icon has circle + lines
    expect(wrapper.find('.alg-toast__icon circle').exists()).toBe(true);
  });
});
