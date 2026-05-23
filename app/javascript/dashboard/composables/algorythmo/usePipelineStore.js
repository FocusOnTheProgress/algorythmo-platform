import { shallowRef, readonly, computed } from 'vue';
import { fetchDefaultPipeline } from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// Pipeline store — per-account singleton.
// Keyed by accountId to prevent data bleed across accounts.
// ---------------------------------------------------------------------------

/** @type {Map<string, { pipeline: import('vue').ShallowRef, stages: import('vue').ShallowRef, isLoading: import('vue').ShallowRef, error: import('vue').ShallowRef }>} */
const cacheByAccount = new Map();

function getOrCreateCache(accountId) {
  const key = String(accountId);
  if (!cacheByAccount.has(key)) {
    cacheByAccount.set(key, {
      pipeline: shallowRef(null),
      stages: shallowRef([]),
      isLoading: shallowRef(false),
      error: shallowRef(null),
    });
  }
  return cacheByAccount.get(key);
}

/**
 * Composable for the default pipeline (stages list, pipeline metadata).
 * Shared state per-account — any component calling with the same accountId
 * gets the same reactive refs.
 *
 * @param {string|number} accountId
 */
export function usePipelineStore(accountId) {
  const { pipeline, stages, isLoading, error } = getOrCreateCache(accountId);

  const pipelineLoaded = computed(() => pipeline.value !== null);

  const stageById = computed(() => {
    const map = new Map();
    stages.value.forEach(s => map.set(s.id, s));
    return map;
  });

  async function loadPipeline() {
    if (pipeline.value !== null) return;

    isLoading.value = true;
    error.value = null;

    // Race-condition guard: capture the account we're loading for.
    // If the composable is called again for a different account mid-flight,
    // each call has its own cache entry, so no cross-account overwrite.
    const loadingFor = String(accountId);
    try {
      const res = await fetchDefaultPipeline(accountId);
      // Guard: if this cache entry was cleared (account switch) while in
      // flight, a new entry was created and we should not write to a stale one.
      if (!cacheByAccount.has(loadingFor)) return;
      pipeline.value = res.data.pipeline;
      stages.value = res.data.stages ?? [];
    } catch (err) {
      error.value = err?.response?.data?.message ?? err.message;
      // eslint-disable-next-line no-console
      console.error('algorythmo:pipeline-load-failed', err);
    } finally {
      isLoading.value = false;
    }
  }

  function updateStageName(stageId, name) {
    stages.value = stages.value.map(s =>
      s.id === stageId ? { ...s, name } : s
    );
  }

  function updateStageCoefficient(stageId, agingCoefficient) {
    stages.value = stages.value.map(s =>
      s.id === stageId ? { ...s, aging_coefficient: agingCoefficient } : s
    );
  }

  return {
    pipeline: readonly(pipeline),
    stages: readonly(stages),
    isLoading: readonly(isLoading),
    error: readonly(error),
    pipelineLoaded,
    stageById,
    loadPipeline,
    updateStageName,
    updateStageCoefficient,
  };
}

/**
 * Clear pipeline cache for a given account (call on account switch).
 * @param {string|number} accountId
 */
export function clearPipelineStoreForAccount(accountId) {
  cacheByAccount.delete(String(accountId));
}
