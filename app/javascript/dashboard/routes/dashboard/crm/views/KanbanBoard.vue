<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §2 — Kanban surface root.
//
// Responsibility split:
//   - This component owns: data orchestration (pipeline + leads stores), the
//     server-Lead → presenter-Lead transform (name/time/aging state),
//     the drag coordinator wiring, the aria-live announcer, the move modal
//     state machine.
//   - StageColumn owns: per-column render + drop event surface.
//   - LeadCard owns: card-level a11y + menu trigger + channel iconography.
//
// The transform stays here (not inside LeadCard) so the presenter shape
// remains pure data — easier to test, easier to reason about, and one
// allocation per snapshot instead of one per render. The channel glyph is NOT
// part of the presenter: LeadCard derives its own inline-SVG channel icon from
// channel_origin (founder: no emoji in chrome).
import {
  computed,
  ref,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { algStagger } from 'dashboard/composables/algorythmo/useAlgMotion.js';
import {
  usePipelineStore,
  clearPipelineStoreForAccount,
} from 'dashboard/composables/algorythmo/usePipelineStore.js';
import {
  useLeadStore,
  clearLeadStoreForAccount,
} from 'dashboard/composables/algorythmo/useLeadStore.js';
import { useDragLead } from 'dashboard/composables/algorythmo/useDragLead.js';
import { useStageMetrics } from 'dashboard/composables/algorythmo/useStageMetrics.js';
import {
  elapsedSince,
  timeSinceLabel,
  humanizeDurationLongPtBr,
} from 'dashboard/helper/algorythmo/timeFormat.js';
import AlgToastContainer from 'dashboard/components-next/algorythmo/AlgToastContainer.vue';
import StageColumn from './components/StageColumn.vue';
import KanbanHeader from './components/KanbanHeader.vue';
import KanbanEmptyState from './components/KanbanEmptyState.vue';
import MoveLeadModal from './components/MoveLeadModal.vue';
import LeadCardMenu from './components/LeadCardMenu.vue';
import LeadDetailDrawer from './components/LeadDetailDrawer.vue';
import PipelineConfigPlaceholder from './PipelineConfigPlaceholder.vue';
import {
  DEMO_STAGES,
  DEMO_SUMMARY,
  DEMO_METRICS_BY_STAGE,
  DEMO_STAGE_COUNTS,
  buildDemoLeads,
} from './demoData.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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
const pipelineId = computed(() => pipelineStoreRef.value.pipeline.value?.id);

// Funnel observability (CONTRACT v1.2.0). Composable is account+pipeline-scoped
// via reactive args — a tenant switch (accountId watcher) calls reset() and
// then re-fetches against the new pipeline once loadPipeline() resolves. The
// `metrics` ref hydrates per stage and per summary; templates re-read the
// shape on every drag confirmation so numbers stay in lockstep with the board.
const stageMetrics = useStageMetrics(accountId, pipelineId);
const {
  summary: metricsSummary,
  loading: metricsLoading,
  error: metricsError,
  fetchMetrics: fetchStageMetrics,
  metricsForStage,
  reset: resetStageMetrics,
} = stageMetrics;

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

// ---------------------------------------------------------------------------
// Demonstration mode
// ---------------------------------------------------------------------------
// The board renders from the live backend. On a fresh account — and in every
// founder demo — the backend returns an empty pipeline (no stages) OR a
// configured pipeline that simply has no leads yet. In BOTH cases the surface
// would otherwise paint nothing (or the on-brand empty state), and the founder
// can't see the product. So we fall back to a self-contained demonstration
// board whenever there are ZERO real leads, regardless of whether stages exist.
// As soon as ≥1 real lead exists, the board switches to live data.
//
// Demo state is purely local: drag-moves mutate `demoLeadsRef` and never hit
// the API. A "DADOS DE DEMONSTRAÇÃO" watermark keeps the nature explicit (same
// convention as the sectors, D12).
const demoLeadsRef = ref(buildDemoLeads());

const liveHasStages = computed(() => stages.value.length > 0);

// Whether the initial per-stage lead fetch has completed for the current
// account. Gating demo on this (rather than a bare count === 0) avoids a demo
// flash in the window between "pipeline loaded" and "leads arrived": while the
// fetch is still in flight liveLeadCount is legitimately 0, but we must not
// declare the account empty until the leads actually came back.
const leadsFetched = ref(false);

// Total real leads currently held across all live stages. Reactive: stageMap
// and its per-stage `leads` arrays are reactive, so this recomputes as leads
// hydrate, move, or arrive via the realtime listener. This is the "0 real
// leads" signal that gates demo mode.
const liveLeadCount = computed(() =>
  stages.value.reduce((sum, s) => sum + leadsByStage(s.id).length, 0)
);

// Demo activates when the account has NO live pipeline configured (no stages —
// the common fresh-account case) OR has stages but ZERO real leads once the
// initial fetch has settled. A pipeline with ≥1 real lead always renders live
// data — we never overwrite a real, populated pipeline with demo data.
const demoActive = computed(() => {
  if (isPipelineLoading.value) return false;
  if (!liveHasStages.value) return true;
  return leadsFetched.value && liveLeadCount.value === 0;
});

const boardStages = computed(() =>
  demoActive.value ? DEMO_STAGES : stages.value
);

function demoLeadsByStage(stageId) {
  return demoLeadsRef.value.filter(l => l.stage_id === stageId);
}

function moveDemoLead(leadId, toStageId) {
  demoLeadsRef.value = demoLeadsRef.value.map(l =>
    l.id === leadId ? { ...l, stage_id: toStageId } : l
  );
}

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

// Pipeline-config reveal (C5). One paradigm, one behaviour: both the header gear
// and every per-column gear open the SAME inline config overlay over the board.
// No page navigation, no second config surface.
//
// The overlay declares role="dialog" + aria-modal, so it must behave like a
// modal: focus moves into the panel on open, Tab/Shift+Tab are trapped inside
// it, and focus returns to the trigger on close. Mirrors the AlgDrawer focus
// contract (adversarial review #111).
const configOpen = ref(false);
const configPanelRef = ref(null);
let configPreviousFocus = null;

function focusablesIn(el) {
  if (!el) return [];
  return Array.from(
    el.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function handleConfigKeydown(event) {
  if (event.key !== 'Tab') return;
  const focusables = focusablesIn(configPanelRef.value);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function openConfig() {
  if (configOpen.value) return;
  configPreviousFocus = document.activeElement;
  configOpen.value = true;
  // Move focus into the panel once the transition has mounted it.
  nextTick(() => {
    const focusables = focusablesIn(configPanelRef.value);
    if (focusables.length) focusables[0].focus();
  });
}

function closeConfig() {
  if (!configOpen.value) return;
  configOpen.value = false;
  // Restore focus to whatever opened the overlay (header or per-column gear).
  const target = configPreviousFocus;
  configPreviousFocus = null;
  nextTick(() => target?.focus?.());
}

function toggleConfig() {
  if (configOpen.value) {
    closeConfig();
  } else {
    openConfig();
  }
}

// Card entrance choreography (shared motion system). When the board first
// paints its cards we stagger them in — one curve, one reduced-motion contract.
// Guarded so it runs once per first paint, not on every reactive change (a drag
// or a search keystroke must not re-trigger the whole board fading in).
const boardRef = ref(null);
let cardsRevealed = false;
function revealCards() {
  if (cardsRevealed) return;
  const root = boardRef.value;
  if (!root) return;
  const cards = root.querySelectorAll('[data-testid="lead-card"]');
  if (!cards.length) return;
  cardsRevealed = true;
  algStagger(cards, { each: 0.035, y: 10 });
}

const drag = useDragLead({
  onMove: async ({ leadId, fromStageId, toStageId }) => {
    if (demoActive.value) {
      moveDemoLead(leadId, toStageId);
      return;
    }
    moveLeadOptimistic({ leadId, fromStageId, toStageId });
    try {
      await commitMove({ leadId, toStageId });
      // Funnel numbers depend on stage_histories transitions just emitted by
      // the move. Re-fetch so the header counters and the per-column chip
      // reflect the new reality on the next render. Fire-and-forget — the
      // server response carries a 60s cache, so a stale value for a few
      // hundred ms is acceptable; what matters is *eventual* consistency
      // between the board and the metrics chips.
      fetchStageMetrics();
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

// Esc closes the pipeline-config reveal (C5) — keyboard parity with the drawer.
// Routes through closeConfig() so focus is restored to the trigger.
function handleConfigEsc(event) {
  if (event.key === 'Escape' && configOpen.value) {
    closeConfig();
  }
}

onMounted(async () => {
  document.addEventListener('keydown', handleConfigEsc);
  // Demo cards (the common founder path) are in the DOM on first paint — reveal
  // them right away. Live cards reveal via the boardHasAnyLead watcher below.
  nextTick(revealCards);
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
  // Initial lead fetch settled — now a zero count is a real "empty account",
  // not a not-yet-loaded state, so demo mode can decide deterministically.
  leadsFetched.value = true;
  // Metrics fetch is fire-and-forget: it's secondary signal — the board is
  // usable without it. The chip falls back to "—" until the response lands.
  fetchStageMetrics();
  agingTimer = setInterval(() => {
    now.value = Date.now();
  }, AGING_TICK_MS);
});

onBeforeUnmount(() => {
  if (agingTimer !== null) clearInterval(agingTimer);
  agingTimer = null;
  document.removeEventListener('keydown', handleConfigEsc);
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
  // The new tenant's leads haven't been fetched yet — don't let the previous
  // account's "fetched" state make us flash demo (or hide it) prematurely.
  leadsFetched.value = false;
  menuOpen.value = false;
  menuLead.value = null;
  menuAnchor.value = null;
  moveModalOpen.value = false;
  moveModalLead.value = null;
  // The drawer's :key=accountId remounts the component on tenant switch so
  // useStageHistory rebinds to the new account; the explicit reset here is
  // just belt-and-suspenders: we never carry a previous tenant's lead into
  // the new account's drawer.
  drawerOpen.value = false;
  drawerLead.value = null;
  configOpen.value = false;
  configPreviousFocus = null;
  if (oldId && oldId !== newId) {
    clearLeadStoreForAccount(oldId);
    clearPipelineStoreForAccount(oldId);
  }
  // Drop the previous tenant's metrics immediately so the header doesn't
  // flash their numbers while the new pipeline loads.
  resetStageMetrics();
  await loadPipeline();
  await Promise.all(stages.value.map(s => fetchStage(s.id)));
  leadsFetched.value = true;
  fetchStageMetrics();
});

const demoStageById = computed(() => {
  const map = new Map();
  DEMO_STAGES.forEach(s => map.set(s.id, s));
  return map;
});

const presenterByStage = computed(() => {
  const snapshotNow = now.value;
  const needle = searchQuery.value.trim().toLowerCase();
  const out = new Map();
  const inDemo = demoActive.value;
  const lookup = inDemo ? demoStageById.value : stageById.value;
  boardStages.value.forEach(stage => {
    const leads = inDemo ? demoLeadsByStage(stage.id) : leadsByStage(stage.id);
    const presenters = leads.map(l =>
      toPresenter(l, lookup.get(l.stage_id) ?? stage, snapshotNow)
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

// Reveal live cards the first time the board actually has any (the demo path is
// handled in onMounted). One-shot via the cardsRevealed guard inside.
watch(boardHasAnyLead, has => {
  if (has) nextTick(revealCards);
});

// Global empty state. Now that demo mode activates on ZERO real leads (even
// when stages exist), this is effectively unreachable in the normal flow — the
// demo board replaces the empty state so the founder always sees a populated
// kanban. The guard is kept (defence in depth) and still short-circuits on
// demoActive: a live pipeline only shows the empty state if it somehow has
// stages + presenter leads === 0 while NOT in demo, which the demo gate now
// prevents.
const showGlobalEmpty = computed(
  () =>
    !isPipelineLoading.value &&
    !demoActive.value &&
    stages.value.length > 0 &&
    !boardHasAnyLead.value
);

const summaryForHeader = computed(() =>
  demoActive.value ? DEMO_SUMMARY : metricsSummary.value
);

const metricsLoadingForHeader = computed(() =>
  demoActive.value ? false : metricsLoading.value
);

const metricsErrorForHeader = computed(() =>
  demoActive.value ? null : metricsError.value
);

function metricsForStageOrDemo(stageId) {
  if (demoActive.value) return DEMO_METRICS_BY_STAGE[stageId] ?? null;
  return metricsForStage(stageId);
}

// In demo mode the column shows the full stage total (84/52/42/21) so the
// header pill agrees with the metrics chip and the funnel summary, even though
// only a sampled window of cards is rendered. Real pipelines return null and
// the column falls back to the actual card count.
function displayCountForStage(stageId) {
  return demoActive.value ? (DEMO_STAGE_COUNTS[stageId] ?? null) : null;
}

function findRawLead(leadId) {
  if (demoActive.value) {
    return demoLeadsRef.value.find(l => l.id === leadId) ?? null;
  }
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
  if (demoActive.value) {
    moveDemoLead(leadId, stage.id);
    announceText.value = t('ALGORYTHMO_CRM.ANNOUNCE.MOVED', {
      leadName: leadName(raw),
      stageName: stage.name,
    });
    return;
  }
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
    fetchStageMetrics();
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
    <span
      v-if="demoActive"
      class="alg-kanban__watermark"
      data-testid="kanban-demo-watermark"
      aria-hidden="true"
    >
      {{ t('ALGORYTHMO_CRM.KANBAN.DEMO_WATERMARK') }}
    </span>

    <KanbanHeader
      v-model:search-value="searchQuery"
      :summary="summaryForHeader"
      :loading="metricsLoadingForHeader"
      :error="metricsErrorForHeader"
      :config-open="configOpen"
      @toggle-config="toggleConfig"
    />

    <KanbanEmptyState v-if="showGlobalEmpty" />

    <div
      v-else
      ref="boardRef"
      class="alg-kanban__board"
      data-testid="kanban-board"
      role="region"
      :aria-label="t('ALGORYTHMO_CRM.KANBAN.BOARD_ARIA_LABEL')"
    >
      <StageColumn
        v-for="stage in boardStages"
        :key="stage.id"
        :stage="stage"
        :leads="presenterByStage.get(stage.id) ?? []"
        :board-has-any-lead="boardHasAnyLead"
        :is-drop-target="drag.hoveredStageId.value === stage.id"
        :metrics="metricsForStageOrDemo(stage.id)"
        :display-count="displayCountForStage(stage.id)"
        @drag-start="drag.start"
        @drag-enter="drag.enter"
        @drag-over="drag.over"
        @drag-leave="drag.leave"
        @drop="drag.drop"
        @drag-end="drag.end"
        @open-lead="handleOpenLead"
        @open-menu="handleOpenMenu"
        @configure-stage="openConfig"
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

    <!-- Pipeline-config reveal (C5) — overlay panel behind the header gear. -->
    <transition name="alg-config-scrim">
      <div
        v-if="configOpen"
        class="alg-kanban__config-scrim"
        aria-hidden="true"
        @click="closeConfig"
      />
    </transition>
    <transition name="alg-config-panel">
      <aside
        v-if="configOpen"
        ref="configPanelRef"
        class="alg-kanban__config-panel"
        data-testid="kanban-config-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="t('ALGORYTHMO_CRM.PIPELINE_CONFIG.PLACEHOLDER_TITLE')"
        @keydown="handleConfigKeydown"
      >
        <PipelineConfigPlaceholder
          embedded
          :stages="boardStages"
          @close="closeConfig"
        />
      </aside>
    </transition>

    <LeadCardMenu
      :open="menuOpen"
      :lead="menuLead"
      :anchor="menuAnchor"
      @close="closeMenu"
      @move="handleMenuMove"
    />

    <LeadDetailDrawer
      :key="accountId"
      v-model:open="drawerOpen"
      :lead="drawerLead"
      :account-id="accountId"
      :now="now"
      :demo-mode="demoActive"
      @close="handleDrawerClose"
    />

    <MoveLeadModal
      :open="moveModalOpen"
      :lead="moveModalLead"
      :stages="boardStages"
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
// Cinematic OS — operational density. The board IS the dark canvas; columns
// are zones of canvas, not white cards. The whole surface sits on --alg-bg
// (deep black) and a subtle grain overlay gives the void texture (DESIGN.md §7).
.alg-kanban {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--alg-bg);
  color: var(--alg-fg-primary);
}

// Grain — the same SVG noise token used by glass surfaces, at a whisper, so
// the dark canvas reads as a real material instead of flat #111.
.alg-kanban::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--alg-glass-grain);
  opacity: 0.4;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 0;
}

.alg-kanban > * {
  position: relative;
  z-index: 1;
}

// "DADOS DE DEMONSTRAÇÃO" — honest signal the board is illustrative, not live.
// Mono uppercase, quaternary opacity, top-right — present but never competing.
.alg-kanban__watermark {
  position: absolute;
  top: 0.75rem;
  right: 1.25rem;
  z-index: 2;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-quaternary);
  pointer-events: none;
}

.alg-kanban__board {
  display: flex;
  gap: var(--alg-density-operational-gap, 1rem);
  padding: var(--alg-density-operational-padding, 1.5rem);
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

// Pipeline-config reveal (C5) — scrim + right-docked panel over the board.
.alg-kanban__config-scrim {
  position: absolute;
  inset: 0;
  z-index: 5;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.alg-kanban__config-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 6;
  width: min(26rem, 100%);
  display: flex;
}

.alg-kanban__config-panel > * {
  width: 100%;
}

// Enter/exit — cinematic curve, slide from the right (mirrors the lead drawer).
.alg-config-scrim-enter-active,
.alg-config-scrim-leave-active {
  transition: opacity var(--alg-duration-base, 240ms) var(--alg-ease-cinematic);
}
.alg-config-scrim-enter-from,
.alg-config-scrim-leave-to {
  opacity: 0;
}

.alg-config-panel-enter-active {
  transition: transform var(--alg-duration-slow, 340ms)
    var(--alg-ease-cinematic);
}
.alg-config-panel-leave-active {
  transition: transform var(--alg-duration-base, 240ms)
    var(--alg-ease-cinematic);
}
.alg-config-panel-enter-from,
.alg-config-panel-leave-to {
  transform: translateX(100%);
}

@media (prefers-reduced-motion: reduce) {
  .alg-config-panel-enter-active,
  .alg-config-panel-leave-active {
    transition: none;
  }
}
</style>
