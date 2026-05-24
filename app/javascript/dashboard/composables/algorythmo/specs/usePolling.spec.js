import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref } from 'vue';
import { usePolling } from '../usePolling.js';

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: document is visible.
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls fetchFn after intervalMs on start()', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { start } = usePolling(fetchFn, 8000);
    start();
    await vi.advanceTimersByTimeAsync(8000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('calls fetchFn repeatedly on each interval', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { start } = usePolling(fetchFn, 1000);
    start();
    await vi.advanceTimersByTimeAsync(3500);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('stop() halts polling', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { start, stop } = usePolling(fetchFn, 1000);
    start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('skips tick when document is hidden', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    });
    const { start } = usePolling(fetchFn, 1000);
    start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('skips tick when isActiveRef is false', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const isActive = ref(false);
    const { start } = usePolling(fetchFn, 1000, isActive);
    start();
    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('resumes after isActiveRef becomes true', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const isActive = ref(false);
    const { start } = usePolling(fetchFn, 1000, isActive);
    start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchFn).not.toHaveBeenCalled();
    isActive.value = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('applies exponential backoff on error (cap 32s)', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('boom'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { start } = usePolling(fetchFn, 8000);
    start();

    // First call at 8s → fails → next at 16s.
    await vi.advanceTimersByTimeAsync(8000);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Second call at 16s → fails → next at 32s.
    await vi.advanceTimersByTimeAsync(16000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Third call at 32s → fails → next at 32s (cap).
    await vi.advanceTimersByTimeAsync(32000);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });

  it('resets backoff to base interval on success after error', async () => {
    let failCount = 0;
    const fetchFn = vi.fn().mockImplementation(() => {
      failCount += 1;
      if (failCount <= 1) return Promise.reject(new Error('temp'));
      return Promise.resolve();
    });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { start } = usePolling(fetchFn, 1000);
    start();

    // 1st tick fails → backoff 2s.
    await vi.advanceTimersByTimeAsync(1000);
    // 2nd tick after 2s succeeds → backoff resets to 1s.
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // 3rd tick after 1s.
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });

  it('start() is idempotent — calling twice does not double-poll', async () => {
    const fetchFn = vi.fn().mockResolvedValue(undefined);
    const { start } = usePolling(fetchFn, 1000);
    start();
    start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
