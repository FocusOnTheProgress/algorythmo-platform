<script setup>
// algorythmo: Stream E — shared centered modal shell for the Sala de Conselho.
//
// Glass-hard overlay + raised modal card (.alg-modal*), teleported to body,
// with focus trap, Esc-to-close, scroll lock and click-outside. Used by the
// source-report panel (data pill) and the work-order flow (Aprovar). Mirrors
// the AlgDrawer accessibility contract (aria-modal, restore focus on close).
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  closeLabel: { type: String, default: 'Fechar' },
  rootTestid: { type: String, default: undefined },
});

const emit = defineEmits(['update:open', 'close']);

const modalRef = ref(null);
let previousFocus = null;
let previousBodyOverflow = '';
let locked = false;

function getFocusables(el) {
  return Array.from(
    el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function trapFocus(e) {
  const f = getFocusables(modalRef.value);
  if (!f.length) return;
  const first = f[0];
  const last = f[f.length - 1];
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

function onKeydown(e) {
  if (e.key === 'Tab') trapFocus(e);
}

function close() {
  emit('update:open', false);
  emit('close');
}

function onDocEsc(e) {
  if (e.key === 'Escape') close();
}

function unlock() {
  document.body.style.overflow = previousBodyOverflow;
  document.removeEventListener('keydown', onDocEsc);
  modalRef.value?.removeEventListener('keydown', onKeydown);
}

watch(
  () => props.open,
  val => {
    if (val) {
      locked = true;
      previousFocus = document.activeElement;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onDocEsc);
      nextTick(() => {
        if (modalRef.value) {
          const f = getFocusables(modalRef.value);
          if (f.length) f[0].focus();
          modalRef.value.addEventListener('keydown', onKeydown);
        }
      });
    } else if (locked) {
      unlock();
      locked = false;
      previousFocus?.focus?.();
      previousFocus = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (locked) {
    unlock();
    locked = false;
  }
  previousFocus?.focus?.();
  previousFocus = null;
});
</script>

<template>
  <teleport to="body">
    <transition name="alg-cl-modal">
      <div v-if="open" class="alg-modal-overlay" @click.self="close">
        <div
          ref="modalRef"
          class="alg-modal"
          role="dialog"
          :aria-modal="true"
          :aria-label="title"
          :data-testid="rootTestid"
        >
          <header class="alg-modal__header">
            <h2 class="alg-modal__title">{{ title }}</h2>
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
          </header>

          <div class="alg-modal__body">
            <slot />
          </div>

          <div v-if="$slots.footer" class="alg-modal__footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.alg-cl-modal-enter-active {
  transition: opacity var(--alg-duration-base) var(--alg-ease-cinematic);
}
.alg-cl-modal-leave-active {
  transition: opacity var(--alg-duration-fast) var(--alg-ease-in);
}
.alg-cl-modal-enter-from,
.alg-cl-modal-leave-to {
  opacity: 0;
}
</style>
