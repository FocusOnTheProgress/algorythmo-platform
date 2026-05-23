<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'Menu de opções',
  },
  placement: {
    type: String,
    default: 'bottom-end',
  },
});

const emit = defineEmits(['open', 'close']);

const isOpen = ref(false);
const menuRef = ref(null);
const triggerRect = ref(null);
let triggerEl = null;

const floatingStyles = computed(() => {
  if (!triggerRect.value) return {};
  const r = triggerRect.value;
  const top = r.bottom + window.scrollY + 4;
  let left;

  if (props.placement === 'bottom-end') {
    left = r.right + window.scrollX;
  } else {
    left = r.left + window.scrollX;
  }

  return {
    position: 'absolute',
    top: `${top}px`,
    ...(props.placement === 'bottom-end'
      ? { right: `${window.innerWidth - left}px` }
      : { left: `${left}px` }),
  };
});

function getItems() {
  if (!menuRef.value) return [];
  return Array.from(
    menuRef.value.querySelectorAll(
      '[role="menuitem"]:not([aria-disabled="true"]):not([disabled])'
    )
  );
}

function focusFirstItem() {
  const items = getItems();
  items[0]?.focus();
}

function updateTriggerRect() {
  if (triggerEl) {
    triggerRect.value = triggerEl.getBoundingClientRect();
  }
}

// eslint-disable-next-line no-use-before-define
function handleGlobalKeydown(e) {
  // eslint-disable-next-line no-use-before-define
  if (e.key === 'Escape') close();
}

// eslint-disable-next-line no-use-before-define
function handleOutsideClick(e) {
  if (menuRef.value && !menuRef.value.contains(e.target)) {
    if (triggerEl && !triggerEl.contains(e.target)) {
      // eslint-disable-next-line no-use-before-define
      close();
    }
  }
}

function handleKeydown(e) {
  const items = getItems();
  const current = document.activeElement;
  const idx = items.indexOf(current);

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
      break;
    case 'ArrowUp':
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
      break;
    case 'Home':
      e.preventDefault();
      items[0]?.focus();
      break;
    case 'End':
      e.preventDefault();
      items[items.length - 1]?.focus();
      break;
    case 'Tab':
      // eslint-disable-next-line no-use-before-define
      close();
      break;
    default:
      break;
  }
}

function close() {
  isOpen.value = false;
  emit('close');
  document.removeEventListener('click', handleOutsideClick, { capture: true });
  document.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('scroll', updateTriggerRect, { capture: true });
  window.removeEventListener('resize', updateTriggerRect);
  triggerEl?.focus?.();
}

function open() {
  isOpen.value = true;
  emit('open');
  document.addEventListener('click', handleOutsideClick, { capture: true });
  document.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('scroll', updateTriggerRect, {
    passive: true,
    capture: true,
  });
  window.addEventListener('resize', updateTriggerRect, { passive: true });
  nextTick(() => focusFirstItem());
}

function toggle(event) {
  triggerEl = event?.currentTarget ?? event?.target ?? null;
  updateTriggerRect();
  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick, { capture: true });
  document.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('scroll', updateTriggerRect, { capture: true });
  window.removeEventListener('resize', updateTriggerRect);
});

defineExpose({ open, close, toggle, isOpen });
</script>

<template>
  <div class="alg-menu-root">
    <slot name="trigger" :toggle="toggle" :is-open="isOpen" />
    <teleport to="body">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="alg-menu"
        role="menu"
        :aria-label="label"
        :style="floatingStyles"
        @keydown="handleKeydown"
      >
        <slot :close="close" />
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.alg-menu-root {
  position: relative;
  display: inline-flex;
}
</style>
