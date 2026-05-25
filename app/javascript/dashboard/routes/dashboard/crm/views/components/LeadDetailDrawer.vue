<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §7 (v1.1.0) — LeadDetailDrawer.
//
// Wraps AlgDrawer with the lead-specific anatomy:
//   header (sticky)  — title (lead name) + close
//   CONTATO          — email, phone
//   CANAL            — channel origin (translated label)
//   DONO             — owner avatar + name OR available placeholder
//   ATIVIDADE        — stage_history timeline (lazy-fetched, 5 states)
//
// Why lazy fetch instead of preloading: the timeline is the only block that
// requires a network roundtrip; everything else is already in `lead`. Fetching
// on drawer open means the kanban list page stays cheap (N leads × no
// extra requests) and the drawer cost is paid on intent, not on render.
//
// Truncated branch: when the backend caps at 100 entries (visual-spec §4.8)
// the footer hints that older history exists past the window. No pagination
// in M1-C; deeper history lives in M3 analytics.
import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import AlgDrawer from 'dashboard/components-next/algorythmo/AlgDrawer.vue';
import AlgAvatar from 'dashboard/components-next/algorythmo/AlgAvatar.vue';
import { useStageHistory } from 'dashboard/composables/algorythmo/useStageHistory.js';
import {
  elapsedSince,
  humanizeDurationLongPtBr,
} from 'dashboard/helper/algorythmo/timeFormat.js';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  lead: {
    type: Object,
    default: null,
  },
  accountId: {
    type: [String, Number],
    required: true,
  },
  now: {
    type: Number,
    default: () => Date.now(),
  },
});

const emit = defineEmits(['update:open', 'close']);

const { t } = useI18n();

const stageHistory = useStageHistory(props.accountId);

const SYSTEM_MONOGRAM = 'A'; // Algorythmo brand mark — visual, not copy.
const META_SEPARATOR = '\u00B7';

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

const channelLabel = computed(() => {
  if (!props.lead?.channel_origin) return '';
  const key = normalizeChannelKey(props.lead.channel_origin);
  const labelKey = CHANNEL_LABEL_KEYS[key] ?? 'UNKNOWN';
  return t(`ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.${labelKey}`);
});

const drawerTitle = computed(
  () => props.lead?.name || t('ALGORYTHMO_CRM.DRAWER.TITLE_FALLBACK')
);

const contact = computed(() => props.lead?.contact ?? null);

const contactEmail = computed(() => contact.value?.email ?? null);
const contactPhone = computed(
  () => contact.value?.phone_number ?? contact.value?.phone ?? null
);

const owner = computed(() => props.lead?.owner ?? null);
const hasOwner = computed(() => owner.value !== null);

const ownerNameOrPlaceholder = computed(() =>
  hasOwner.value
    ? owner.value.name
    : t('ALGORYTHMO_CRM.DRAWER.OWNER.PLACEHOLDER_NO_OWNER')
);

const ownerAriaLabel = computed(() =>
  hasOwner.value
    ? t('ALGORYTHMO_CRM.DRAWER.OWNER.ASSIGNED_NAME_ARIA', {
        name: owner.value.name,
      })
    : t('ALGORYTHMO_CRM.LEAD_CARD.OWNER_UNASSIGNED_ARIA')
);

// -----------------------------------------------------------------------
// Stage history derived state
// -----------------------------------------------------------------------

const isLoading = computed(() => stageHistory.loading.value);
const fetchError = computed(() => stageHistory.error.value);
const entries = computed(() => stageHistory.entries.value);
const truncated = computed(() => stageHistory.truncated.value);
const isEmpty = computed(
  () => !isLoading.value && !fetchError.value && entries.value.length === 0
);
const hasEntries = computed(
  () => !isLoading.value && !fetchError.value && entries.value.length > 0
);

// -----------------------------------------------------------------------
// Lifecycle — load when drawer opens with a lead, reset when closed.
// -----------------------------------------------------------------------

watch(
  [() => props.open, () => props.lead?.id],
  ([open, leadId], [prevOpen]) => {
    if (open && leadId) {
      stageHistory.load(leadId);
    } else if (prevOpen && !open) {
      stageHistory.reset();
    }
  },
  { immediate: true }
);

// -----------------------------------------------------------------------
// Entry rendering helpers
// -----------------------------------------------------------------------

function actorNameFor(entry) {
  return (
    entry.actor_summary?.name ?? t('ALGORYTHMO_CRM.DRAWER.HISTORY.SYSTEM_ACTOR')
  );
}

function isSystemActor(entry) {
  return entry.actor_summary == null;
}

function actorAriaLabel(entry) {
  if (isSystemActor(entry)) {
    return t('ALGORYTHMO_CRM.DRAWER.HISTORY.SYSTEM_ACTOR_ARIA');
  }
  return entry.actor_summary.name;
}

