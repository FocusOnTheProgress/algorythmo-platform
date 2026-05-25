<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §2 — Kanban surface root.
//
// Responsibility split:
//   - This component owns: data orchestration (pipeline + leads stores), the
//     server-Lead → presenter-Lead transform (name/icon/time/aging state),
//     the drag coordinator wiring, the aria-live announcer, the move modal
//     state machine.
//   - StageColumn owns: per-column render + drop event surface.
//   - LeadCard owns: card-level a11y + menu trigger.
//
// The transform stays here (not inside LeadCard) so the presenter shape
// remains pure data — easier to test, easier to reason about, and one
// allocation per snapshot instead of one per render.
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import {
  usePipelineStore,
  clearPipelineStoreForAccount,
} from 'dashboard/composables/algorythmo/usePipelineStore.js';
import {
  useLeadStore,
  clearLeadStoreForAccount,
} from 'dashboard/composables/algorythmo/useLeadStore.js';
import { useDragLead } from 'dashboard/composables/algorythmo/useDragLead.js';
import {
  elapsedSince,
  timeSinceLabel,
  humanizeDurationLongPtBr,
} from 'dashboard/helper/algorythmo/timeFormat.js';
import AlgToastContainer from 'dashboard/components-next/algorythmo/AlgToastContainer.vue';
import StageColumn from './components/StageColumn.vue';
import KanbanEmptyState from './components/KanbanEmptyState.vue';
import MoveLeadModal from './components/MoveLeadModal.vue';
import LeadCardMenu from './components/LeadCardMenu.vue';
import LeadDetailDrawer from './components/LeadDetailDrawer.vue';

const DAY_MS = 24 * 60 * 60 * 1000;

const CHANNEL_GLYPHS = Object.freeze({
  whatsapp: '\u{1F4AC}', // 💬
  email: '\u2709\uFE0F', // ✉
  facebook: '\u{1F4D8}', // 📘
  instagram: '\u{1F4F7}', // 📷
  api: '\u{1F517}', // 🔗
  sms: '\u{1F4F2}', // 📲
});

function channelGlyph(origin) {
  // Normalize: API may serialize as "Whatsapp" or "Channel::WebWidget".
  const key = String(origin ?? '')
    .toLowerCase()
    .replace(/^channel::/, '');
  return CHANNEL_GLYPHS[key] ?? '\u{1F4E5}'; // 📥 fallback
}

// Aging state per CONTRACT §4. Coefficient is days-per-stage; ratio = elapsed/coef.
function agingStateFor(stage, stageEnteredAt, now) {
  if (stage?.kind === 'won' || stage?.kind === 'lost') return 'neutral';
  const coef = Number(stage?.aging_coefficient);
  if (!Number.isFinite(coef) || coef <= 0) return 'neutral';
  const elapsed = elapsedSince(stageEnteredAt, now);
  if (elapsed == null) return 'neutral';
  const ratio = elapsed / (coef * DAY_MS);
  if (ratio < 1) return 'green';
  if (ratio < 2) return 'yellow';
  return 'red';
}

function leadName(lead) {
  return (
    lead?.contact?.name || lead?.channel_metadata?.name || `Lead #${lead?.id}`
  );
}

function toPresenter(lead, stage, now) {
  const elapsed = elapsedSince(lead.stage_entered_at, now);
  return {
    id: lead.id,
    name: leadName(lead),
    stage_id: lead.stage_id,
    stage_name: stage?.name ?? '',
    channel_origin: lead.channel_origin,
    channel_icon: channelGlyph(lead.channel_origin),
    time_human: timeSinceLabel(lead.stage_entered_at, now),
    time_aria_long: humanizeDurationLongPtBr(elapsed),
    aging_state: agingStateFor(stage, lead.stage_entered_at, now),
    // M1-C/PR1: lead_json now carries `owner: { id, name, thumbnail } | null`.
    // Passed through verbatim — LeadCard renders the avatar or placeholder.
    owner: lead.owner ?? null,
  };
}

