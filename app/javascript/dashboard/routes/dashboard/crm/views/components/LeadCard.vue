<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §3 (v1.2.0) — Lead card. Cinematic OS round-3 anatomy, ported
// 1:1 from the approved mockup docs/plans/cinematic-os/preview/02-crm-kanban.html.
//
// Layout (3 rows on a grid):
//   row 1: name (prominent, top-left)            | AlgAvatar (top-right)
//   row 2: channel PILL — real brand icon + label, tinted in the channel's
//          BRAND colour (whatsapp/instagram/tiktok/email). This is a deliberate,
//          founder-requested departure from the monochrome-chrome rule: colour
//          lives ONLY on the channel pill; everything else on the card stays
//          restrained so the surface never oversaturates.
//   row 3 (foot): LeadAgingChip · calendar date chip · clock time-in-stage chip
//          · amber due pill ("Hoje"/"Amanhã") when the lead has a due_label.
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
// Channel-icon: the card derives its own inline-SVG glyph from channel_origin
// (founder: no emoji in chrome) and maps the same origin to a translated label
// AND a brand colour.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LeadAgingChip from 'dashboard/components-next/algorythmo/LeadAgingChip.vue';
import AlgAvatar from 'dashboard/components-next/algorythmo/AlgAvatar.vue';

const props = defineProps({
  lead: {
    type: Object,
    required: true,
    // Expected shape (CONTRACT_M1B §3 v1.2.0):
    //   { id, name, stage_id, stage_name, channel_origin,
    //     time_human, time_aria_long, aging_state,
    //     date_label?, due_label?, due_tone?,
    //     owner: { id, name, thumbnail } | null }
  },
});

const emit = defineEmits(['open', 'menu']);

const { t } = useI18n();

const MENU_TRIGGER_GLYPH = '⋮'; // U+22EE vertical ellipsis

const CHANNEL_LABEL_KEYS = Object.freeze({
  whatsapp: 'WHATSAPP',
  email: 'EMAIL',
  instagram: 'INSTAGRAM',
  facebook: 'FACEBOOK',
  tiktok: 'TIKTOK',
  api: 'API',
  sms: 'SMS',
  webwidget: 'WIDGET',
  web_widget: 'WIDGET',
});

// Channel glyphs as inline Lucide-style SVG path data (founder: no emoji in
// chrome). Stroke 1.5, currentColor, no fill — paths copied verbatim from the
// approved mockup docs/plans/cinematic-os/preview/02-crm-kanban.html. Keyed by
// the normalized channel; an unknown channel falls back to a generic inbox.
const CHANNEL_ICON_PATHS = Object.freeze({
  whatsapp:
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  email:
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  instagram:
    '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
  // Generic inbox (fallback for facebook/api/sms/webwidget/unknown).
  generic:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
});

// Per-channel BRAND colour for the channel pill — the single sanctioned spot
// of saturated colour on an otherwise restrained card (founder-requested).
// WhatsApp/Instagram use their official brand hues; TikTok is monochrome white
// on the dark canvas; email is a neutral tone (no brand colour). The pill tints
// its border + icon + text in this colour at a controlled opacity (set in CSS),
// never a flat saturated fill.
const CHANNEL_BRAND_COLOR = Object.freeze({
  whatsapp: '#25D366',
  instagram: '#E1306C',
  tiktok: '#FFFFFF',
  // email + everything else: no brand colour → neutral monochrome pill.
});

function normalizeChannelKey(origin) {
  return String(origin ?? '')
    .toLowerCase()
    .replace(/^channel::/, '')
    .replace(/[-\s]/g, '');
}

const channelKey = computed(() =>
  normalizeChannelKey(props.lead.channel_origin)
);

const channelLabelKey = computed(
  () => CHANNEL_LABEL_KEYS[channelKey.value] ?? 'UNKNOWN'
);

// Inline SVG markup for the lead's channel. Derived from channel_origin here
// (not passed in) so card chrome owns its own iconography.
const channelIconSvg = computed(
  () => CHANNEL_ICON_PATHS[channelKey.value] ?? CHANNEL_ICON_PATHS.generic
);

const channelLabel = computed(() =>
  t(`ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.${channelLabelKey.value}`)
);

// Brand colour for the pill, or null → neutral monochrome pill. Exposed to CSS
// via a custom property so the border/icon/text read the same hue.
const channelBrandColor = computed(
  () => CHANNEL_BRAND_COLOR[channelKey.value] ?? null
);

