<script setup>
// algorythmo: M3-PR3 — Brain Viewer landing page
// D-D2: Viewer is the default landing (Compiled Truth + Timeline snapshot).
// D-D3: Empty state with 3-step onboarding when no content exists yet.
// Backend stub: brainService falls back to fixtures when API returns 501
// (PR M3-4 not yet merged). See brain.service.js for fallback logic.
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { brainService } from './brain.service';
import BrainEmptyState from './BrainEmptyState.vue';

const { t } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');

// Tab definitions. Only Viewer is active Day-1.
const TABS = [
  { id: 'viewer', labelKey: 'ALGORYTHMO_BRAIN.TABS.VIEWER', active: true },
  { id: 'ajustes', labelKey: 'ALGORYTHMO_BRAIN.TABS.AJUSTES', active: false },
  {
    id: 'historico',
    labelKey: 'ALGORYTHMO_BRAIN.TABS.HISTORICO',
    active: false,
  },
  { id: 'config', labelKey: 'ALGORYTHMO_BRAIN.TABS.CONFIG', active: false },
];

const activeTab = ref('viewer');

const compiledTruth = ref(null);
const timeline = ref([]);
const isLoading = ref(true);
const loadError = ref(null);

const isEmpty = computed(
  () => !isLoading.value && !loadError.value && !compiledTruth.value?.content
);

// Strip YAML frontmatter before rendering (lines between leading --- pairs).
const bodyContent = computed(() => {
  const raw = compiledTruth.value?.content ?? '';
  return raw.replace(/^---[\s\S]*?---\n?/, '').trim();
});

