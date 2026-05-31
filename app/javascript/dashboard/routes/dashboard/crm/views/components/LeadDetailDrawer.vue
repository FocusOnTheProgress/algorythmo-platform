<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §7 (v1.2.0) — LeadDetailDrawer.
//
// Cinematic OS round-3: the drawer is now a full lead profile, not a thin
// contact card. Wraps AlgDrawer with:
//   header (sticky)  — title (lead name) + close   [AlgDrawer]
//   IDENTITY         — avatar + name + company · role (drawer body intro)
//   RESUMO           — one-paragraph qualification narrative (lead.summary)
//   QUALIFICAÇÃO     — structured {label,value} signals (lead.qualification[])
//   CONTATO          — email, phone
//   CANAIS           — every reachable channel (lead.channels[]) + origin label
//   SOCIAL           — external profile links (lead.social[])
//   DONO             — owner avatar + name OR available placeholder
//   ATIVIDADE        — timeline. Demo leads carry an inline `timeline`; live
//                      leads lazy-fetch stage_history (5 states).
//   footer           — "Ver conversa" → routes to the inbox conversation.
//
// Timeline source of truth: a demo lead ships its own `timeline` (no backend),
// so when present we render it directly and skip the network loading/error/
// empty states. Live leads (no inline timeline) keep the lazy-fetch behaviour
// exactly as before — the stageHistory composable drives the block.
//
// Why lazy fetch for live leads: the timeline is the only block that requires a
// network roundtrip; everything else is already in `lead`. Fetching on drawer
// open keeps the kanban list page cheap and pays the drawer cost on intent.
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import AlgDrawer from 'dashboard/components-next/algorythmo/AlgDrawer.vue';
import AlgAvatar from 'dashboard/components-next/algorythmo/AlgAvatar.vue';
import LeadChannelIcon from './LeadChannelIcon.vue';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion.js';
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
  // In demo mode the leads carry SYNTHETIC conversation_ids (90101…) that don't
  // resolve to a real thread. The CTA then routes to the conversations list
  // instead of opening a phantom not-found pane (adversarial review #111).
  demoMode: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:open', 'close']);

const { t } = useI18n();
const router = useRouter();

// Drawer reveal choreography (shared motion system). When the drawer opens the
// profile sections fade + lift in sequence — one curve, one reduced-motion
// contract, never hand-rolled (DESIGN §3.7 / MOTION-SYSTEM A6).
const bodyRef = ref(null);
const { revealChildren } = useAlgMotion(bodyRef);

const stageHistory = useStageHistory(props.accountId);

const SYSTEM_MONOGRAM = 'A'; // Algorythmo brand mark — visual, not copy.
const META_SEPARATOR = '·';

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

// Inline channel glyphs — same path data as the card, so the drawer's channel
// list reads with the identical iconography (founder: no emoji in chrome).
const CHANNEL_ICON_PATHS = Object.freeze({
  whatsapp:
    '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  email:
    '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/>',
  instagram:
    '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
  linkedin:
    '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>',
  facebook:
    '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  generic:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
});

function normalizeChannelKey(origin) {
  return String(origin ?? '')
    .toLowerCase()
    .replace(/^channel::/, '')
    .replace(/[-\s]/g, '');
}

function channelLabelFor(origin) {
  if (!origin) return '';
  const key = normalizeChannelKey(origin);
  const labelKey = CHANNEL_LABEL_KEYS[key] ?? 'UNKNOWN';
  return t(`ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.${labelKey}`);
}

function channelIconFor(origin) {
  const key = normalizeChannelKey(origin);
  return CHANNEL_ICON_PATHS[key] ?? CHANNEL_ICON_PATHS.generic;
}

const channelLabel = computed(() =>
  channelLabelFor(props.lead?.channel_origin)
);

const drawerTitle = computed(
  () => props.lead?.name || t('ALGORYTHMO_CRM.DRAWER.TITLE_FALLBACK')
);

// Forwarded to AlgDrawer's root element so QA can target the dialog itself
// via [data-testid="lead-detail-drawer"][data-lead-id=...]. CONTRACT_M1B §7.
const rootDataset = computed(() => {
  const out = {};
  if (props.lead?.id != null) out['data-lead-id'] = props.lead.id;
  return out;
});

// -----------------------------------------------------------------------
// Identity + profile (demo-enriched, optional)
// -----------------------------------------------------------------------