const channelPillStyle = computed(() =>
  channelBrandColor.value
    ? { '--alg-channel-brand': channelBrandColor.value }
    : {}
);

// Foot-row chips ------------------------------------------------------------
// Calendar date chip ("27 de jan" / "amanhã"): purely informational, neutral.
const dateLabel = computed(() => props.lead.date_label ?? null);

// Amber due pill ("Hoje"/"Amanhã"): the only attention colour on the card.
const dueLabel = computed(() => props.lead.due_label ?? null);
// Tone: 'today' (amber, urgent) | 'soon' (soft) — defaults to 'soon'.
const dueTone = computed(() =>
  props.lead.due_tone === 'today' ? 'today' : 'soon'
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

const timeInStageAriaLabel = computed(() =>
  t('ALGORYTHMO_CRM.LEAD_CARD.TIME_IN_STAGE_ARIA', {
    time: props.lead.time_aria_long,
  })
);

const dueAriaLabel = computed(() =>
  dueLabel.value
    ? t('ALGORYTHMO_CRM.LEAD_CARD.DUE_ARIA', { due: dueLabel.value })
    : ''
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
    <div class="alg-lead-card__head">
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
    </div>

    <span
      class="alg-lead-card__channel"
      :class="{ 'alg-lead-card__channel--branded': channelBrandColor }"
      :style="channelPillStyle"
    >
      <!-- eslint-disable-next-line vue/no-v-html -->
      <svg
        class="alg-lead-card__channel-icon"
        data-testid="lead-card-channel-icon"
        aria-hidden="true"
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        v-html="channelIconSvg"
      />
      <span
        class="alg-lead-card__channel-label"
        data-testid="lead-card-channel-label"
      >
        {{ channelLabel }}
      </span>
    </span>

    <div class="alg-lead-card__foot">
      <LeadAgingChip
        :state="lead.aging_state"
        :time-human="lead.time_human"
        :aria-label="chipAriaLabel"
      />

      <span
        v-if="dateLabel"
        class="alg-lead-card__date-chip"
        data-testid="lead-card-date"
      >
        <svg
          class="alg-lead-card__chip-icon"
          aria-hidden="true"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {{ dateLabel }}
      </span>

      <span
        class="alg-lead-card__time-chip"
        data-testid="lead-card-time"
        :aria-label="timeInStageAriaLabel"
      >
        <svg
          class="alg-lead-card__chip-icon"
          aria-hidden="true"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        {{ lead.time_human }}
      </span>

      <span
        v-if="dueLabel"
        class="alg-lead-card__due"
        :class="`alg-lead-card__due--${dueTone}`"
        data-testid="lead-card-due"
        :aria-label="dueAriaLabel"
      >
        {{ dueLabel }}
      </span>
    </div>
  </article>
</template>

<style lang="scss" scoped>
// Glass lead card — bg-raised + hairline + elevation, lifts on hover with the
// cinematic curve (DESIGN.md §7.2). The aging chip reads its colours from
// --alg-chip-* vars; we map those to the real --alg-aging-* dark tokens here so
// the (read-only) LeadAgingChip renders on-brand without us editing it.
.alg-lead-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.6875rem;
  padding: 1rem;
  border-radius: var(--alg-radius-lg, 16px);
  background-color: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  color: var(--alg-fg-primary);
  box-shadow: var(--alg-elevation-1);
  cursor: grab;
  outline: none;
  transition:
    box-shadow var(--alg-duration-base, 240ms) var(--alg-ease-cinematic),
    border-color var(--alg-duration-base, 240ms) var(--alg-ease-cinematic),
    transform var(--alg-duration-base, 240ms) var(--alg-ease-cinematic);

  // LeadAgingChip token bridge → dark Cinematic aging palette.
  --alg-chip-neutral-bg: var(--alg-aging-neutral-bg);
  --alg-chip-neutral-fg: var(--alg-aging-neutral);
  --alg-chip-green-bg: var(--alg-aging-green-bg);
  --alg-chip-green-fg: var(--alg-aging-green);
  --alg-chip-yellow-bg: var(--alg-aging-yellow-bg);
  --alg-chip-yellow-fg: var(--alg-aging-yellow);
  --alg-chip-red-bg: var(--alg-aging-red-bg);
  --alg-chip-red-fg: var(--alg-aging-red);

  &:hover {
    box-shadow: var(--alg-elevation-2);
    border-color: var(--alg-border-hover);
    transform: scale(1.005) translateY(-1px);
  }

  &:active {
    cursor: grabbing;
  }

  &:focus-visible {
    box-shadow: var(--alg-ring-focus);
  }
}

// Honour the reduced-motion contract: keep the elevation/border feedback on
// hover but drop the scale/translate lift for users who opt out of motion.
@media (prefers-reduced-motion: reduce) {
  .alg-lead-card:hover {
    transform: none;
  }
}

// Row 1 — name + (menu, avatar) cluster pinned to the right.
.alg-lead-card__head {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.alg-lead-card__name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--alg-text-sm, 0.875rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: var(--alg-tracking-snug, -0.012em);
  line-height: 1.3;
  color: var(--alg-fg-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-top: 0.0625rem;
}

.alg-lead-card__menu-trigger {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--alg-radius-sm, 8px);
  background-color: transparent;
  color: var(--alg-fg-tertiary);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition:
    background-color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic),
    color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic),
    opacity var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic);

  &:hover {
    background-color: var(--alg-bg-tint-high);
    color: var(--alg-fg-primary);
  }

  &:focus-visible {
    outline: none;
    opacity: 1;
    box-shadow: var(--alg-ring-focus);
  }
}