function entryPrimaryLine(entry) {
  const actor = actorNameFor(entry);
  const stage = entry.to_stage_name ?? '';
  if (entry.from_stage_id == null) {
    return t('ALGORYTHMO_CRM.DRAWER.HISTORY.CREATED_IN', { actor, stage });
  }
  return t('ALGORYTHMO_CRM.DRAWER.HISTORY.MOVED_TO', { actor, stage });
}

function entryRelativeTime(entry) {
  return humanizeDurationLongPtBr(elapsedSince(entry.changed_at, props.now));
}

function entryFromTo(entry) {
  if (entry.from_stage_id == null) return '';
  return t('ALGORYTHMO_CRM.DRAWER.HISTORY.FROM_TO', {
    from: entry.from_stage_name ?? '',
    to: entry.to_stage_name ?? '',
  });
}

function entryTooltip(entry) {
  const iso = entry.changed_at ?? '';
  const fromTo = entryFromTo(entry);
  return fromTo ? `${iso} · ${fromTo}` : iso;
}

function nodeColorClass(entry) {
  if (entry.from_stage_id == null) return 'is-node-success';
  if (entry.to_stage_kind === 'won') return 'is-node-success';
  if (entry.to_stage_kind === 'lost') return 'is-node-danger';
  if (
    (entry.from_stage_kind === 'won' || entry.from_stage_kind === 'lost') &&
    entry.to_stage_kind === 'open'
  ) {
    return 'is-node-info';
  }
  return 'is-node-neutral';
}

// -----------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------

function handleUpdateOpen(value) {
  emit('update:open', value);
}

function handleClose() {
  emit('close');
}

function handleRetry() {
  if (props.lead?.id) stageHistory.load(props.lead.id);
}
</script>

