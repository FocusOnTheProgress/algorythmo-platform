<script setup>
// algorythmo: Brain screen (plan 0012 — founder-approved layout).
//
// Layout (approved): Aurora identity strip at the TOP (contained, never the
// dominating sphere), with LIVE stats — then dense data below in tabs:
//   Ver        — real document inventory + counts (compiled_truth + documents)
//   Ajustar    — upload + paste, wired to the real ingestion pipeline
//   Histórico  — vertical timeline of how the brain grew (timeline)
//
// This replaces the old "Aquário" hub, which let the orb dominate a canvas of
// FAKE demonstration data (the founder's rejection). The orb's approved fidelity
// is preserved in BrainHeader; everything below is real motor data with honest
// empty/loading/error states. No fixture: empty is empty.
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { brainService } from './brain.service';
import BrainHeader from './BrainHeader.vue';
import BrainTabVer from './BrainTabVer.vue';
import BrainTabAjustar from './BrainTabAjustar.vue';
import BrainTabHistorico from './BrainTabHistorico.vue';

const { t } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');

const TABS = [
  { id: 'ver', key: 'VER' },
  { id: 'ajustar', key: 'AJUSTAR' },
  { id: 'historico', key: 'HISTORICO' },
];
const activeTab = ref('ver');

// ── Compiled truth (header stats) ──────────────────────────────────────────────
const stats = ref(null);
const statsLoading = ref(false);

// ── Documents (Ver) ────────────────────────────────────────────────────────────
const documents = ref([]);
const documentsLoading = ref(false);
const documentsError = ref(false);

// ── Timeline (Histórico) ────────────────────────────────────────────────────────
const events = ref([]);
const timelineLoading = ref(false);
const timelineError = ref(false);

// Most-recent event timestamp → the header's "cresceu há Xd".
const lastGrewAt = computed(() => events.value[0]?.occurred_at || null);

async function loadStats(id) {
  if (!id) return;
  statsLoading.value = true;
  try {
    stats.value = await brainService.fetchCompiledTruth(id);
  } catch (_e) {
    // The header degrades to honest zeros; auth errors still bubble via interceptor.
    stats.value = null;
  } finally {
    statsLoading.value = false;
  }
}

async function loadDocuments(id) {
  if (!id) return;
  documentsLoading.value = true;
  documentsError.value = false;
  try {
    const data = await brainService.fetchDocuments(id);
    documents.value = data?.documents || [];
  } catch (_e) {
    documentsError.value = true;
    documents.value = [];
  } finally {
    documentsLoading.value = false;
  }
}

async function loadTimeline(id) {
  if (!id) return;
  timelineLoading.value = true;
  timelineError.value = false;
  try {
    const data = await brainService.fetchTimeline(id);
    events.value = data?.data || [];
  } catch (_e) {
    timelineError.value = true;
    events.value = [];
  } finally {
    timelineLoading.value = false;
  }
}

function loadAll(id) {
  loadStats(id);
  loadDocuments(id);
  loadTimeline(id);
}

// After an ingestion (upload or paste), refresh the inventory + counts so the
// new document appears in Ver and the header tick up — the door is live.
function onIngested() {
  loadDocuments(accountId.value);
  loadStats(accountId.value);
  loadTimeline(accountId.value);
}

onMounted(() => {
  if (accountId.value) loadAll(accountId.value);
});

watch(accountId, id => {
  if (id) loadAll(id);
});
</script>

<template>
  <div class="alg-brain-page">
    <BrainHeader
      :stats="stats"
      :is-loading="statsLoading"
      :last-grew-at="lastGrewAt"
    />

    <!-- Tabs -->
    <div
      class="alg-brain-tabs"
      role="tablist"
      :aria-label="t('ALGORYTHMO_BRAIN.TABS.ARIA_LABEL')"
    >
      <button
        v-for="tab in TABS"
        :id="`alg-brain-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="alg-brain-tab"
        :class="{ 'alg-brain-tab--active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`alg-brain-panel-${tab.id}`"
        @click="activeTab = tab.id"
      >
        {{ t(`ALGORYTHMO_BRAIN.TABS.${tab.key}`) }}
      </button>
    </div>

    <!-- Panels -->
    <div class="alg-brain-panel">
      <div
        v-show="activeTab === 'ver'"
        id="alg-brain-panel-ver"
        role="tabpanel"
        aria-labelledby="alg-brain-tab-ver"
      >
        <BrainTabVer
          :documents="documents"
          :is-loading="documentsLoading"
          :has-error="documentsError"
          @retry="loadDocuments(accountId)"
        />
      </div>

      <div
        v-show="activeTab === 'ajustar'"
        id="alg-brain-panel-ajustar"
        role="tabpanel"
        aria-labelledby="alg-brain-tab-ajustar"
      >
        <BrainTabAjustar :account-id="accountId" @ingested="onIngested" />
      </div>

      <div
        v-show="activeTab === 'historico'"
        id="alg-brain-panel-historico"
        role="tabpanel"
        aria-labelledby="alg-brain-tab-historico"
      >
        <BrainTabHistorico
          :events="events"
          :is-loading="timelineLoading"
          :has-error="timelineError"
          @retry="loadTimeline(accountId)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.alg-brain-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: var(--alg-space-5);
  padding: var(--alg-space-6);
  overflow: hidden;
}

// ── Tabs ───────────────────────────────────────────────────────────────────────
.alg-brain-tabs {
  display: flex;
  align-items: center;
  gap: var(--alg-space-1);
  flex: none;
  border-bottom: 1px solid var(--alg-border);
}

.alg-brain-tab {
  position: relative;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-snug);
  padding: var(--alg-space-3) var(--alg-space-4);
  min-height: 40px;
  background: transparent;
  border: none;
  color: var(--alg-fg-tertiary);
  cursor: pointer;
  transition: color var(--alg-duration-fast) var(--alg-ease-cinematic);

  // Active underline — hairline, brand-tinted; the tell sits under the label.
  &::after {
    content: '';
    position: absolute;
    left: var(--alg-space-4);
    right: var(--alg-space-4);
    bottom: -1px;
    height: 2px;
    border-radius: var(--alg-radius-pill);
    background: var(--alg-color-brand-primary);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform var(--alg-duration-base) var(--alg-ease-cinematic);
  }

  &:hover {
    color: var(--alg-fg-secondary);
  }

  &--active {
    color: var(--alg-fg-primary);

    &::after {
      transform: scaleX(1);
    }
  }

  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
    border-radius: var(--alg-radius-sm);
  }
}

// ── Panel ──────────────────────────────────────────────────────────────────────
.alg-brain-panel {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;

  // Each panel wrapper flexes so the tab content can fill the scroll area.
  > [role='tabpanel'] {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }
}

@media (max-width: 768px) {
  .alg-brain-page {
    padding: var(--alg-space-4);
    gap: var(--alg-space-4);
  }
}
</style>