const leadName = computed(() => props.lead?.name ?? '');
const company = computed(() => props.lead?.company ?? null);
const role = computed(() => props.lead?.role ?? null);
const summary = computed(() => props.lead?.summary ?? null);

const qualification = computed(() =>
  Array.isArray(props.lead?.qualification) ? props.lead.qualification : []
);
const hasQualification = computed(() => qualification.value.length > 0);

// Reachable channels. Falls back to a single entry derived from channel_origin
// so live leads (no `channels` array) still show their inbound channel.
const channels = computed(() => {
  if (Array.isArray(props.lead?.channels) && props.lead.channels.length) {
    return props.lead.channels.map(c => ({
      origin: c.origin,
      handle: c.handle ?? '',
      label: channelLabelFor(c.origin),
      icon: channelIconFor(c.origin),
    }));
  }
  if (props.lead?.channel_origin) {
    return [
      {
        origin: props.lead.channel_origin,
        handle: '',
        label: channelLabel.value,
        icon: channelIconFor(props.lead.channel_origin),
      },
    ];
  }
  return [];
});

const social = computed(() =>
  Array.isArray(props.lead?.social)
    ? props.lead.social.map(s => ({
        platform: s.platform,
        handle: s.handle,
        url: s.url,
        icon: channelIconFor(s.platform),
      }))
    : []
);
const hasSocial = computed(() => social.value.length > 0);