<template>
  <AlgDrawer
    :open="open"
    :title="drawerTitle"
    :close-label="t('ALGORYTHMO_CRM.DRAWER.CLOSE')"
    data-testid-root="lead-detail-drawer"
    @update:open="handleUpdateOpen"
    @close="handleClose"
  >
    <div
      v-if="lead"
      class="alg-lead-drawer"
      data-testid="lead-detail-drawer-body"
      :data-lead-id="lead.id"
    >
      <section
        class="alg-lead-drawer__block"
        data-testid="drawer-contact-block"
      >
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CONTACT') }}
        </h3>
        <dl class="alg-lead-drawer__pairs">
          <dt class="alg-lead-drawer__pair-label">
            {{ t('ALGORYTHMO_CRM.DRAWER.CONTACT.EMAIL_LABEL') }}
          </dt>
          <dd
            class="alg-lead-drawer__pair-value"
            data-testid="drawer-contact-email"
            :class="{ 'is-missing': !contactEmail }"
          >
            <template v-if="contactEmail">{{ contactEmail }}</template>
            <em v-else>{{
              t('ALGORYTHMO_CRM.DRAWER.CONTACT.NOT_PROVIDED')
            }}</em>
          </dd>

          <dt class="alg-lead-drawer__pair-label">
            {{ t('ALGORYTHMO_CRM.DRAWER.CONTACT.PHONE_LABEL') }}
          </dt>
          <dd
            class="alg-lead-drawer__pair-value"
            data-testid="drawer-contact-phone"
            :class="{ 'is-missing': !contactPhone }"
          >
            <template v-if="contactPhone">{{ contactPhone }}</template>
            <em v-else>{{
              t('ALGORYTHMO_CRM.DRAWER.CONTACT.NOT_PROVIDED')
            }}</em>
          </dd>
        </dl>
      </section>

      <section class="alg-lead-drawer__block">
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CHANNEL') }}
        </h3>
        <p
          class="alg-lead-drawer__channel"
          data-testid="drawer-channel-origin"
          :data-channel="lead.channel_origin"
        >
          {{ channelLabel }}
        </p>
      </section>

      <section class="alg-lead-drawer__block" data-testid="drawer-owner-block">
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.OWNER') }}
        </h3>
        <div
          class="alg-lead-drawer__owner"
          :data-owner-state="hasOwner ? 'assigned' : 'unassigned'"
        >
          <div
            v-if="hasOwner"
            class="alg-lead-drawer__owner-avatar"
            data-testid="drawer-owner-avatar"
            data-owner-state="assigned"
            :data-owner-id="owner.id"
          >
            <AlgAvatar
              :src="owner.thumbnail || ''"
              :name="owner.name"
              size="md"
              :aria-label="ownerAriaLabel"
            />
          </div>
          <div
            v-else
            class="alg-lead-drawer__owner-avatar alg-lead-drawer__owner-avatar--unassigned"
            data-testid="drawer-owner-avatar"
            data-owner-state="unassigned"
            role="img"
            :aria-label="ownerAriaLabel"
          >
            <span class="i-lucide-hand" aria-hidden="true" />
          </div>
          <div class="alg-lead-drawer__owner-text">
            <span
              class="alg-lead-drawer__owner-name"
              data-testid="drawer-owner-name"
              :data-owner-state="hasOwner ? 'assigned' : 'unassigned'"
            >
              {{ ownerNameOrPlaceholder }}
            </span>
            <span
              v-if="!hasOwner"
              class="alg-lead-drawer__owner-hint"
              data-testid="drawer-owner-unassigned-placeholder"
            >
              {{ t('ALGORYTHMO_CRM.DRAWER.OWNER.UNASSIGNED_LABEL') }}
            </span>
          </div>
        </div>
      </section>

      <section
        class="alg-lead-drawer__block"
        data-testid="drawer-stage-history-block"
      >
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.ACTIVITY') }}
        </h3>

        <div
          v-if="isLoading"
          class="alg-lead-drawer__history-loading"
          data-testid="drawer-stage-history-loading"
          role="status"
          :aria-label="t('ALGORYTHMO_CRM.DRAWER.HISTORY.LOADING_ARIA')"
        >
          <div
            v-for="i in 3"
            :key="i"
            class="alg-lead-drawer__skeleton-row"
            aria-hidden="true"
          >
            <span class="alg-lead-drawer__skeleton-node" />
            <span class="alg-lead-drawer__skeleton-line" />
          </div>
        </div>

        <div
          v-else-if="fetchError"
          class="alg-lead-drawer__history-error"
          data-testid="drawer-stage-history-error"
          role="alert"
        >
          <p class="alg-lead-drawer__error-text">
            {{ t('ALGORYTHMO_CRM.DRAWER.HISTORY.ERROR_TITLE') }}
          </p>
          <button
            type="button"
            class="alg-lead-drawer__retry"
            data-testid="drawer-stage-history-retry"
            @click="handleRetry"
          >
            {{ t('ALGORYTHMO_CRM.DRAWER.HISTORY.RETRY') }}
          </button>
        </div>

        <p
          v-else-if="isEmpty"
          class="alg-lead-drawer__history-empty"
          data-testid="drawer-stage-history-empty"
        >
          {{ t('ALGORYTHMO_CRM.DRAWER.HISTORY.EMPTY') }}
        </p>

        <ol
          v-if="hasEntries"
          class="alg-lead-drawer__history-list"
          data-testid="drawer-stage-history-list"
        >
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="alg-lead-drawer__history-item"
            data-testid="drawer-stage-history-item"
            :data-stage-history-id="entry.id"
            :data-actor-type="entry.actor_type"
          >
            <span
              class="alg-lead-drawer__history-node"
              :class="nodeColorClass(entry)"
              aria-hidden="true"
            />
            <div class="alg-lead-drawer__history-avatar">
              <div
                v-if="isSystemActor(entry)"
                class="alg-lead-drawer__system-avatar"
                role="img"
                :aria-label="actorAriaLabel(entry)"
              >
                <span aria-hidden="true">{{ SYSTEM_MONOGRAM }}</span>
              </div>
              <AlgAvatar
                v-else
                :src="entry.actor_summary.thumbnail || ''"
                :name="entry.actor_summary.name"
                size="sm"
                :aria-label="actorAriaLabel(entry)"
              />
            </div>
            <div class="alg-lead-drawer__history-body">
              <p class="alg-lead-drawer__history-primary">
                {{ entryPrimaryLine(entry) }}
              </p>
              <p class="alg-lead-drawer__history-secondary">
                <time :datetime="entry.changed_at" :title="entryTooltip(entry)">
                  {{ entryRelativeTime(entry) }}
                </time>
                <template v-if="entryFromTo(entry)">
                  <span class="alg-lead-drawer__history-sep" aria-hidden="true">
                    {{ META_SEPARATOR }}
                  </span>
                  <span>{{ entryFromTo(entry) }}</span>
                </template>
              </p>
            </div>
          </li>
        </ol>

        <p
          v-if="truncated && hasEntries"
          class="alg-lead-drawer__history-truncated"
          data-testid="drawer-stage-history-truncated"
        >
          {{ t('ALGORYTHMO_CRM.DRAWER.HISTORY.TRUNCATED_FOOTER') }}
        </p>
      </section>
    </div>
  </AlgDrawer>
</template>

<style lang="scss" scoped>
.alg-lead-drawer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
}

.alg-lead-drawer__block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-lead-drawer__block-label {
  margin: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--alg-text-tertiary, #6b7280);
}

.alg-lead-drawer__pairs {
  display: grid;
  grid-template-columns: 5rem 1fr;
  gap: 0.5rem 0.75rem;
  margin: 0;
}