// Reveal the menu trigger on card hover/focus-within; always visible on touch
// (no hover) is not handled here — the trigger keeps its slot, just at opacity.
.alg-lead-card:hover .alg-lead-card__menu-trigger,
.alg-lead-card:focus-within .alg-lead-card__menu-trigger {
  opacity: 1;
}

@media (hover: none) {
  .alg-lead-card__menu-trigger {
    opacity: 1;
  }
}

.alg-lead-card__owner {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  border-radius: var(--alg-radius-pill, 9999px);
  cursor: default;
}

.alg-lead-card__owner--unassigned {
  background-color: var(--alg-bg-tint-low);
  border: 1px dashed var(--alg-border-strong);
  color: var(--alg-fg-tertiary);
}

.alg-lead-card__owner-glyph {
  width: 0.75rem;
  height: 0.75rem;
  display: inline-block;
}

// Row 2 — channel pill. Neutral by default; branded variant tints the border,
// icon and text in the channel's --alg-channel-brand hue at a controlled
// intensity (border ~36%, surface ~8%) so the colour is a signal, not a slab.
.alg-lead-card__channel {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  max-width: 100%;
  padding: 0.1875rem 0.5rem 0.1875rem 0.4375rem;
  border-radius: var(--alg-radius-pill, 9999px);
  background-color: var(--alg-bg-tint-med);
  border: 1px solid var(--alg-border);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  letter-spacing: 0.03em;
  color: var(--alg-fg-secondary);
}

.alg-lead-card__channel--branded {
  // color-mix keeps the brand hue but tames it against the dark canvas — never
  // the raw saturated swatch (premium checklist §3: contained saturation).
  background-color: color-mix(
    in srgb,
    var(--alg-channel-brand) 9%,
    transparent
  );
  border-color: color-mix(in srgb, var(--alg-channel-brand) 34%, transparent);
  color: color-mix(in srgb, var(--alg-channel-brand) 80%, white 20%);
}

.alg-lead-card__channel-icon {
  flex-shrink: 0;
  width: 0.6875rem;
  height: 0.6875rem;
  color: var(--alg-fg-secondary);
}

.alg-lead-card__channel--branded .alg-lead-card__channel-icon {
  color: var(--alg-channel-brand);
}

.alg-lead-card__channel-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// Row 3 — foot. Aging chip + neutral date/time chips + amber due pill.
.alg-lead-card__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}

.alg-lead-card__date-chip,
.alg-lead-card__time-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  color: var(--alg-fg-tertiary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.alg-lead-card__chip-icon {
  flex-shrink: 0;
  width: 0.6875rem;
  height: 0.6875rem;
  color: var(--alg-fg-quaternary);
}

// Amber "due" pill — the single attention accent on the card. Reads from the
// warning token family (contained, not a flat fill).
.alg-lead-card__due {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  padding: 0.125rem 0.5rem;
  border-radius: var(--alg-radius-pill, 9999px);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.alg-lead-card__due--today {
  color: var(--alg-color-warning);
  background-color: var(--alg-color-warning-subtle);
}

.alg-lead-card__due--soon {
  color: var(--alg-fg-secondary);
  background-color: var(--alg-bg-tint-high);
}
</style>
