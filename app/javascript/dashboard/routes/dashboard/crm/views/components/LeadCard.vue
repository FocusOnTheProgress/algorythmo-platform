<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §3 (v1.1.0) — Lead card.
//
// Layout: 2-row grid (visual-spec 0003 §1.4 — Opção A).
//   line 1: name | menu
//   line 2: channel icon · channel label · time + aging chip | owner avatar
//
// Owner slot (v1.1.0): always present. Real avatar when `lead.owner` is set,
// dashed-border placeholder ("available — first to reply becomes owner") when
// `lead.owner == null`. The placeholder uses an `aria-disabled` div, not a
// button — manual reassign ships in M2; the click target is reserved here
// only as a visual affordance.
//
// Why role="button" on an <article> instead of a <button>:
//   The card has nested interactive children (menu trigger, owner avatar).
//   Nesting interactive controls inside a <button> is invalid HTML and breaks
//   keyboard semantics. The <article role="button" tabindex="0"> + manual
//   Enter/Space handling pattern is what Trello, Linear and Notion use.
//
// Channel-icon: parent passes an already-resolved glyph; the card maps the
// channel_origin to a translated label via i18n.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LeadAgingChip from 'dashboard/components-next/algorythmo/LeadAgingChip.vue';
import AlgAvatar from 'dashboard/components-next/algorythmo/AlgAvatar.vue';

const props = defineProps({
  lead: {
    type: Object,
    required: true,
    // Expected shape (CONTRACT_M1B §3 v1.1.0):
    //   { id, name, stage_id, stage_name, channel_origin, channel_icon,
    //     time_human, time_aria_long, aging_state,
    //     owner: { id, name, thumbnail } | null }
  },
});

const emit = defineEmits(['open', 'menu']);

const { t } = useI18n();

const MENU_TRIGGER_GLYPH = '\u22EE'; // U+22EE vertical ellipsis
const META_SEPARATOR = '\u00B7'; // middle dot

const CHANNEL_LABEL_KEYS = Object.freeze({
  whatsapp: 'WHATSAPP',
  email: 'EMAIL',
  instagram: 'INSTAGRAM',
  facebook: 'FACEBOOK',
  api: 'API',
  sms: 'SMS',
  webwidget: 'WIDGET',
  web_widget: 'WIDGET',
});

function normalizeChannelKey(origin) {
  return String(origin ?? '')
    .toLowerCase()
    .replace(/^channel::/, '')
    .replace(/[-\s]/g, '');
}

const channelLabelKey = computed(() => {
  const key = normalizeChannelKey(props.lead.channel_origin);
  return CHANNEL_LABEL_KEYS[key] ?? 'UNKNOWN';
});

const channelLabel = computed(() =>
  t(`ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.${channelLabelKey.value}`)
);

const owner = computed(() => props.lead.owner ?? null);
const hasOwner = computed(() => owner.value !== null);

const ownerAriaLabel = computed(() =>
  hasOwner.value
    ? t('ALGORYTHMO_CRM.LEAD_CARD.OWNER_ASSIGNED_ARIA', {
        name: owner.value.name,
      })
    : t('ALGORYTHMO_CRM.LEAD_CARD.OWNER_UNASSIGNED_ARIA')
);

const ownerTooltip = computed(() =>
  hasOwner.value
    ? t('ALGORYTHMO_CRM.LEAD_CARD.OWNER_ASSIGNED_TOOLTIP', {
        name: owner.value.name,
      })
    : t('ALGORYTHMO_CRM.LEAD_CARD.OWNER_UNASSIGNED_TOOLTIP')
);

const ariaLabel = computed(() =>
  t('ALGORYTHMO_CRM.LEAD_CARD.ARIA_LABEL', {
    name: props.lead.name,
    stage: props.lead.stage_name,
    time: props.lead.time_aria_long,
    channel: channelLabel.value,
  })
);

const menuAriaLabel = computed(() =>
  t('ALGORYTHMO_CRM.LEAD_CARD.MENU_BUTTON_LABEL', { name: props.lead.name })
);

const chipAriaLabel = computed(() =>
  t('ALGORYTHMO_CRM.LEAD_CARD.AGING_CHIP_ARIA_LABEL', {
    time: props.lead.time_aria_long,
  })
);