const route = useRoute();
const accountId = computed(() => route.params.accountId);
const { t } = useI18n();

// Stores are bound via `computed` keyed on accountId so a tenant switch
// (Vue Router reuses the route component across /app/accounts/:accountId/crm
// transitions) returns fresh, account-correct refs and methods. Without this
// indirection the destructured methods stay closure-bound to the previous
// account and the next fetch leaks tenant A data into tenant B's board.
const pipelineStoreRef = computed(() => usePipelineStore(accountId.value));
const leadStoreRef = computed(() => useLeadStore(accountId.value));

const stages = computed(() => pipelineStoreRef.value.stages.value);
const isPipelineLoading = computed(
  () => pipelineStoreRef.value.isLoading.value
);
const stageById = computed(() => pipelineStoreRef.value.stageById.value);

function loadPipeline() {
  return pipelineStoreRef.value.loadPipeline();
}
function fetchStage(stageId) {
  return leadStoreRef.value.fetchStage(stageId);
}
function leadsByStage(stageId) {
  return leadStoreRef.value.leadsByStage(stageId);
}
function moveLeadOptimistic(args) {
  return leadStoreRef.value.moveLeadOptimistic(args);
}
function commitMove(args) {
  return leadStoreRef.value.commitMove(args);
}
function rollbackMove(args) {
  return leadStoreRef.value.rollbackMove(args);
}

const now = ref(Date.now());

// Move modal + menu + announce + search state
const moveModalOpen = ref(false);
const moveModalLead = ref(null);
const menuOpen = ref(false);
const menuLead = ref(null);
const menuAnchor = ref(null);
const announceText = ref('');
const searchQuery = ref('');
const drawerOpen = ref(false);
const drawerLead = ref(null);
const pipelineConfigPath = computed(
  () => `/app/accounts/${accountId.value}/crm/pipeline`
);

const drag = useDragLead({
  onMove: async ({ leadId, fromStageId, toStageId }) => {
    moveLeadOptimistic({ leadId, fromStageId, toStageId });
    try {
      await commitMove({ leadId, toStageId });
    } catch (err) {
      rollbackMove({ leadId, fromStageId });
      throw err;
    }
  },
  announceMoved: ({ leadName: name, stageName }) => {
    announceText.value = t('ALGORYTHMO_CRM.ANNOUNCE.MOVED', {
      leadName: name,
      stageName,
    });
  },
  announceFailed: ({ leadName: name }) => {
    announceText.value = t('ALGORYTHMO_CRM.ANNOUNCE.MOVE_FAILED', {
      leadName: name,
    });
  },
});

// CONTRACT §4 — aging state crosses thresholds as time passes. Without a tick,
// a card opened at "green" would stay "green" until the route remounts. 30s is
// fast enough to feel live and slow enough to be invisible in CPU profiles.
const AGING_TICK_MS = 30_000;
let agingTimer = null;

onMounted(async () => {
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
  agingTimer = setInterval(() => {
    now.value = Date.now();
  }, AGING_TICK_MS);
});

onBeforeUnmount(() => {
  if (agingTimer !== null) clearInterval(agingTimer);
  agingTimer = null;
});

// Re-fetch when accountId changes. The store refs above re-bind to the new
// account via `computed`, but pipeline data still has to be (re)loaded for
// the new tenant, and any stale local UI state (menu / move modal) referring
// to the previous account's leads must be dropped. The previous account's
// store caches are evicted so they don't sit in memory indefinitely after a
// tenant switch (and so a return to the previous account refetches fresh
// data instead of showing a stale snapshot).
watch(accountId, async (newId, oldId) => {
  if (!newId) return;
  menuOpen.value = false;
  menuLead.value = null;
  menuAnchor.value = null;
  moveModalOpen.value = false;
  moveModalLead.value = null;
  if (oldId && oldId !== newId) {
    clearLeadStoreForAccount(oldId);
    clearPipelineStoreForAccount(oldId);
  }
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
});