// -----------------------------------------------------------------------
// Lead intelligence (future lead-nurturing agent — demo-enriched)
// -----------------------------------------------------------------------
// Shell for the data the future lead-nurturing agent will own: LinkedIn /
// Instagram / Facebook research + conversation memory. We render the structure
// now (clearly labelled, agent-attributed) and fill it with demo content; in
// production the agent populates `lead.intelligence`. When it's absent the
// block stays present but shows the pending/empty copy so the section never
// silently disappears — the operator always sees where this will live.
const intelligence = computed(() => props.lead?.intelligence ?? null);
// Research findings keep only data (source name + text). The icon is rendered by
// the allowlist-driven <LeadChannelIcon> from the source NAME — never raw SVG —
// so future agent-supplied content can't inject markup (adversarial review #111).
const research = computed(() =>
  Array.isArray(intelligence.value?.research)
    ? intelligence.value.research.map(r => ({
        source: r.source,
        text: r.text,
      }))
    : []
);
const memory = computed(() =>
  Array.isArray(intelligence.value?.memory) ? intelligence.value.memory : []
);
const hasIntelligence = computed(
  () => research.value.length > 0 || memory.value.length > 0
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
// "Ver conversa" CTA (C3)
// -----------------------------------------------------------------------
// The action is ALWAYS available — it takes the operator to the lead's
// conversation. For a LIVE lead carrying a concrete `conversation_id` we
// deep-link straight to that thread. In DEMO mode the conversation_ids are
// synthetic (90101…) and resolve to nothing, so the CTA routes to the
// conversations list instead of opening a phantom not-found pane.
//
// TODO(lead-linkage): live leads do not yet carry the real conversation_id /
// contact_id. Once the lead store hydrates the contact's primary conversation
// (M2 — contact→conversation join), the live branch deep-links from that real
// id; the demo branch goes away with the demo board.
const conversationId = computed(() => props.lead?.conversation_id ?? null);
// Whether we can deep-link to a REAL thread: a concrete id AND not demo mode.
const hasConversation = computed(
  () => !props.demoMode && conversationId.value != null
);

function openConversation() {
  if (hasConversation.value) {
    router.push({
      name: 'inbox_conversation',
      params: {
        accountId: props.accountId,
        conversation_id: conversationId.value,
      },
    });
    return;
  }
  // Demo lead (synthetic id) or no concrete thread yet — land the operator on
  // the conversations view so the action is never dead and never phantom.
  router.push({ name: 'home', params: { accountId: props.accountId } });
}

// -----------------------------------------------------------------------
// Timeline — inline (demo) takes precedence over lazy-fetched (live)
// -----------------------------------------------------------------------

const inlineTimeline = computed(() =>
  Array.isArray(props.lead?.timeline) && props.lead.timeline.length
    ? props.lead.timeline
    : null
);
const usesInlineTimeline = computed(() => inlineTimeline.value !== null);

const isLoading = computed(
  () => !usesInlineTimeline.value && stageHistory.loading.value
);
const fetchError = computed(() =>
  usesInlineTimeline.value ? null : stageHistory.error.value
);
const fetchedEntries = computed(() => stageHistory.entries.value);
const truncated = computed(() =>
  usesInlineTimeline.value ? false : stageHistory.truncated.value
);

// The entries the template renders: the inline demo timeline when present,
// otherwise the lazily-fetched stage history.
const entries = computed(() =>
  usesInlineTimeline.value ? inlineTimeline.value : fetchedEntries.value
);

const isEmpty = computed(
  () => !isLoading.value && !fetchError.value && entries.value.length === 0
);
const hasEntries = computed(
  () => !isLoading.value && !fetchError.value && entries.value.length > 0
);

// -----------------------------------------------------------------------
// Lifecycle — load when drawer opens with a lead, reset when closed.
// (Kept unconditional so live leads fetch; demo leads ignore the result and
// render their inline timeline instead.)
// -----------------------------------------------------------------------

watch(
  [() => props.open, () => props.lead?.id],
  ([open, leadId], [prevOpen]) => {
    if (open && leadId) {
      stageHistory.load(leadId);
      // Stagger-reveal the profile sections once the drawer body is in the DOM.
      // nextTick lets the teleported AlgDrawer mount the slotted content first.
      nextTick(() => {
        revealChildren('[data-alg-reveal]', { each: 0.045, y: 10 });
      });
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
    root-testid="lead-detail-drawer"
    title-testid="drawer-title"
    close-testid="drawer-close"
    :root-dataset="rootDataset"
    @update:open="handleUpdateOpen"
    @close="handleClose"
  >
    <div
      v-if="lead"
      ref="bodyRef"
      class="alg-lead-drawer"
      data-testid="lead-detail-drawer-body"
      :data-lead-id="lead.id"
    >
      <!-- IDENTITY — avatar + name + company · role -->
      <section
        class="alg-lead-drawer__identity"
        data-alg-reveal
        data-testid="drawer-identity-block"
      >
        <div class="alg-lead-drawer__identity-avatar">
          <AlgAvatar src="" :name="leadName || '—'" size="lg" />
        </div>
        <div class="alg-lead-drawer__identity-text">
          <p
            class="alg-lead-drawer__identity-name"
            data-testid="drawer-identity-name"
          >
            {{ leadName }}
          </p>
          <p
            v-if="company || role"
            class="alg-lead-drawer__identity-meta"
            data-testid="drawer-identity-meta"
          >
            <span v-if="role">{{ role }}</span>
            <span
              v-if="role && company"
              class="alg-lead-drawer__dot"
              aria-hidden="true"
              >{{ META_SEPARATOR }}</span
            >
            <span v-if="company" class="alg-lead-drawer__identity-company">{{
              company
            }}</span>
          </p>
        </div>
      </section>

      <!-- RESUMO -->
      <section
        v-if="summary"
        class="alg-lead-drawer__block"
        data-alg-reveal
        data-testid="drawer-summary-block"
      >
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.SUMMARY') }}
        </h3>
        <p class="alg-lead-drawer__summary" data-testid="drawer-summary-text">
          {{ summary }}
        </p>
      </section>

      <!-- INTELIGÊNCIA DO LEAD — future lead-nurturing agent (demo) -->
      <section
        class="alg-lead-drawer__block alg-lead-drawer__intel"
        data-alg-reveal
        data-testid="drawer-intelligence-block"
      >
        <div class="alg-lead-drawer__intel-head">
          <h3 class="alg-lead-drawer__block-label">
            {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.INTELLIGENCE') }}
          </h3>
          <span class="alg-lead-drawer__intel-badge">
            {{ t('ALGORYTHMO_CRM.DRAWER.INTELLIGENCE.PENDING_BADGE') }}
          </span>
        </div>
        <p class="alg-lead-drawer__intel-caption">
          {{ t('ALGORYTHMO_CRM.DRAWER.INTELLIGENCE.CAPTION') }}
        </p>

        <template v-if="hasIntelligence">
          <div
            v-if="research.length"
            class="alg-lead-drawer__intel-group"
            data-testid="drawer-intelligence-research"
          >
            <span class="alg-lead-drawer__intel-sublabel">
              {{ t('ALGORYTHMO_CRM.DRAWER.INTELLIGENCE.RESEARCH_LABEL') }}
            </span>
            <ul class="alg-lead-drawer__intel-list">
              <li
                v-for="(r, i) in research"
                :key="`r-${i}`"
                class="alg-lead-drawer__intel-item"
              >
                <LeadChannelIcon
                  class="alg-lead-drawer__channel-icon"
                  :source="r.source"
                  :size="13"
                />
                <span>{{ r.text }}</span>
              </li>
            </ul>
          </div>

          <div
            v-if="memory.length"
            class="alg-lead-drawer__intel-group"
            data-testid="drawer-intelligence-memory"
          >
            <span class="alg-lead-drawer__intel-sublabel">
              {{ t('ALGORYTHMO_CRM.DRAWER.INTELLIGENCE.MEMORY_LABEL') }}
            </span>
            <ul
              class="alg-lead-drawer__intel-list alg-lead-drawer__intel-list--memory"
            >
              <li
                v-for="(m, i) in memory"
                :key="`m-${i}`"
                class="alg-lead-drawer__intel-item"
              >
                <span class="alg-lead-drawer__intel-dot" aria-hidden="true" />
                <span>{{ m }}</span>
              </li>
            </ul>
          </div>
        </template>

        <p
          v-else
          class="alg-lead-drawer__intel-empty"
          data-testid="drawer-intelligence-empty"
        >
          {{ t('ALGORYTHMO_CRM.DRAWER.INTELLIGENCE.EMPTY') }}
        </p>
      </section>

      <!-- QUALIFICAÇÃO -->
      <section
        v-if="hasQualification"
        class="alg-lead-drawer__block"
        data-alg-reveal
        data-testid="drawer-qualification-block"
      >
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.QUALIFICATION') }}
        </h3>
        <dl class="alg-lead-drawer__pairs">
          <template v-for="(q, i) in qualification" :key="i">
            <dt class="alg-lead-drawer__pair-label">{{ q.label }}</dt>
            <dd class="alg-lead-drawer__pair-value">{{ q.value }}</dd>
          </template>
        </dl>
      </section>

      <!-- CONTATO -->
      <section
        class="alg-lead-drawer__block"
        data-alg-reveal
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

      <!-- CANAIS -->
      <section class="alg-lead-drawer__block" data-alg-reveal>
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CHANNEL') }}
        </h3>
        <ul class="alg-lead-drawer__channels" data-testid="drawer-channels">
          <li
            v-for="(c, i) in channels"
            :key="i"
            class="alg-lead-drawer__channel-row"
            :data-channel="c.origin"
            :data-testid="i === 0 ? 'drawer-channel-origin' : undefined"
          >
            <!-- eslint-disable-next-line vue/no-v-html -->
            <svg
              class="alg-lead-drawer__channel-icon"
              aria-hidden="true"
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              v-html="c.icon"
            />
            <span class="alg-lead-drawer__channel-name">{{ c.label }}</span>
            <span v-if="c.handle" class="alg-lead-drawer__channel-handle">{{
              c.handle
            }}</span>
          </li>
        </ul>
      </section>

      <!-- SOCIAL -->
      <section
        v-if="hasSocial"
        class="alg-lead-drawer__block"
        data-alg-reveal
        data-testid="drawer-social-block"
      >
        <h3 class="alg-lead-drawer__block-label">
          {{ t('ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.SOCIAL') }}
        </h3>
        <ul class="alg-lead-drawer__social" data-testid="drawer-social-links">
          <li v-for="(s, i) in social" :key="i">
            <a
              class="alg-lead-drawer__social-link"
              :href="s.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <!-- eslint-disable-next-line vue/no-v-html -->
              <svg
                class="alg-lead-drawer__channel-icon"
                aria-hidden="true"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                v-html="s.icon"
              />
              <span>{{ s.handle }}</span>
            </a>
          </li>
        </ul>
      </section>

      <!-- DONO -->
      <section
        class="alg-lead-drawer__block"
        data-alg-reveal
        data-testid="drawer-owner-block"
      >
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

      <!-- ATIVIDADE -->
      <section
        class="alg-lead-drawer__block"
        data-alg-reveal
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

    <template #footer>
      <button
        type="button"
        class="alg-lead-drawer__cta"
        data-testid="drawer-open-conversation"
        :data-has-conversation="hasConversation ? 'true' : 'false'"
        @click="openConversation"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
          />
        </svg>
        {{ t('ALGORYTHMO_CRM.DRAWER.OPEN_CONVERSATION') }}
      </button>
    </template>
  </AlgDrawer>
</template>

<style lang="scss" scoped>
.alg-lead-drawer {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 0.5rem 0;
  color: var(--alg-fg-primary);
}

// IDENTITY ------------------------------------------------------------------
.alg-lead-drawer__identity {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--alg-border);
}

.alg-lead-drawer__identity-avatar {
  flex: 0 0 auto;
}

.alg-lead-drawer__identity-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1875rem;
}

.alg-lead-drawer__identity-name {
  margin: 0;
  font-size: var(--alg-text-lg, 1.0625rem);
  font-weight: var(--alg-weight-semibold, 600);
  letter-spacing: var(--alg-tracking-snug, -0.014em);
  color: var(--alg-fg-primary);
  line-height: 1.25;
}

.alg-lead-drawer__identity-meta {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem;
}

.alg-lead-drawer__identity-company {
  color: var(--alg-fg-secondary);
}

.alg-lead-drawer__dot {
  color: var(--alg-fg-quaternary);
}

// BLOCKS --------------------------------------------------------------------
.alg-lead-drawer__block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-lead-drawer__block-label {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-lead-drawer__summary {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--alg-fg-secondary);
}

// INTELIGÊNCIA DO LEAD — the marquee future surface. A contained panel marked
// with the ICE register (cool hairline + faint glacial wash) signalling "this
// is where the living intelligence speaks". No animated comet here — that stays
// the orb/hero's; this is a quiet, premium agent shell. (DESIGN ice language.)
.alg-lead-drawer__intel {
  gap: 0.625rem;
  padding: 0.875rem;
  border-radius: var(--alg-radius-md, 12px);
  background: linear-gradient(
      135deg,
      color-mix(
        in oklch,
        var(--alg-ice-3, oklch(0.66 0.11 235)) 6%,
        transparent
      ),
      transparent 60%
    ),
    var(--alg-bg-tint-low);
  border: 1px solid
    color-mix(
      in oklch,
      var(--alg-ice-3, oklch(0.66 0.11 235)) 22%,
      var(--alg-border)
    );
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
}

.alg-lead-drawer__intel-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.alg-lead-drawer__intel-badge {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: var(--alg-radius-pill, 9999px);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(
    in oklch,
    var(--alg-ice-2, oklch(0.86 0.075 225)) 90%,
    white
  );
  background-color: color-mix(
    in oklch,
    var(--alg-ice-3, oklch(0.66 0.11 235)) 16%,
    transparent
  );
  border: 1px solid
    color-mix(in oklch, var(--alg-ice-3, oklch(0.66 0.11 235)) 30%, transparent);
}

.alg-lead-drawer__intel-caption {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--alg-fg-tertiary);
}

.alg-lead-drawer__intel-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.alg-lead-drawer__intel-sublabel {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--alg-fg-quaternary);
}

.alg-lead-drawer__intel-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.alg-lead-drawer__intel-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--alg-fg-secondary);

  .alg-lead-drawer__channel-icon {
    margin-top: 0.125rem;
    color: color-mix(
      in oklch,
      var(--alg-ice-2, oklch(0.86 0.075 225)) 80%,
      white
    );
  }
}

