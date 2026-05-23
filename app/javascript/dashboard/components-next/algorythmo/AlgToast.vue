<script setup>
const props = defineProps({
  toast: {
    type: Object,
    required: true,
    // Shape: { id, type: 'success'|'error'|'info', message, retry?: () => void }
  },
});

const emit = defineEmits(['dismiss']);

function handleRetry() {
  props.toast.retry?.();
  emit('dismiss', props.toast.id);
}
</script>

<template>
  <div
    class="alg-toast"
    :class="`alg-toast--${toast.type}`"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <span class="alg-toast__icon" aria-hidden="true">
      <svg
        v-if="toast.type === 'success'"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <svg
        v-else-if="toast.type === 'error'"
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </span>
    <div class="alg-toast__body">
      <span class="alg-toast__message">{{ toast.message }}</span>
      <!-- eslint-disable-next-line vue/no-bare-strings-in-template, @intlify/vue-i18n/no-raw-text -->
      <button v-if="toast.retry" class="alg-toast__action" @click="handleRetry">
        Tentar de novo
      </button>
    </div>
    <button
      class="alg-toast__close"
      :aria-label="`Fechar notificação: ${toast.message}`"
      @click="$emit('dismiss', toast.id)"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  </div>
</template>
