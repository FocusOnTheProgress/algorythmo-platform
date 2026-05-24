<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §6 — the menu that sits between the card's ⋮ trigger and the
// MoveLeadModal. Today contains a single "Mover para…" entry; future items
// (Marcar como ganho/perdido, Editar contato) slot in here so the contract
// data-testids remain stable.
//
// Positioning: anchored to the trigger button via getBoundingClientRect.
// We re-measure on open so account switches / scrolling don't desync the
// overlay. The Teleport target is body so the menu z-index always beats
// any kanban column overflow.
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  open: { type: Boolean, required: true },
  lead: { type: Object, default: null },
  anchor: { type: Object, default: null }, // HTMLElement (the menu trigger button)
});

const emit = defineEmits(['close', 'move']);

const { t } = useI18n();
const menuRef = ref(null);
const firstItemRef = ref(null);
const position = ref({ top: 0, left: 0 });

function measurePosition() {
  if (!props.anchor) return;
  const rect = props.anchor.getBoundingClientRect();
  // Anchor menu directly below the trigger, right-aligned to the trigger.
  position.value = {
    top: rect.bottom + window.scrollY + 4,
    left: rect.right + window.scrollX,
  };
}

function handleDocumentClick(event) {
  if (!props.open) return;
  const menu = menuRef.value;
  const anchor = props.anchor;
  if (menu?.contains(event.target)) return;
  if (anchor?.contains(event.target)) return;
  emit('close');
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    if (props.anchor instanceof HTMLElement) props.anchor.focus();
  }
}

function handleMove() {
  if (!props.lead) return;
  emit('move', { lead: props.lead });
}

watch(
  () => props.open,
  async open => {
    if (!open) return;
    measurePosition();
    await nextTick();
    firstItemRef.value?.focus();
  }
);

onMounted(() => {
  document.addEventListener('mousedown', handleDocumentClick, true);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('scroll', measurePosition, true);
  window.addEventListener('resize', measurePosition);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick, true);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('scroll', measurePosition, true);
  window.removeEventListener('resize', measurePosition);
});

const menuAriaLabel = computed(() =>
  props.lead
    ? t('ALGORYTHMO_CRM.LEAD_CARD.MENU_ARIA_LABEL', { name: props.lead.name })
    : ''
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && lead"
      ref="menuRef"
      role="menu"
      data-testid="lead-card-menu"
      :data-lead-id="lead.id"
      :aria-label="menuAriaLabel"
      class="alg-lead-card-menu"
      :style="{ top: `${position.top}px`, left: `${position.left}px` }"
    >
      <button
        ref="firstItemRef"
        type="button"
        role="menuitem"
        data-testid="lead-menu-move"
        class="alg-lead-card-menu__item"
        @click="handleMove"
      >
        {{ t('ALGORYTHMO_CRM.MENU.MOVE_TO') }}
      </button>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.alg-lead-card-menu {
  position: absolute;
  z-index: 1100;
  min-width: 11rem;
  padding: 0.25rem;
  border-radius: 0.5rem;
  background-color: var(--alg-modal-bg, #ffffff);
  color: var(--alg-modal-fg, #111827);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  transform: translateX(-100%);
}

.alg-lead-card-menu__item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: 0.375rem;
  background-color: transparent;
  color: inherit;
  font-size: 0.875rem;
  text-align: left;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    background-color: var(--alg-modal-row-hover, #f3f4f6);
    outline: none;
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--alg-focus-ring, #2563eb);
  }
}
</style>
