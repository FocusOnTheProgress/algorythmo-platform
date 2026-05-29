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

// Aquarium-only. The Brain landing IS the Aurora knowledge hub — the disabled
// Ajustes / Histórico / Config tabs were removed (they shipped greyed-out and
// added chrome with no payload). Future surfaces ship as their own routes.

// isLoading starts FALSE: the hub is frontend-only demo data and needs no fetch
// to render. The compiled-truth fetch may drive a brief loading state, but it
// must NEVER gate the hub — on a tenant where the account id isn't hydrated at
// mount, loadBrain never runs, isLoading stays false, and the Aquário renders
// immediately (no forever spinner). The fetch only flips this true→false while
// a real request is genuinely in flight.
const isLoading = ref(false);

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
