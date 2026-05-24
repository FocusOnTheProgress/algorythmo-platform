import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useToast', () => {
  let useToast;

  beforeEach(async () => {
    // Re-import to get fresh singleton state (module cache is shared in Vitest).
    // We reset via vi.resetModules so each test starts with empty toasts.
    vi.resetModules();
    const mod = await import('../useToast.js');
    useToast = mod.useToast;
  });

  it('starts with no toasts', () => {
    const { toasts } = useToast();
    expect(toasts).toHaveLength(0);
  });

  it('success() adds a success toast', () => {
    const { toasts, success } = useToast();
    success('Done!');
    expect(toasts[0]).toMatchObject({ type: 'success', message: 'Done!' });
  });

  it('error() adds an error toast', () => {
    const { toasts, error } = useToast();
    error('Falha!');
    expect(toasts[0]).toMatchObject({ type: 'error', message: 'Falha!' });
  });

  it('error() accepts retry callback', () => {
    const { toasts, error } = useToast();
    const retryFn = vi.fn();
    error('Falha!', { retry: retryFn });
    expect(toasts[0].retry).toBe(retryFn);
  });

  it('info() adds an info toast', () => {
    const { toasts, info } = useToast();
    info('Atenção');
    expect(toasts[0]).toMatchObject({ type: 'info', message: 'Atenção' });
  });

  it('dismiss() removes a toast by id', () => {
    const { toasts, success, dismiss } = useToast();
    const id = success('Hello');
    dismiss(id);
    expect(toasts.find(t => t.id === id)).toBeUndefined();
  });

  it('multiple toasts stack correctly', () => {
    const { toasts, success, error } = useToast();
    success('First');
    error('Second');
    expect(toasts).toHaveLength(2);
  });

  it('success/info auto-dismiss after 4s', async () => {
    vi.useFakeTimers();
    const { toasts, success } = useToast();
    success('Will dismiss');
    expect(toasts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(toasts).toHaveLength(0);
    vi.useRealTimers();
  });

  it('error toast does NOT auto-dismiss', async () => {
    vi.useFakeTimers();
    const { toasts, error } = useToast();
    error('Persists');
    await vi.advanceTimersByTimeAsync(10000);
    expect(toasts).toHaveLength(1);
    vi.useRealTimers();
  });
});