.alg-lead-drawer__pair-label {
  font-size: 0.75rem;
  color: var(--alg-text-tertiary, #6b7280);
  margin: 0;
}

.alg-lead-drawer__pair-value {
  margin: 0;
  font-size: 0.875rem;
  color: var(--alg-text-primary, #111827);
  word-break: break-all;

  &.is-missing em {
    color: var(--alg-text-muted, #9ca3af);
    font-style: italic;
  }
}

.alg-lead-drawer__channel {
  margin: 0;
  font-size: 0.875rem;
  color: var(--alg-text-primary, #111827);
}

.alg-lead-drawer__owner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.alg-lead-drawer__owner-avatar {
  flex: 0 0 auto;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  overflow: hidden;

  &--unassigned {
    background-color: var(--alg-bg-raised-hover, #f3f4f6);
    border: 1px dashed var(--alg-border-strong, #9ca3af);
    color: var(--alg-text-tertiary, #6b7280);
  }
}

.alg-lead-drawer__owner-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.alg-lead-drawer__owner-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--alg-text-primary, #111827);

  &[data-owner-state='unassigned'] {
    color: var(--alg-text-tertiary, #6b7280);
    font-weight: 500;
  }
}

.alg-lead-drawer__owner-hint {
  font-size: 0.75rem;
  color: var(--alg-text-tertiary, #6b7280);
}

// ---------------------------------------------------------------------------
// History timeline
// ---------------------------------------------------------------------------

.alg-lead-drawer__history-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 0.5rem;
  border-left: 1px solid var(--alg-border, #e5e7eb);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.alg-lead-drawer__history-item {
  position: relative;
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.5rem;
  align-items: start;
}

.alg-lead-drawer__history-node {
  position: absolute;
  left: -0.875rem;
  top: 0.375rem;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  box-shadow: 0 0 0 3px var(--alg-bg-raised, #ffffff);

  &.is-node-success {
    background-color: var(--alg-color-success, #10b981);
  }
  &.is-node-danger {
    background-color: var(--alg-color-danger, #ef4444);
  }
  &.is-node-info {
    background-color: var(--alg-color-info, #3b82f6);
  }
  &.is-node-neutral {
    background-color: var(--alg-color-neutral-7, #6b7280);
  }
}

.alg-lead-drawer__history-avatar {
  margin-left: 0.5rem;
}

.alg-lead-drawer__system-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  background-color: var(
    --alg-color-brand-primary-subtle,
    rgba(20, 184, 166, 0.18)
  );
  color: var(--alg-color-brand-primary, #14b8a6);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
}

.alg-lead-drawer__history-body {
  min-width: 0;
}

.alg-lead-drawer__history-primary {
  margin: 0;
  font-size: 0.875rem;
  color: var(--alg-text-primary, #111827);
  font-weight: 500;
}

.alg-lead-drawer__history-secondary {
  margin: 0.125rem 0 0;
  font-size: 0.75rem;
  color: var(--alg-text-tertiary, #6b7280);
}

.alg-lead-drawer__history-sep {
  margin: 0 0.25rem;
  color: var(--alg-text-muted, #9ca3af);
}

.alg-lead-drawer__history-empty,
.alg-lead-drawer__history-truncated {
  margin: 0;
  padding: 1rem 0;
  font-size: 0.75rem;
  color: var(--alg-text-tertiary, #6b7280);
  text-align: center;
}

.alg-lead-drawer__history-truncated {
  padding-top: 0.75rem;
  border-top: 1px dashed var(--alg-border, #e5e7eb);
  margin-top: 0.75rem;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

.alg-lead-drawer__history-loading {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.25rem 0 0.25rem 0.5rem;
}

.alg-lead-drawer__skeleton-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem;
  align-items: center;
}

.alg-lead-drawer__skeleton-node,
.alg-lead-drawer__skeleton-line {
  background-color: var(--alg-bg-raised-hover, #f3f4f6);
  border-radius: 0.25rem;
  animation: alg-skel-pulse 1.2s ease-in-out infinite;
}

.alg-lead-drawer__skeleton-node {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
}

.alg-lead-drawer__skeleton-line {
  height: 0.625rem;
  width: 80%;
}

@keyframes alg-skel-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-lead-drawer__skeleton-node,
  .alg-lead-drawer__skeleton-line {
    animation: none;
  }
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

.alg-lead-drawer__history-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.25rem 0;
  text-align: center;
}

.alg-lead-drawer__error-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--alg-text-secondary, #374151);
}

.alg-lead-drawer__retry {
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  color: var(--alg-color-brand-primary, #14b8a6);
  cursor: pointer;
  border-radius: 0.25rem;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 1px;
  }
}
</style>
