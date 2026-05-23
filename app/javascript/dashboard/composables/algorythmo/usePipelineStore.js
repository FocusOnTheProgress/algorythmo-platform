import { shallowRef, readonly, computed } from 'vue';
import { fetchDefaultPipeline } from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// Pipeline store — singleton, process-scoped.
// Caches the default pipeline + stages for the current account.
// Reset on accountId change (rare: multi-account tab switching).
// ---------------------------------------------------------------------------

const pipeline = shallowRef(null);
const stages = shallowRef([]);
const isLoading = shallowRef(false);
const error = shallowRef(null);
let cachedAccountId = null;

/**
 * Composable for the default pipeline (stages list, pipeline metadata).
 * Shared state — any component that calls this gets the same reactive refs.
 *
 * @param {string|number} accountId
 */
export function usePipelineStore(accountId) {
  const pipelineLoaded = computed(() => pipeline.value !== null);

  const stageById = computed(() => {
    const map = new Map();
    stages.value.forEach(s => map.set(s.id, s));
    return map;
  });

  async function loadPipeline() {
    // Skip if already loaded for this account.
    if (cachedAccountId === String(accountId) && pipeline.value !== null)
      return;

    isLoading.value = true;
    error.value = null;
    try {
      const res = await fetchDefaultPipeline(accountId);
      pipeline.value = res.data.pipeline;
      stages.value = res.data.stages ?? [];
      cachedAccountId = String(accountId);
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
