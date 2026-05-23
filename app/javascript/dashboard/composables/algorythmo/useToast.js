import { reactive, readonly } from 'vue';

// ---------------------------------------------------------------------------
// Toast singleton — shared across all components.
// AlgToastContainer.vue renders this list.
// ---------------------------------------------------------------------------

let nextId = 1;

const toasts = reactive([]);

const AUTO_DISMISS_MS = {
  success: 4000,
  info: 4000,
  error: null, // persists until user closes
};

function dismiss(id) {
  const idx = toasts.findIndex(t => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}

function add({ type, message, retry }) {
  const id = nextId;
  nextId += 1;
  const toast = { id, type, message, retry: retry ?? null };
  toasts.push(toast);

  const duration = AUTO_DISMISS_MS[type];
  if (duration !== null) {
    setTimeout(() => dismiss(id), duration);
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
