<script setup>
import AlgToast from './AlgToast.vue';
import { useToast } from 'dashboard/composables/algorythmo/useToast.js';

defineProps({
  label: {
    type: String,
    default: 'Notificações',
  },
});

const { toasts, dismiss } = useToast();
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