const presenterByStage = computed(() => {
  const snapshotNow = now.value;
  const needle = searchQuery.value.trim().toLowerCase();
  const out = new Map();
  stages.value.forEach(stage => {
    const leads = leadsByStage(stage.id);
    const presenters = leads.map(l =>
      toPresenter(l, stageById.value.get(l.stage_id) ?? stage, snapshotNow)
    );
    out.set(
      stage.id,
      needle
        ? presenters.filter(p => p.name.toLowerCase().includes(needle))
        : presenters
    );
  });
  return out;
});

const boardHasAnyLead = computed(() =>
  Array.from(presenterByStage.value.values()).some(p => p.length > 0)
);

const showGlobalEmpty = computed(
  () =>
    !isPipelineLoading.value &&
    stages.value.length > 0 &&
    !boardHasAnyLead.value
);

function findRawLead(leadId) {
  // stageMap is per-account and re-read on every call so an account switch
  // does not look up a lead in the previous tenant's map.
  const stageMap = leadStoreRef.value.stageMap;
  return (
    Array.from(stageMap.values())
      .flatMap(state => state.leads)
      .find(l => l.id === leadId) ?? null
  );
}

function closeMenu() {
  menuOpen.value = false;
  menuLead.value = null;
  menuAnchor.value = null;
}

function handleOpenMenu({ lead, anchor }) {
  // CONTRACT §6 — the ⋮ trigger opens [data-testid="lead-card-menu"], not
  // the move modal directly. The menu then routes to the modal via the
  // "Mover para…" menuitem (handleMenuMove).
  //
  // Toggle: a second click on the same trigger closes the menu instead of
  // re-positioning. Mirrors macOS/Windows menu-button conventions and the
  // user's most common "I opened the wrong card" recovery gesture.
  if (menuOpen.value && menuLead.value?.id === lead.id) {
    closeMenu();
    return;
  }
  const raw = findRawLead(lead.id);
  if (!raw) return;
  menuLead.value = raw;
  menuAnchor.value = anchor instanceof HTMLElement ? anchor : null;
  menuOpen.value = true;
}

function handleMenuMove() {
  if (!menuLead.value) return;
  moveModalLead.value = menuLead.value;
  moveModalOpen.value = true;
  closeMenu();
}

function handleOpenLead(presenter) {
  // Presenter only carries display fields. The drawer needs the raw lead
  // (contact, owner, channel_origin) — look it up from the store rather than
  // duplicating it into the presenter shape.
  const raw = findRawLead(presenter?.id);
  if (!raw) return;
  drawerLead.value = raw;
  drawerOpen.value = true;
}

function handleDrawerClose() {
  drawerOpen.value = false;
}

async function handleConfirmMove({ leadId, stage }) {
  const raw = findRawLead(leadId);
  moveModalOpen.value = false;
  moveModalLead.value = null;
  if (!raw || !stage || raw.stage_id === stage.id) return;
  try {
    moveLeadOptimistic({
      leadId,
      fromStageId: raw.stage_id,
      toStageId: stage.id,
    });
    await commitMove({ leadId, toStageId: stage.id });
    announceText.value = t('ALGORYTHMO_CRM.ANNOUNCE.MOVED', {
      leadName: leadName(raw),
      stageName: stage.name,
    });
  } catch (err) {
    rollbackMove({ leadId, fromStageId: raw.stage_id });
    announceText.value = t('ALGORYTHMO_CRM.ANNOUNCE.MOVE_FAILED', {
      leadName: leadName(raw),
    });
    // eslint-disable-next-line no-console
    console.error('algorythmo:move-modal-confirm-failed', err);
  }
}
</script>

