import { ref, onUnmounted } from 'vue';

/**
 * Generic polling composable.
 *
 * Calls `fetchFn` every `intervalMs` ms while `isActiveRef` is true AND
 * the document is visible. Pauses automatically on tab blur; resumes on
 * focus. Implements exponential back-off on error (base → cap).
 *
 * @param {() => Promise<void>} fetchFn     - The async function to call each tick.
 * @param {number}              intervalMs  - Base poll interval (default 8000ms).
 * @param {import('vue').Ref<boolean>} isActiveRef - External ref; set to false to pause.
 * @returns {{ start: () => void, stop: () => void, isPolling: import('vue').Ref<boolean> }}
 */
export function usePolling(fetchFn, intervalMs = 8000, isActiveRef = null) {
  const isPolling = ref(false);
  let timerId = null;
  let backoffMs = intervalMs;
  const BACKOFF_CAP = 32_000;

  async function tick() {
    if (!isPolling.value) return;
    if (document.visibilityState !== 'visible') {
      // eslint-disable-next-line no-use-before-define
      scheduleNext(intervalMs);
      return;
    }
    if (isActiveRef && !isActiveRef.value) {
      // eslint-disable-next-line no-use-before-define
      scheduleNext(intervalMs);
      return;
    }
    try {
      await fetchFn();
      backoffMs = intervalMs;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('algorythmo:polling-failed', err);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_CAP);
    }
    // eslint-disable-next-line no-use-before-define
    if (isPolling.value) scheduleNext(backoffMs);
  }

  function scheduleNext(delay) {
    timerId = setTimeout(tick, delay);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && isPolling.value) {
      // Resume immediately on tab focus instead of waiting for next timer.
      clearTimeout(timerId);
      tick();
    }
  }

  function start() {
    if (isPolling.value) return;
    isPolling.value = true;
    backoffMs = intervalMs;
    document.addEventListener('visibilitychange', handleVisibilityChange);
    scheduleNext(intervalMs);
  }

  function stop() {
    isPolling.value = false;
    clearTimeout(timerId);
    timerId = null;
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  }

  onUnmounted(stop);

  return { start, stop, isPolling };
}
