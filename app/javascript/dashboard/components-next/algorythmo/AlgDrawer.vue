<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';

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
  // Optional testid/data forwarding so consumers (e.g. LeadDetailDrawer) can
  // satisfy QA contracts that require specific identifiers on the dialog
  // root, title, and close button. Defaults to undefined so existing
  // consumers are unaffected.
  rootTestid: {
    type: String,
    default: undefined,
  },
  titleTestid: {
    type: String,
    default: undefined,
  },
  closeTestid: {
    type: String,
    default: undefined,
  },
  rootDataset: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:open', 'close']);

const drawerRef = ref(null);
let previousFocus = null;
let previousBodyOverflow = '';
let bodyLocked = false;

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

function close() {
  emit('update:open', false);
  emit('close');
}

// Document-level Esc so it works even if focus is outside the drawer element.
function handleDocEsc(e) {
  if (e.key === 'Escape') close();
}

function unlock() {
  document.body.style.overflow = previousBodyOverflow;
  document.removeEventListener('keydown', handleDocEsc);
  if (drawerRef.value) {
    drawerRef.value.removeEventListener('keydown', handleKeydown);
  }
}

watch(
  () => props.open,
  val => {
    if (val) {
      bodyLocked = true;
      previousFocus = document.activeElement;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleDocEsc);
      nextTick(() => {
        if (drawerRef.value) {
          const focusables = getFocusables(drawerRef.value);
          if (focusables.length) focusables[0].focus();
          drawerRef.value.addEventListener('keydown', handleKeydown);
        }
      });
    } else if (bodyLocked) {
      // Only unlock if we actually locked — prevents clobbering an external
      // scroll-lock when a second drawer mounts with open=false.
      unlock();
      bodyLocked = false;
      previousFocus?.focus?.();
      previousFocus = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (bodyLocked) {
    unlock();
    bodyLocked = false;
  }
  previousFocus?.focus?.();
  previousFocus = null;
});

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
        :data-testid="rootTestid"
        v-bind="rootDataset"
      >
        <div class="alg-drawer__header">
          <h2 class="alg-drawer__title" :data-testid="titleTestid">
            {{ title }}
          </h2>
          <button
            class="alg-btn alg-btn--ghost alg-btn--icon alg-btn--sm"
            :aria-label="closeLabel"
            :data-testid="closeTestid"
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