<template>
  <main class="alg-kanban" data-testid="crm-kanban-view">
    <header class="alg-kanban__header" data-testid="kanban-header">
      <h1 class="alg-kanban__title" data-testid="kanban-title">
        {{ t('ALGORYTHMO_CRM.KANBAN.TITLE') }}
      </h1>
      <div class="alg-kanban__header-actions">
        <input
          v-model="searchQuery"
          type="search"
          class="alg-kanban__search"
          data-testid="kanban-search-input"
          :placeholder="t('ALGORYTHMO_CRM.KANBAN.SEARCH_PLACEHOLDER')"
          :aria-label="t('ALGORYTHMO_CRM.KANBAN.SEARCH_PLACEHOLDER')"
        />
        <router-link
          class="alg-kanban__pipeline-link"
          data-testid="pipeline-config-link"
          :to="pipelineConfigPath"
        >
          {{ t('ALGORYTHMO_CRM.KANBAN.PIPELINE_CONFIG_LINK') }}
        </router-link>
      </div>
    </header>

    <KanbanEmptyState v-if="showGlobalEmpty" />

    <div
      v-else
      class="alg-kanban__board"
      data-testid="kanban-board"
      role="region"
      :aria-label="t('ALGORYTHMO_CRM.KANBAN.BOARD_ARIA_LABEL')"
    >
      <StageColumn
        v-for="stage in stages"
        :key="stage.id"
        :stage="stage"
        :leads="presenterByStage.get(stage.id) ?? []"
        :board-has-any-lead="boardHasAnyLead"
        :is-drop-target="drag.hoveredStageId.value === stage.id"
        @drag-start="drag.start"
        @drag-enter="drag.enter"
        @drag-over="drag.over"
        @drag-leave="drag.leave"
        @drop="drag.drop"
        @drag-end="drag.end"
        @open-lead="handleOpenLead"
        @open-menu="handleOpenMenu"
      />
    </div>

    <div
      data-testid="aria-live-region"
      aria-live="polite"
      aria-atomic="true"
      class="alg-kanban__sr-only"
    >
      {{ announceText }}
    </div>

    <LeadCardMenu
      :open="menuOpen"
      :lead="menuLead"
      :anchor="menuAnchor"
      @close="closeMenu"
      @move="handleMenuMove"
    />

    <LeadDetailDrawer
      v-model:open="drawerOpen"
      :lead="drawerLead"
      :account-id="accountId"
      :now="now"
      @close="handleDrawerClose"
    />

    <MoveLeadModal
      :open="moveModalOpen"
      :lead="moveModalLead"
      :stages="stages"
      @close="moveModalOpen = false"
      @confirm="handleConfirmMove"
    />

    <!--
      Toast outlet for Algorythmo surfaces. Mounted here (not at App root) to
      keep the M1-B blast radius inside the feature-gated CRM zone. When more
      Algorythmo surfaces ship, promote this mount to a shared authenticated
      layout so a single container serves the whole dashboard.
    -->
    <AlgToastContainer :label="t('ALGORYTHMO_CRM.KANBAN.TOAST_REGION_LABEL')" />
  </main>
</template>

<style lang="scss" scoped>
.alg-kanban {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--alg-board-bg, #ffffff);
}

.alg-kanban__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--alg-board-divider, #e5e7eb);
}

.alg-kanban__header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.alg-kanban__search {
  min-width: 16rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--alg-board-divider, #e5e7eb);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  background-color: var(--alg-board-bg, #ffffff);
  color: var(--alg-modal-fg, #111827);

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 1px;
  }
}

.alg-kanban__pipeline-link {
  font-size: 0.875rem;
  text-decoration: none;
  color: var(--alg-cta-bg, #2563eb);

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 2px;
    border-radius: 0.125rem;
  }
}

.alg-kanban__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.alg-kanban__board {
  display: flex;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  overflow-x: auto;
  flex: 1;
  align-items: stretch;
}

.alg-kanban__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
