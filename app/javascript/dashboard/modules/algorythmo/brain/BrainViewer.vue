<script setup>
// algorythmo: M8a — Brain Aquário landing page.
// Tab "Aquário" is the default landing per plan 0005 §M8a. Empty state still
// renders the 3-step onboarding when there's no compiled truth yet.
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { brainService } from './brain.service';
import BrainEmptyState from './BrainEmptyState.vue';
import BrainAquario from './BrainAquario.vue';
import BrainDocumentUpload from './BrainDocumentUpload.vue';

const { t } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');

// Aquário + Documentos active Day-1. Remaining tabs ship gated.
const TABS = [
  { id: 'viewer', labelKey: 'ALGORYTHMO_BRAIN.TABS.VIEWER', active: true },
  { id: 'upload', labelKey: 'ALGORYTHMO_BRAIN.TABS.UPLOAD', active: true },
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
const isLoading = ref(true);
const loadError = ref(null);

// CRLF-safe YAML frontmatter strip. Closing `---` on its own line.
const bodyContent = computed(() => {
  const raw = compiledTruth.value?.content ?? '';
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
});

// Onboarding state when there's no compiled truth yet (founder hasn't pasted
// the first instruction).
const isEmpty = computed(
  () => !isLoading.value && !loadError.value && !bodyContent.value
);

// Fetch when accountId is ready. On hard reload the Vuex getter resolves
// after mount — watch + immediate covers both ordering cases.
async function loadBrain(id) {
  if (!id) return;
  isLoading.value = true;
  loadError.value = null;
  try {
    compiledTruth.value = await brainService.fetchCompiledTruth(id);
  } catch (_e) {
    loadError.value = t('ALGORYTHMO_BRAIN.VIEWER.ERROR');
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  if (accountId.value) loadBrain(accountId.value);
});

watch(accountId, id => {
  if (id) loadBrain(id);
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

    <!-- Active tab content — M8a (aquário) / M8b (upload) per plan 0005 §M8 -->
    <template v-else>
      <BrainDocumentUpload v-if="activeTab === 'upload'" />
      <BrainEmptyState v-else-if="isEmpty" />
      <BrainAquario v-else />
    </template>
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
</style>
