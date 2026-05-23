import { shallowRef, readonly, computed } from 'vue';
import { fetchDefaultPipeline } from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// Pipeline store — per-account singleton.
// Keyed by accountId to prevent data bleed across accounts.
// ---------------------------------------------------------------------------

/**
 * @typedef {{ pipeline: import('vue').ShallowRef, stages: import('vue').ShallowRef, isLoading: import('vue').ShallowRef, error: import('vue').ShallowRef, inflight: Promise|null }} PipelineEntry
 * @type {Map<string, PipelineEntry>}
 */
const cacheByAccount = new Map();

function getOrCreateCache(accountId) {
  const key = String(accountId);
  if (!cacheByAccount.has(key)) {
    cacheByAccount.set(key, {
      pipeline: shallowRef(null),
      stages: shallowRef([]),
      isLoading: shallowRef(false),
      error: shallowRef(null),
      inflight: null,
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
  const entry = getOrCreateCache(accountId);
  const { pipeline, stages, isLoading, error } = entry;

  const pipelineLoaded = computed(() => pipeline.value !== null);

  const stageById = computed(() => {
    const map = new Map();
    stages.value.forEach(s => map.set(s.id, s));
    return map;
  });

  async function loadPipeline() {
    if (pipeline.value !== null) return;
    // Dedup: if a fetch is already in flight, await it so the caller waits
    // for the shared result without firing a second network request.
    if (entry.inflight) {
      await entry.inflight;
      return;
    }

    isLoading.value = true;
    error.value = null;

    const loadingFor = String(accountId);

    // Capture the promise before assigning to entry so await uses the same
    // reference even after entry.inflight is cleared in .finally().
    const inflight = fetchDefaultPipeline(accountId)
      .then(res => {
        // Identity guard: if the cache entry was cleared and re-created while
        // this fetch was in flight, `entry` is now an orphan. Bail out.
        const current = cacheByAccount.get(loadingFor);
        if (!current || current !== entry) return;
        pipeline.value = res.data.pipeline;
        stages.value = res.data.stages ?? [];
      })
      .catch(err => {
        const current = cacheByAccount.get(loadingFor);
        if (!current || current !== entry) return;
        error.value = err?.response?.data?.message ?? err.message;
        // eslint-disable-next-line no-console
        console.error('algorythmo:pipeline-load-failed', err);
      })
      .finally(() => {
        entry.inflight = null;
        isLoading.value = false;
      });

    entry.inflight = inflight;
    await inflight;
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