.alg-lead-drawer__intel-dot {
  flex: 0 0 auto;
  width: 0.3125rem;
  height: 0.3125rem;
  margin-top: 0.4375rem;
  border-radius: var(--alg-radius-pill, 9999px);
  background-color: color-mix(
    in oklch,
    var(--alg-ice-2, oklch(0.86 0.075 225)) 70%,
    transparent
  );
}

.alg-lead-drawer__intel-empty {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--alg-fg-tertiary);
}

.alg-lead-drawer__pairs {
  display: grid;
  grid-template-columns: minmax(5.5rem, auto) 1fr;
  gap: 0.5rem 0.875rem;
  margin: 0;
}

.alg-lead-drawer__pair-label {
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
  margin: 0;
}

.alg-lead-drawer__pair-value {
  margin: 0;
  font-size: 0.875rem;
  color: var(--alg-fg-primary);
  word-break: break-word;

  &.is-missing em {
    color: var(--alg-fg-tertiary);
    font-style: italic;
  }
}

// CANAIS --------------------------------------------------------------------
.alg-lead-drawer__channels,
.alg-lead-drawer__social {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-lead-drawer__channel-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--alg-fg-primary);
}

.alg-lead-drawer__channel-icon {
  flex: 0 0 auto;
  width: 0.8125rem;
  height: 0.8125rem;
  color: var(--alg-fg-tertiary);
}