// Format ISO timestamp to localized short date+time.
function formatTimestamp(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function eventTypeLabel(type) {
  const map = {
    adjustment: t('ALGORYTHMO_BRAIN.TIMELINE.TYPE_ADJUSTMENT'),
    dream_cycle: t('ALGORYTHMO_BRAIN.TIMELINE.TYPE_DREAM_CYCLE'),
    snapshot: t('ALGORYTHMO_BRAIN.TIMELINE.TYPE_SNAPSHOT'),
  };
  return map[type] ?? type;
}

onMounted(async () => {
  try {
    const [truthData, timelineData] = await Promise.all([
      brainService.fetchCompiledTruth(accountId.value),
      brainService.fetchTimeline(accountId.value),
    ]);
    compiledTruth.value = truthData;
    timeline.value = timelineData?.events ?? [];
  } catch (err) {
    loadError.value = t('ALGORYTHMO_BRAIN.VIEWER.ERROR');
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <div class="alg-brain-page">
    <!-- Tab bar -->
    <nav
      class="alg-brain-tabs"
      role="tablist"
      :aria-label="t('ALGORYTHMO_BRAIN.SIDEBAR.BRAIN')"
    >
      <button
        v-for="tab in TABS"
        :key="tab.id"
        role="tab"
        class="alg-brain-tabs__tab"
        :class="{
          'alg-brain-tabs__tab--active': activeTab === tab.id,
          'alg-brain-tabs__tab--disabled': !tab.active,
        }"
        :aria-selected="activeTab === tab.id"
        :aria-disabled="!tab.active ? 'true' : undefined"
        :title="
          !tab.active ? t('ALGORYTHMO_BRAIN.TABS.COMING_SOON') : undefined
        "
        :tabindex="!tab.active ? -1 : 0"
        @click="tab.active && (activeTab = tab.id)"
      >
        {{ t(tab.labelKey) }}
        <span v-if="!tab.active" class="alg-brain-tabs__soon">
          {{ t('ALGORYTHMO_BRAIN.TABS.COMING_SOON') }}
        </span>
      </button>
    </nav>

    <!-- Loading -->
    <div v-if="isLoading" class="alg-brain-loading" aria-live="polite">
      <span
        class="i-lucide-loader-circle alg-brain-loading__icon"
        aria-hidden="true"
      />
      <span>{{ t('ALGORYTHMO_BRAIN.VIEWER.LOADING') }}</span>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="alg-brain-error" role="alert">
      <span class="i-lucide-circle-alert" aria-hidden="true" />
      {{ loadError }}
    </div>

    <!-- Viewer layout -->
    <div v-else class="alg-brain-viewer">
      <!-- Compiled Truth — 70% column -->
      <section
        class="alg-brain-truth"
        :aria-label="t('ALGORYTHMO_BRAIN.VIEWER.TRUTH_ARIA_LABEL')"
      >
        <template v-if="isEmpty">
          <BrainEmptyState />
        </template>
        <template v-else>
          <header class="alg-brain-truth__header">
            <h1 class="alg-brain-truth__heading">
              {{ t('ALGORYTHMO_BRAIN.VIEWER.HEADING') }}
            </h1>
            <p class="alg-brain-truth__subheading">
              {{ t('ALGORYTHMO_BRAIN.VIEWER.SUBHEADING') }}
            </p>
          </header>
          <!-- white-space: pre-wrap preserves newlines without XSS surface -->
          <div class="alg-compiled-truth">{{ bodyContent }}</div>
        </template>
      </section>

      <!-- Timeline — 30% column -->
      <aside
        class="alg-brain-timeline"
        :aria-label="t('ALGORYTHMO_BRAIN.VIEWER.TIMELINE_ARIA_LABEL')"
      >
        <h3 class="alg-brain-timeline__heading">
          {{ t('ALGORYTHMO_BRAIN.VIEWER.TIMELINE_HEADING') }}
        </h3>
        <ol
          class="alg-brain-timeline__list"
          :aria-label="t('ALGORYTHMO_BRAIN.VIEWER.TIMELINE_LIST_ARIA_LABEL')"
        >
          <li
            v-for="event in timeline"
            :key="event.id"
            class="alg-timeline-event"
          >
            <div class="alg-timeline-event__connector" aria-hidden="true" />
            <div class="alg-timeline-event__content">
              <time
                class="alg-timeline-event__time"
                :datetime="event.timestamp"
              >
                {{ formatTimestamp(event.timestamp) }}
              </time>
              <span class="alg-timeline-event__type-chip">
                {{ eventTypeLabel(event.type) }}
              </span>
              <p class="alg-timeline-event__preview">{{ event.preview }}</p>
            </div>
          </li>
        </ol>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Dark-first. Light mode falls back via design system token cascade.

.alg-brain-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: var(--space-large, 1.5rem);
  overflow: hidden;
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

.alg-brain-tabs {
  display: flex;
  gap: var(--space-smaller, 0.25rem);
  border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  margin-bottom: var(--space-large, 1.5rem);
  flex-shrink: 0;
}

.alg-brain-tabs__tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-smaller, 0.25rem);
  padding: var(--space-small, 0.5rem) var(--space-normal, 1rem);
  font-size: var(--font-size-small, 0.75rem);
  font-weight: 500;
  color: var(--color-body, rgba(255, 255, 255, 0.55));
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  border-radius: var(--border-radius-small, 4px) var(--border-radius-small, 4px)
    0 0;
  transition:
    color 120ms ease,
    border-color 120ms ease;
  white-space: nowrap;

  &:focus-visible {
    outline: 2px solid var(--color-woot, #6c4de5);
    outline-offset: 2px;
  }

  &--active {
    color: var(--color-woot, #6c4de5);
    border-bottom-color: var(--color-woot, #6c4de5);
  }

  &--disabled {
    cursor: default;
    opacity: 0.45;

    &:hover .alg-brain-tabs__soon {
      opacity: 1;
      pointer-events: auto;
    }
  }
}

.alg-brain-tabs__soon {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: 100px;
  background: var(--color-border, rgba(255, 255, 255, 0.08));
  color: var(--color-body, rgba(255, 255, 255, 0.4));
  letter-spacing: 0.02em;
  text-transform: lowercase;
  opacity: 0;
  transition: opacity 150ms ease;
  pointer-events: none;
}

// ── Loading / Error ───────────────────────────────────────────────────────────

.alg-brain-loading {
  display: flex;
  align-items: center;
  gap: var(--space-small, 0.5rem);
  padding: var(--space-large, 1.5rem) 0;
  font-size: var(--font-size-small, 0.75rem);
  color: var(--color-body, rgba(255, 255, 255, 0.45));
}

.alg-brain-loading__icon {
  width: 1rem;
  height: 1rem;
  animation: alg-spin 1s linear infinite;
}

@keyframes alg-spin {
  to {
    transform: rotate(360deg);
  }
}

.alg-brain-error {
  display: flex;
  align-items: center;
  gap: var(--space-small, 0.5rem);
  padding: var(--space-normal, 1rem);
  border-radius: var(--border-radius-normal, 6px);
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  font-size: var(--font-size-small, 0.75rem);
}

// ── Viewer layout ─────────────────────────────────────────────────────────────

.alg-brain-viewer {
  display: grid;
  grid-template-columns: 1fr 0.43fr;
  gap: var(--space-large, 1.5rem) var(--space-larger, 2rem);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

// ── Compiled Truth ────────────────────────────────────────────────────────────

.alg-brain-truth {
  overflow-y: auto;
  min-height: 0;
  padding-right: var(--space-small, 0.5rem);
}

.alg-brain-truth__header {
  margin-bottom: var(--space-large, 1.5rem);
}

.alg-brain-truth__heading {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: clamp(1.25rem, 2.5vw, 1.75rem);
  font-weight: 600;
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--color-heading, #fff);
  margin: 0 0 var(--space-smaller, 0.25rem);
}

.alg-brain-truth__subheading {
  font-size: var(--font-size-small, 0.75rem);
  color: var(--color-body, rgba(255, 255, 255, 0.45));
  margin: 0;
  line-height: 1.5;
}

// Design system class referenced in plan §9.
// white-space: pre-wrap preserves newlines from raw markdown body
// without introducing an XSS surface (Vue escapes the text binding).
.alg-compiled-truth {
  font-size: var(--font-size-default, 0.875rem);
  line-height: 1.75;
  color: var(--color-body, rgba(255, 255, 255, 0.82));
  max-width: 65ch;
  word-break: break-word;
  white-space: pre-wrap;
}

// ── Timeline ──────────────────────────────────────────────────────────────────

.alg-brain-timeline {
  overflow-y: auto;
  min-height: 0;
  border-left: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  padding-left: var(--space-large, 1.5rem);
}

.alg-brain-timeline__heading {
  font-size: var(--font-size-small, 0.75rem);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-body, rgba(255, 255, 255, 0.4));
  margin: 0 0 var(--space-normal, 1rem);
}

.alg-brain-timeline__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

// Design system class referenced in plan §9.
.alg-timeline-event {
  position: relative;
  display: grid;
  grid-template-columns: 1px 1fr;
  gap: 0 var(--space-normal, 1rem);
  padding-bottom: var(--space-large, 1.5rem);

  &:last-child {
    padding-bottom: 0;

    .alg-timeline-event__connector::after {
      display: none;
    }
  }
}

.alg-timeline-event__connector {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-woot, #6c4de5);
    flex-shrink: 0;
    margin-top: 3px;
    position: relative;
    z-index: 1;
    transform: translateX(-3px);
  }

  &::after {
    content: '';
    position: absolute;
    top: 10px;
    bottom: 0;
    left: 0;
    width: 1px;
    background: var(--color-border, rgba(255, 255, 255, 0.08));
  }
}

.alg-timeline-event__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-smaller, 0.25rem);
}

.alg-timeline-event__time {
  font-size: 11px;
  color: var(--color-body, rgba(255, 255, 255, 0.35));
  font-variant-numeric: tabular-nums;
  display: block;
}

.alg-timeline-event__type-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  background: var(--color-border, rgba(255, 255, 255, 0.08));
  color: var(--color-body, rgba(255, 255, 255, 0.55));
  width: fit-content;
  text-transform: lowercase;
}

.alg-timeline-event__preview {
  font-size: var(--font-size-small, 0.75rem);
  color: var(--color-body, rgba(255, 255, 255, 0.65));
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
