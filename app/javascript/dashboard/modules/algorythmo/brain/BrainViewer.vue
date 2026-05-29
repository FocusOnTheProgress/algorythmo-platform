<script setup>
// algorythmo: Brain "Aquário" landing page.
//
// The Aquário tab IS the Aurora knowledge hub (BrainAquario.vue) — a
// frontend-only demo showpiece (AlgAuroraOrb + glass knowledge-layer tiles).
// It does NOT depend on the Brain backend: on the founder's single-tenant
// instance the compiled-truth fetch fails (no brain backend configured), and
// previously that error short-circuited the whole tab into a "Could not load
// Brain" screen, hiding the hub entirely. Mirroring the CRM demo-board
// philosophy, a failed OR empty load now simply shows the illustrative hub —
// real data replaces the demo once the backend ships. We still attempt the
// fetch so a brief, honest loading state shows on first paint, but its outcome
// no longer gates whether the hub renders.
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import { brainService } from './brain.service';
import BrainAquario from './BrainAquario.vue';

const { t } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');

// Only the first tab is active Day-1. Future tabs ship gated.
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

const isLoading = ref(true);

// Attempt the compiled-truth fetch only to drive a brief loading state on first
// paint. The hub is frontend-only, so a failure (the common case on the
// founder's tenant) is swallowed — the Aquário still renders its demo hub.
async function loadBrain(id) {
  if (!id) return;
  isLoading.value = true;
  try {
    await brainService.fetchCompiledTruth(id);
  } catch (_e) {
    // No-op: a failed/empty load is expected until the brain backend ships.
    // The Aurora hub is illustrative and renders regardless.
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

    <!-- Loading — brief, only while the first fetch is in flight. -->
    <div v-if="isLoading" class="alg-brain-loading" aria-live="polite">
      <span
        class="i-lucide-loader-circle alg-brain-loading__icon"
        aria-hidden="true"
      />
      <span>{{ t('ALGORYTHMO_BRAIN.VIEWER.LOADING') }}</span>
    </div>

    <!-- Aurora knowledge hub — frontend demo showpiece. Renders regardless of
         the backend load outcome (a failed/empty fetch shows the demo hub, not
         an error screen) — same philosophy as the CRM demo board. -->
    <BrainAquario v-else />
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

// ── Loading ───────────────────────────────────────────────────────────────────

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
</style>