.alg-lead-drawer__channel-name {
  color: var(--alg-fg-secondary);
}

.alg-lead-drawer__channel-handle {
  margin-left: auto;
  font-family: var(--alg-font-mono);
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
  font-variant-numeric: tabular-nums;
}

// SOCIAL --------------------------------------------------------------------
.alg-lead-drawer__social-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--alg-text-brand);
  text-decoration: none;
  border-radius: var(--alg-radius-sm, 8px);

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }

  .alg-lead-drawer__channel-icon {
    color: var(--alg-text-brand);
  }
}

// DONO ----------------------------------------------------------------------
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
  border-radius: var(--alg-radius-pill, 9999px);
  overflow: hidden;

  &--unassigned {
    background-color: var(--alg-bg-tint-low);
    border: 1px dashed var(--alg-border-strong);
    color: var(--alg-fg-tertiary);
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
  color: var(--alg-fg-primary);

  &[data-owner-state='unassigned'] {
    color: var(--alg-fg-tertiary);
    font-weight: 500;
  }
}

.alg-lead-drawer__owner-hint {
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
}

// ATIVIDADE — timeline ------------------------------------------------------
.alg-lead-drawer__history-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 0.5rem;
  border-left: 1px solid var(--alg-border);
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
  border-radius: var(--alg-radius-pill, 9999px);
  box-shadow: 0 0 0 3px var(--alg-bg-raised);

  &.is-node-success {
    background-color: var(--alg-color-success);
  }
  &.is-node-danger {
    background-color: var(--alg-color-danger);
  }
  &.is-node-info {
    background-color: var(--alg-color-info);
  }
  &.is-node-neutral {
    background-color: var(--alg-fg-tertiary);
  }
}

