<script setup>
// algorythmo: Stream E — "Sala de Conselho IA" (replaces CLevelsPlaceholder).
//
// The strategic C-level forum. The CEO (the user) chairs; the AI committee is
// CFO / CMO / CTO / COO. Three panels:
//   E1 left   — CommitteePanel: director readiness + "Chamar para a Mesa".
//   E2 center — the debate flow: opening prompt → scripted debate bubbles with
//               data pills + the three proposal actions (Aprovar / Pedir
//               alternativa / Descartar).
//   E3 right  — ImpactSimulator: ghost-line projection charts that preview a
//               proposal's impact and revert on dismiss.
//
// This component owns the round state machine and the demo wiring boundary.
// Every "real OS wiring" seam lives in clevels.demo.js (see its header) or is
// flagged with TODO(real-wiring) at the call site.
import { ref, computed, nextTick, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';
import { DIRECTORS, GOALS, debateForGoal } from './clevels.demo.js';
import CommitteePanel from './CommitteePanel.vue';
import OpeningPrompt from './OpeningPrompt.vue';
import DebateBubble from './DebateBubble.vue';
import ImpactSimulator from './ImpactSimulator.vue';
import SourceReportModal from './SourceReportModal.vue';
import WorkOrderModal from './WorkOrderModal.vue';

const { t } = useI18n();

// --- Committee (E1) ---------------------------------------------------------
const directors = DIRECTORS;
const directorById = computed(() =>
  Object.fromEntries(directors.map(d => [d.id, d]))
);
// All directors seated by default.
const seated = ref(directors.map(d => d.id));

function toggleSeat(id) {
  seated.value = seated.value.includes(id)
    ? seated.value.filter(x => x !== id)
    : [...seated.value, id];
}

// --- Debate (E2) ------------------------------------------------------------
const round = ref(null); // { goalKey, turns: [] }
// Per-turn UI status: turnId → 'open' | 'approved' | 'dismissed'.
const turnStatus = ref({});
const flowRef = ref(null);
const { revealChildren } = useAlgMotion(flowRef);

const hasRound = computed(() => !!round.value);

// Only seated directors speak. A debate turn whose director was excluded is
// silently dropped from the rendered flow.
const visibleTurns = computed(() => {
  if (!round.value) return [];
  return round.value.turns.filter(turn => seated.value.includes(turn.director));
});

// --- Impact Simulator preview (E3) -----------------------------------------
const activeProjection = ref(null);
const previewLabel = ref('');

function previewProposal(turn) {
  if (!turn?.projection) return;
  activeProjection.value = turn.projection;
  previewLabel.value = turn.figure ? t(turn.figure.labelKey) : '';
}

function clearPreview() {
  activeProjection.value = null;
  previewLabel.value = '';
}

function startRound({ goalId }) {
  // Demo: free text / unknown goal falls back to the first preset so the round
  // always runs end-to-end.
  // TODO(real-wiring): hand the challenge to the director-agent debate engine.
  const id = goalId || GOALS[0].id;
  const debate = debateForGoal(id);
  if (!debate) return;
  round.value = debate;
  turnStatus.value = {};
  clearPreview();
  nextTick(() => {
    revealChildren('[data-alg-reveal-bubble]', { each: 0.12, y: 14 });
  });
}

function resetRound() {
  round.value = null;
  turnStatus.value = {};
  clearPreview();
}

// --- Proposal actions (E2) --------------------------------------------------
const reportModalOpen = ref(false);
const activeFigure = ref(null);

function openReport(figure) {
  activeFigure.value = figure;
  reportModalOpen.value = true;
}

const workOrderOpen = ref(false);
const workOrderProposal = ref(null);

function approveProposal(turn) {
  workOrderProposal.value = turn;
  workOrderOpen.value = true;
}

function onWorkOrderConfirmed() {
  // TODO(real-wiring): the OS creates the tasks here. Demo: mark approved.
  if (workOrderProposal.value) {
    turnStatus.value = {
      ...turnStatus.value,
      [workOrderProposal.value.id]: 'approved',
    };
    clearPreview();
  }
}

// "Pedir alternativa" — recompute → swap the proposal for its canned alt.
function requestAlternative(turn) {
  if (!turn.alt || !round.value) return;
  const idx = round.value.turns.findIndex(x => x.id === turn.id);
  if (idx === -1) return;
  // Replace the turn in place with its alternative (keeps debate order).
  const next = [...round.value.turns];
  next[idx] = turn.alt;
  round.value = { ...round.value, turns: next };
  // Preview the alternative's impact immediately.
  previewProposal(turn.alt);
  nextTick(() => {
    revealChildren('[data-alg-reveal-bubble]', { each: 0, y: 10 });
  });
}

function dismissProposal(turn) {
  turnStatus.value = { ...turnStatus.value, [turn.id]: 'dismissed' };
  clearPreview();
}

function statusFor(id) {
  return turnStatus.value[id] || 'open';
}

const previewingTurnId = computed(() => {
  // The previewed turn is whichever open proposal's projection is active.
  if (!activeProjection.value || !round.value) return null;
  const match = round.value.turns.find(
    tn => tn.projection === activeProjection.value
  );
  return match?.id || null;
});

// --- Entrance ---------------------------------------------------------------
const rootRef = ref(null);
const { revealChildren: revealRoot } = useAlgMotion(rootRef);
onMounted(() => {
  revealRoot('[data-alg-reveal-panel]', { each: 0.08, y: 16 });
});
</script>

<template>
  <main
    ref="rootRef"
    class="alg-cl-room alg-density-operational"
    :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.TITLE')"
  >
    <header class="alg-cl-room__header" data-alg-reveal-panel>
      <p class="alg-cl-room__eyebrow">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.SUBTITLE') }}
      </p>
      <h1 class="alg-cl-room__title">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.TITLE') }}
      </h1>
    </header>

    <div class="alg-cl-room__grid">
      <!-- E1 — Committee (left) -->
      <div
        class="alg-cl-room__col alg-cl-room__col--left"
        data-alg-reveal-panel
      >
        <CommitteePanel
          :directors="directors"
          :seated="seated"
          @toggle="toggleSeat"
        />
      </div>

      <!-- E2 — Debate flow (center) -->
      <section
        class="alg-cl-room__col alg-cl-room__col--center"
        data-alg-reveal-panel
        :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.ARIA_PANEL')"
      >
        <OpeningPrompt v-if="!hasRound" :goals="GOALS" @start="startRound" />

        <template v-else>
          <header class="alg-cl-room__round-head">
            <div>
              <p class="alg-cl-room__round-eyebrow">
                {{ t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.ROUND_EYEBROW') }}
              </p>
              <h2 class="alg-cl-room__round-title">{{ t(round.goalKey) }}</h2>
            </div>
            <button
              type="button"
              class="alg-btn alg-btn--ghost alg-btn--sm"
              @click="resetRound"
            >
              {{ t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.NEW_ROUND') }}
            </button>
          </header>

          <div ref="flowRef" class="alg-cl-room__flow" aria-live="polite">
            <p v-if="visibleTurns.length === 0" class="alg-cl-room__empty">
              {{ t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.NO_SEATS') }}
            </p>
            <DebateBubble
              v-for="turn in visibleTurns"
              :key="turn.id"
              :turn="turn"
              :director="directorById[turn.director]"
              :status="statusFor(turn.id)"
              :previewing="previewingTurnId === turn.id"
              @open-report="openReport"
              @approve="approveProposal(turn)"
              @alternative="requestAlternative(turn)"
              @dismiss="dismissProposal(turn)"
              @preview="previewProposal(turn)"
              @clear-preview="clearPreview"
            />
          </div>
        </template>
      </section>

      <!-- E3 — Impact Simulator (right) -->
      <div
        class="alg-cl-room__col alg-cl-room__col--right"
        data-alg-reveal-panel
      >
        <ImpactSimulator
          :projection="activeProjection"
          :preview-label="previewLabel"
        />
      </div>
    </div>

    <SourceReportModal v-model:open="reportModalOpen" :figure="activeFigure" />
    <WorkOrderModal
      v-model:open="workOrderOpen"
      :proposal="workOrderProposal"
      :director="
        workOrderProposal ? directorById[workOrderProposal.director] : null
      "
      @confirm="onWorkOrderConfirmed"
    />
  </main>
</template>

<style lang="scss" scoped>
.alg-cl-room {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: var(--alg-space-5);
  padding: var(--alg-space-6);
  background: var(--alg-bg);
  overflow: hidden;
}

.alg-cl-room__header {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
  flex: 0 0 auto;
}

.alg-cl-room__eyebrow {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-room__title {
  margin: 0;
  font-size: var(--alg-text-2xl);
  font-weight: 400;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-room__grid {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(
      280px,
      340px
    );
  gap: var(--alg-space-5);
  flex: 1 1 auto;
  min-height: 0;
}

.alg-cl-room__col {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.alg-cl-room__col--left,
.alg-cl-room__col--right {
  overflow-y: auto;
}

.alg-cl-room__col--center {
  background: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-lg);
  box-shadow: var(--alg-elevation-1);
  overflow: hidden;
}

.alg-cl-room__round-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--alg-space-4);
  padding: var(--alg-space-5) var(--alg-space-5) var(--alg-space-4);
  border-bottom: 1px solid var(--alg-border);
  flex: 0 0 auto;
}

.alg-cl-room__round-eyebrow {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-room__round-title {
  margin: 2px 0 0;
  font-size: var(--alg-text-lg);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-room__flow {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
  padding: var(--alg-space-5);
}

.alg-cl-room__empty {
  margin: auto;
  text-align: center;
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-tertiary);
  max-width: 36ch;
}

// ---- Responsive: stack panels below the 3-up desktop grid -----------------
@media (max-width: 1100px) {
  .alg-cl-room__grid {
    grid-template-columns: minmax(0, 1fr);
    grid-auto-rows: min-content;
    overflow-y: auto;
  }
  .alg-cl-room__col--center {
    min-height: 28rem;
  }
  .alg-cl-room__col--left,
  .alg-cl-room__col--right {
    overflow-y: visible;
  }
}

@media (max-width: 640px) {
  .alg-cl-room {
    padding: var(--alg-space-4);
  }
}
</style>
