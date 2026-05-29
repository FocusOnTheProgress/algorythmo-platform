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
import { ref, computed, onBeforeUnmount, watch, nextTick } from 'vue';
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

const VIEWPORT_PADDING = 8;

function measurePosition() {
  if (!props.anchor) return;
  const rect = props.anchor.getBoundingClientRect();
  // Initial placement: right-aligned to the trigger, just below it. The CSS
  // `transform: translateX(-100%)` pulls the menu's left edge to match this
  // anchor x — so we must clamp against viewport width *after* the menu has
  // rendered (see clampPosition below).
  position.value = {
    top: rect.bottom + window.scrollY + 4,
    left: rect.right + window.scrollX,
  };
}

function clampPosition() {
  const menu = menuRef.value;
  if (!menu) return;
  const menuRect = menu.getBoundingClientRect();
  const viewportLeft = window.scrollX + VIEWPORT_PADDING;
  const viewportRight =
    window.scrollX + document.documentElement.clientWidth - VIEWPORT_PADDING;

  // Menu's effective on-screen left edge after the -100% transform.
  const onscreenLeft = menuRect.left + window.scrollX;
  const onscreenRight = menuRect.right + window.scrollX;
  let nextLeft = position.value.left;

  if (onscreenLeft < viewportLeft) {
    // Trigger sits near the viewport's left edge — shift the anchor so the
    // menu's left edge sits at viewportLeft (cancels the negative transform).
    nextLeft += viewportLeft - onscreenLeft;
  } else if (onscreenRight > viewportRight) {
    nextLeft -= onscreenRight - viewportRight;
  }

  if (nextLeft !== position.value.left) {
    position.value = { ...position.value, left: nextLeft };
  }
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
    // Cache the anchor *before* emit('close'): the parent reacts to close by
    // clearing menuAnchor to null, so reading props.anchor after the emit
    // gives null and the trigger never regains focus. WCAG 2.4.3 requires
    // focus to return to the invoking element on dialog/menu dismiss.
    const anchorEl = props.anchor instanceof HTMLElement ? props.anchor : null;
    emit('close');
    if (anchorEl && anchorEl.isConnected) anchorEl.focus();
  }
}

function handleMove() {
  if (!props.lead) return;
  emit('move', { lead: props.lead });
}

// Re-measure + re-clamp together: a viewport resize can both shift the
// anchor (so the menu's top/left need updating) AND change which side of
// the viewport the menu collides with. Measuring without clamping would
// leave the menu off-screen on narrow windows.
async function reflow() {
  measurePosition();
  await nextTick();
  clampPosition();
}

function attachListeners() {
  document.addEventListener('mousedown', handleDocumentClick, true);
  document.addEventListener('keydown', handleKeydown);
  window.addEventListener('scroll', reflow, true);
  window.addEventListener('resize', reflow);
}

function detachListeners() {
  document.removeEventListener('mousedown', handleDocumentClick, true);
  document.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('scroll', reflow, true);
  window.removeEventListener('resize', reflow);
}

// Watch the (open, anchor, leadId) tuple — not just `open` — because Vue
// coalesces sequential changes via Object.is. When the user clicks card
// A's ⋮ then card B's ⋮ without closing in between, `open` stays true
// (true→true is a no-op) and a single-source watcher would not fire, so
// the menu would render B's items at A's coordinates. Including anchor
// and leadId in the tuple forces a re-measure on every transition.
let listenersAttached = false;
watch(
  () => [props.open, props.anchor, props.lead?.id],
  async ([open]) => {
    if (!open) {
      if (listenersAttached) {
        detachListeners();
        listenersAttached = false;
      }
      return;
    }
    measurePosition();
    if (!listenersAttached) {
      attachListeners();
      listenersAttached = true;
    }
    await nextTick();
    clampPosition();
    firstItemRef.value?.focus();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  detachListeners();
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
// Glass-soft dropdown (DESIGN.md §5.7) — backdrop blur + hairline + grain +
// elevation. Falls back to solid bg-raised where backdrop-filter is missing.
.alg-lead-card-menu {
  position: absolute;
  z-index: var(--alg-z-toast, 1100);
  min-width: 11rem;
  padding: 0.25rem;
  border-radius: var(--alg-radius-md, 12px);
  background-color: var(--alg-glass-soft-bg, var(--alg-bg-raised));
  backdrop-filter: var(--alg-glass-soft-filter);
  -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  border: 1px solid var(--alg-glass-border);
  color: var(--alg-fg-primary);
  box-shadow: var(--alg-elevation-3);
  transform: translateX(-100%);
}

.alg-lead-card-menu__item {
  display: block;
  width: 100%;
  padding: 0.5rem 0.625rem;
  border: none;
  border-radius: var(--alg-radius-sm, 8px);
  background-color: transparent;
  color: inherit;
  font-size: var(--alg-text-sm, 0.875rem);
  text-align: left;
  cursor: pointer;
  transition: background-color var(--alg-duration-fast, 180ms)
    var(--alg-ease-cinematic);

  &:hover,
  &:focus-visible {
    background-color: var(--alg-bg-tint-high);
    outline: none;
  }

  &:focus-visible {
    box-shadow: var(--alg-ring-focus);
  }
}
</style>