.alg-lead-drawer__history-avatar {
  margin-left: 0.5rem;
}

.alg-lead-drawer__system-avatar {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 0.25rem;
  background-color: var(--alg-color-brand-primary-subtle);
  color: var(--alg-color-brand-primary);
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
  color: var(--alg-fg-primary);
  font-weight: 500;
}

.alg-lead-drawer__history-secondary {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
}

.alg-lead-drawer__history-sep {
  margin: 0 0.25rem;
  color: var(--alg-fg-quaternary);
}

.alg-lead-drawer__history-empty,
.alg-lead-drawer__history-truncated {
  margin: 0;
  padding: 1rem 0;
  font-size: 0.8125rem;
  color: var(--alg-fg-tertiary);
  text-align: center;
}

.alg-lead-drawer__history-truncated {
  padding-top: 0.75rem;
  border-top: 1px dashed var(--alg-border);
  margin-top: 0.75rem;
}

// Loading skeleton ----------------------------------------------------------
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
  background-color: var(--alg-bg-raised-hover);
  border-radius: 0.25rem;
  animation: alg-skel-pulse 1.2s ease-in-out infinite;
}

.alg-lead-drawer__skeleton-node {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: var(--alg-radius-pill, 9999px);
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

// Error state ---------------------------------------------------------------
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
  color: var(--alg-fg-secondary);
}

.alg-lead-drawer__retry {
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  color: var(--alg-text-brand);
  cursor: pointer;
  border-radius: 0.25rem;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}

// "Ver conversa" CTA --------------------------------------------------------
.alg-lead-drawer__cta {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--alg-border-strong);
  border-radius: var(--alg-radius-md, 12px);
  background-color: var(--alg-bg-tint-med);
  color: var(--alg-fg-primary);
  font-size: var(--alg-text-sm, 0.875rem);
  font-weight: var(--alg-weight-medium, 500);
  cursor: pointer;
  transition:
    background-color var(--alg-duration-base, 240ms) var(--alg-ease-cinematic),
    border-color var(--alg-duration-base, 240ms) var(--alg-ease-cinematic);

  svg {
    color: var(--alg-color-brand-primary);
  }

  &:hover {
    background-color: var(--alg-bg-tint-high);
    border-color: var(--alg-border-hover);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}
</style>