function handleActivate() {
  emit('open', props.lead);
}

function handleKeydown(event) {
  // Only activate when the article itself is the focused target. Without this
  // guard, pressing Enter / Space on a nested control would bubble a keydown
  // to the article and double-fire (drawer + menu).
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault();
    handleActivate();
  }
}

function handleMenuClick(event) {
  event.stopPropagation();
  emit('menu', { lead: props.lead, anchor: event.currentTarget });
}

function handleOwnerClick(event) {
  // Avatar is a visual affordance only in M1-C. Click is swallowed so it
  // never opens the drawer twice; reassign UX ships in M2.
  event.stopPropagation();
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
    <span class="alg-lead-card__name" data-testid="lead-card-name">
      {{ lead.name }}
    </span>

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

    <div class="alg-lead-card__meta">
      <span
        class="alg-lead-card__channel-icon"
        data-testid="lead-card-channel-icon"
        aria-hidden="true"
      >
        {{ lead.channel_icon }}
      </span>
      <span
        class="alg-lead-card__channel-label"
        data-testid="lead-card-channel-label"
      >
        {{ channelLabel }}
      </span>
      <span class="alg-lead-card__sep" aria-hidden="true">
        {{ META_SEPARATOR }}
      </span>
      <span class="alg-lead-card__time" data-testid="lead-card-time">
        {{ lead.time_human }}
      </span>
      <LeadAgingChip
        :state="lead.aging_state"
        :time-human="lead.time_human"
        :aria-label="chipAriaLabel"
      />
    </div>

    <div
      v-if="hasOwner"
      class="alg-lead-card__owner alg-lead-card__owner--assigned"
      data-testid="lead-card-owner-avatar"
      data-owner-state="assigned"
      :data-owner-id="owner.id"
      :title="ownerTooltip"
      @click="handleOwnerClick"
    >
      <AlgAvatar
        :src="owner.thumbnail || ''"
        :name="owner.name"
        size="sm"
        :aria-label="ownerAriaLabel"
      />
    </div>
    <div
      v-else
      class="alg-lead-card__owner alg-lead-card__owner--unassigned"
      data-testid="lead-card-owner-avatar"
      data-owner-state="unassigned"
      role="img"
      :aria-label="ownerAriaLabel"
      :title="ownerTooltip"
      aria-disabled="true"
      @click="handleOwnerClick"
    >
      <span
        class="alg-lead-card__owner-glyph i-lucide-hand"
        aria-hidden="true"
      />
    </div>
  </article>
</template>

<style lang="scss" scoped>
.alg-lead-card {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    'name menu'
    'meta owner';
  column-gap: 0.5rem;
  row-gap: 0.375rem;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: var(--alg-bg-raised, #ffffff);
  color: var(--alg-text-primary, #111827);
  box-shadow: var(--alg-card-shadow, 0 1px 2px rgba(0, 0, 0, 0.06));
  cursor: pointer;
  outline: none;
  min-height: 64px;
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

.alg-lead-card__name {
  grid-area: name;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.alg-lead-card__menu-trigger {
  grid-area: menu;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: 0.25rem;
  background-color: transparent;
  color: var(--alg-text-tertiary, #6b7280);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    background-color: var(--alg-bg-raised-hover, #f3f4f6);
    color: var(--alg-text-primary, #111827);
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 1px;
  }
}

.alg-lead-card__meta {
  grid-area: meta;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
  font-size: 0.75rem;
  color: var(--alg-text-tertiary, #6b7280);
  font-weight: 500;
}

.alg-lead-card__channel-icon {
  font-size: 0.875rem;
  line-height: 1;
}

.alg-lead-card__channel-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alg-lead-card__sep {
  color: var(--alg-text-muted, #9ca3af);
}

.alg-lead-card__time {
  color: var(--alg-text-tertiary, #6b7280);
}

.alg-lead-card__owner {
  grid-area: owner;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  cursor: default;
}

.alg-lead-card__owner--unassigned {
  background-color: var(--alg-bg-raised-hover, #f3f4f6);
  border: 1px dashed var(--alg-border-strong, #9ca3af);
  color: var(--alg-text-tertiary, #6b7280);
}

.alg-lead-card__owner-glyph {
  width: 0.75rem;
  height: 0.75rem;
  display: inline-block;
}
</style>
