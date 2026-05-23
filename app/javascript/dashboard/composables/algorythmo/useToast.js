import { reactive, readonly } from 'vue';

// ---------------------------------------------------------------------------
// Toast singleton — shared across all components.
// AlgToastContainer.vue renders this list.
// ---------------------------------------------------------------------------

const MAX_TOASTS = 5;
let nextId = 1;

const toasts = reactive([]);
/** @type {Map<number, ReturnType<typeof setTimeout>>} */
const timerIds = new Map();

const AUTO_DISMISS_MS = {
  success: 4000,
  info: 4000,
  error: null, // persists until user closes
};

function dismiss(id) {
  const timer = timerIds.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timerIds.delete(id);
  }
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}

function add({ type, message, retry }) {
  // Cap: evict oldest toast to prevent unbounded growth under error storms.
  while (toasts.length >= MAX_TOASTS) {
    dismiss(toasts[0].id);
  }
  const id = nextId;
  nextId += 1;
  toasts.push({ id, type, message, retry: retry ?? null });

  const duration = AUTO_DISMISS_MS[type];
  if (duration !== null) {
    timerIds.set(
      id,
      setTimeout(() => dismiss(id), duration)
    );
  }
  return id;
}

/**
 * Composable for showing toast notifications.
 * Uses module-level singleton state — safe for teleport container.
 *
 * @example
 * const { success, error, info } = useToast();
 * error('Falha ao mover lead', { retry: () => retryMove() });
 */
export function useToast() {
  return {
    toasts: readonly(toasts),
    dismiss,
    success(message) {
      return add({ type: 'success', message });
    },
    error(message, { retry } = {}) {
      return add({ type: 'error', message, retry });
    },
    info(message) {
      return add({ type: 'info', message });
    },
  };
}
