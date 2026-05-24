<script setup>
import { onBeforeUnmount } from 'vue';
import AlgToast from './AlgToast.vue';
import { useToast } from 'dashboard/composables/algorythmo/useToast.js';

defineProps({
  label: {
    type: String,
    default: 'Notificações',
  },
});

const { toasts, dismiss, clearAll } = useToast();

// Toast state lives in a module-level singleton, but the container is
// route-scoped (mounted by KanbanBoard). When the user navigates away,
// error toasts with AUTO_DISMISS_MS.error = null would survive the
// teardown and resurface on the next CRM mount — so we wipe the singleton
// on unmount.
onBeforeUnmount(() => {
  clearAll();
});
</script>

<template>
  <teleport to="body">
    <div class="alg-toast-container" :aria-label="label" role="region">
      <transition-group name="alg-toast" tag="div" class="alg-toast-list">
        <AlgToast
          v-for="toast in toasts"
          :key="toast.id"
          :toast="toast"
          @dismiss="dismiss"
        />
      </transition-group>
    </div>
  </teleport>
</template>

<style scoped>
.alg-toast-list {
  display: contents;
}

.alg-toast-enter-active {
  transition:
    opacity var(--alg-duration-base) var(--alg-ease-out),
    transform var(--alg-duration-base) var(--alg-ease-out);
}

.alg-toast-leave-active {
  transition:
    opacity var(--alg-duration-fast) var(--alg-ease-in),
    transform var(--alg-duration-fast) var(--alg-ease-in);
}

.alg-toast-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.97);
}

.alg-toast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.alg-toast-move {
  transition: transform var(--alg-duration-base) var(--alg-ease-out);
}
</style>
