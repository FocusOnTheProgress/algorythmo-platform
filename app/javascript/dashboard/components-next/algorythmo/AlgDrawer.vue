<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  /** Controls open state (v-model:open) */
  open: {
    type: Boolean,
    default: false,
  },
  title: {
    type: String,
    required: true,
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  closeLabel: {
    type: String,
    default: 'Fechar',
  },
});

const emit = defineEmits(['update:open', 'close']);

const drawerRef = ref(null);
let previousFocus = null;

function getFocusables(el) {
  return Array.from(
    el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function trapFocus(e) {
  const focusables = getFocusables(drawerRef.value);
  if (!focusables.length) return;

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function handleKeydown(e) {
  if (e.key === 'Tab') trapFocus(e);
}

watch(
  () => props.open,
  val => {
    if (val) {
      previousFocus = document.activeElement;
      nextTick(() => {
        if (drawerRef.value) {
          const focusables = getFocusables(drawerRef.value);
          if (focusables.length) focusables[0].focus();
          drawerRef.value.addEventListener('keydown', handleKeydown);
        }
      });
    } else {
      if (drawerRef.value) {
        drawerRef.value.removeEventListener('keydown', handleKeydown);
      }
      previousFocus?.focus?.();
      previousFocus = null;
    }
  }
);

function close() {
  emit('update:open', false);
  emit('close');
}

function closeOnScrim() {
  if (props.closeOnBackdrop) close();
}

function onAfterLeave() {
  // Hook for animation completeness — no-op, reserved for consumers.
}
</script>

<template>
  <teleport to="body">
    <transition name="alg-drawer-scrim" @after-leave="onAfterLeave">
      <div
        v-if="open"
        class="alg-drawer-scrim"
        aria-hidden="true"
        @click="closeOnScrim"
      />
    </transition>
    <transition name="alg-drawer">
      <div
        v-if="open"
        ref="drawerRef"
        class="alg-drawer"
        role="dialog"
        :aria-modal="true"
        :aria-label="title"
        @keydown.esc="close"
      >
        <div class="alg-drawer__header">
          <h2 class="alg-drawer__title">{{ title }}</h2>
          <button
            class="alg-btn alg-btn--ghost alg-btn--icon alg-btn--sm"
            :aria-label="closeLabel"
            @click="close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
        <div class="alg-drawer__body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="alg-drawer__footer">
          <slot name="footer" />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.alg-drawer-scrim-enter-active,
.alg-drawer-scrim-leave-active {
  transition: opacity var(--alg-duration-base) var(--alg-ease-out);
}
.alg-drawer-scrim-enter-from,
.alg-drawer-scrim-leave-to {
  opacity: 0;
}

.alg-drawer-enter-active {
  transition: transform var(--alg-duration-slow) var(--alg-ease-out);
}
.alg-drawer-leave-active {
  transition: transform var(--alg-duration-base) var(--alg-ease-in);
}
.alg-drawer-enter-from,
.alg-drawer-leave-to {
  transform: translateX(100%);
}
</style>
