<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §3 — Lead card. The card is a pure presenter: stage transitions,
// aging math, channel-icon resolution, and i18n live in the Kanban parent.
//
// Why role="button" on an <article> instead of a <button>:
//   The card has a nested button (menu trigger). Nesting interactive controls
//   inside a <button> is invalid HTML and breaks keyboard semantics. The
//   <article role="button" tabindex="0"> + manual Enter/Space handling pattern
//   is what Trello, Linear and Notion use for kanban cards.
//
// Channel-icon: parent passes an already-resolved icon string (e.g. 'fluent-call'
// or an emoji); the card doesn't know about channel→icon mapping.
import { computed } from 'vue';
import LeadAgingChip from 'dashboard/components-next/algorythmo/LeadAgingChip.vue';

const props = defineProps({
  lead: {
    type: Object,
    required: true,
    // Expected shape (CONTRACT_M1B §3 + helper/algorythmo/timeFormat):
    //   { id, name, stage_id, stage_name, channel_origin, channel_icon,
    //     time_human, time_aria_long, aging_state }
  },
});

const emit = defineEmits(['open', 'menu']);

// Vertical-ellipsis (U+22EE) is the standard kanban menu trigger glyph
// (Trello/Linear/Notion). Bound as a constant so the bare-string-in-template
// rule doesn't catch it — the icon is decorative, not user-facing copy.
const MENU_TRIGGER_GLYPH = '\u22EE';

const ariaLabel = computed(
  () =>
    `Lead ${props.lead.name}, etapa ${props.lead.stage_name}, ${props.lead.time_aria_long} nesta etapa, canal ${props.lead.channel_origin}`
);

const menuAriaLabel = computed(() => `Ações para lead ${props.lead.name}`);

const chipAriaLabel = computed(
  () => `${props.lead.time_aria_long} nesta etapa`
);

function handleActivate() {
  emit('open', props.lead);
}

function handleKeydown(event) {
  // Only activate when the article itself is the focused target. Without this
  // guard, pressing Enter / Space on the nested menu trigger button would
  // bubble a keydown to the article and double-fire (drawer + menu). The
  // mouse path is handled separately via `event.stopPropagation` in
  // `handleMenuClick`; keyboard bubbling can't be stopped from the button
  // because the browser still fires its own click for Enter/Space.
  if (event.target !== event.currentTarget) return;
  // Enter and Space are the standard activation keys for role="button" per
  // WAI-ARIA Authoring Practices. preventDefault on Space stops page scroll.
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    handleActivate();
  }
}

function handleMenuClick(event) {
  // Stop propagation so the mouse click doesn't ALSO open the drawer behind
  // the menu. Keyboard activation on this button is isolated by the
  // `event.target !== event.currentTarget` guard in `handleKeydown`.
  event.stopPropagation();
  emit('menu', { lead: props.lead, anchor: event.currentTarget });
}
</script>

<template>
  <article
    class="alg-lead-card"
    data-testid="lead-card"
    :data-lead-id="lead.id"
    :data-stage-id="lead.stage_id"
    :data-channel="lead.channel_origin"
    role="button"
    tabindex="0"
    :aria-label="ariaLabel"
    @click="handleActivate"
    @keydown="handleKeydown"
  >
    <span
      class="alg-lead-card__channel-icon"
      data-testid="lead-card-channel-icon"
      aria-hidden="true"
    >
      {{ lead.channel_icon }}
    </span>

    <span class="alg-lead-card__name" data-testid="lead-card-name">
      {{ lead.name }}
    </span>

    <span class="alg-lead-card__time" data-testid="lead-card-time">
      {{ lead.time_human }}
    </span>

    <LeadAgingChip
      :state="lead.aging_state"
      :time-human="lead.time_human"
      :aria-label="chipAriaLabel"
    />

    <button
      type="button"
      class="alg-lead-card__menu-trigger"
      data-testid="lead-card-menu-trigger"
      :aria-label="menuAriaLabel"
      aria-haspopup="menu"
      @click="handleMenuClick"
    >
      {{ MENU_TRIGGER_GLYPH }}
    </button>
  </article>
</template>

<style lang="scss" scoped>
.alg-lead-card {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  background-color: var(--alg-card-bg, #ffffff);
  color: var(--alg-card-fg, #111827);
  box-shadow: var(--alg-card-shadow, 0 1px 2px rgba(0, 0, 0, 0.06));
  cursor: pointer;
  outline: none;
  transition:
    box-shadow 0.15s ease,
    transform 0.15s ease;

  &:hover {
    box-shadow: var(--alg-card-shadow-hover, 0 4px 12px rgba(0, 0, 0, 0.08));
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px var(--alg-focus-ring, #2563eb);
  }
}

.alg-lead-card__channel-icon {
  font-size: 1rem;
  line-height: 1;
}

.alg-lead-card__name {
  font-size: 0.875rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alg-lead-card__time {
  font-size: 0.75rem;
  color: var(--alg-card-muted-fg, #6b7280);
}

.alg-lead-card__menu-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background-color: transparent;
  color: var(--alg-card-muted-fg, #6b7280);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: var(--alg-card-menu-hover-bg, #f3f4f6);
    color: var(--alg-card-fg, #111827);
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 1px;
  }
}
</style>
