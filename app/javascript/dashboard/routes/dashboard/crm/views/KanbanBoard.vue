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
import { computed, ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { usePipelineStore } from 'dashboard/composables/algorythmo/usePipelineStore.js';
import { useLeadStore } from 'dashboard/composables/algorythmo/useLeadStore.js';
import { useDragLead } from 'dashboard/composables/algorythmo/useDragLead.js';
import {
  elapsedSince,
  timeSinceLabel,
  humanizeDurationLongPtBr,
} from 'dashboard/helper/algorythmo/timeFormat.js';
import StageColumn from './components/StageColumn.vue';
import KanbanEmptyState from './components/KanbanEmptyState.vue';
import MoveLeadModal from './components/MoveLeadModal.vue';

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
  return CHANNEL_GLYPHS[origin] ?? '\u{1F4E5}'; // 📥 fallback
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
  };
}

const route = useRoute();
const accountId = computed(() => route.params.accountId);
const { t } = useI18n();

const {
  stages,
  isLoading: isPipelineLoading,
  stageById,
  loadPipeline,
} = usePipelineStore(accountId.value);

const leadStore = useLeadStore(accountId.value);
const {
  stageMap,
  leadsByStage,
  fetchStage,
  moveLeadOptimistic,
  commitMove,
  rollbackMove,
} = leadStore;

const now = ref(Date.now());

// Move modal + announce state
const moveModalOpen = ref(false);
const moveModalLead = ref(null);
const announceText = ref('');

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

onMounted(async () => {
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
});

// Re-fetch when accountId changes (account switch keeps the same route component).
watch(accountId, async newId => {
  if (!newId) return;
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
});

const presenterByStage = computed(() => {
  const snapshotNow = now.value;
  const out = new Map();
  stages.value.forEach(stage => {
    const leads = leadsByStage(stage.id);
    out.set(
      stage.id,
      leads.map(l =>
        toPresenter(l, stageById.value.get(l.stage_id) ?? stage, snapshotNow)
      )
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
  return (
    Array.from(stageMap.values())
      .flatMap(state => state.leads)
      .find(l => l.id === leadId) ?? null
  );
}

function handleOpenMenu({ lead }) {
  const raw = findRawLead(lead.id);
  if (!raw) return;
  moveModalLead.value = raw;
  moveModalOpen.value = true;
}

function handleOpenLead() {
  // LeadDetailDrawer lands in Fase 3; emit kept here so the contract is honored.
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

    <MoveLeadModal
      :open="moveModalOpen"
      :lead="moveModalLead"
      :stages="stages"
      @close="moveModalOpen = false"
      @confirm="handleConfirmMove"
    />
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
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--alg-board-divider, #e5e7eb);
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
