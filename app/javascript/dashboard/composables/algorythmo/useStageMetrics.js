// algorythmo: feature-gate algorythmo_crm
// useStageMetrics — funnel observability composable for the Kanban surface.
//
// Why per-instance (not singleton): the Kanban surface owns one composable per
// mount; the route component re-mounts on tenant switch, so an account-scoped
// instance never carries another tenant's metrics. Mirrors useStageHistory.
//
// Why a monotonic call-token: drag-and-drop fires `fetchMetrics()` after every
// drop, on top of the initial mount fetch. Multiple in-flight requests are
// expected; only the most recent should hydrate the ref. A stale earlier
// response, arriving after a newer one, would otherwise paint old numbers
// over fresh ones for ~one render before the next drop corrected them.
//
// Polling is intentionally absent: the surface decides when to fetch (mount
// + post-drop). A 60s server cache plus drop-triggered refetch is the right
// granularity for an MVP — interactive yet kind to Redis.

import { ref, computed, unref } from 'vue';
import { fetchPipelineMetrics } from 'dashboard/helper/algorythmo/leadApi.js';

/**
 * Accepts either plain values or refs/getters — unref() on each call so a
 * tenant switch (accountId ref changes) or a deferred pipeline load
 * (pipelineId becomes non-null after loadPipeline resolves) is picked up
 * automatically without re-instantiating the composable.
 *
 * @param {string|number|import('vue').Ref} accountId
 * @param {string|number|import('vue').Ref} pipelineId
 */
export function useStageMetrics(accountId, pipelineId) {
  const metrics = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const lastFetchedAt = ref(null);

  let callSeq = 0;

  async function fetchMetrics() {
    const accId = unref(accountId);
    const pipId = unref(pipelineId);
    if (accId == null || pipId == null) return;
    callSeq += 1;
    const myCall = callSeq;
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchPipelineMetrics(accId, pipId);
      if (myCall !== callSeq) return;
      metrics.value = res?.data ?? null;
      lastFetchedAt.value = Date.now();
    } catch (err) {
      if (myCall !== callSeq) return;
      error.value =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'fetch_failed';
    } finally {
      if (myCall === callSeq) loading.value = false;
    }
  }

  function metricsForStage(stageId) {
    const stages = metrics.value?.stages;
    if (!Array.isArray(stages)) return null;
    return stages.find(s => s.stage_id === stageId) ?? null;
  }

  const summary = computed(() => metrics.value?.summary ?? null);

  function reset() {
    callSeq += 1;
    metrics.value = null;
    loading.value = false;
    error.value = null;
    lastFetchedAt.value = null;
  }

  return {
    metrics,
    loading,
    error,
    lastFetchedAt,
    summary,
    fetchMetrics,
    metricsForStage,
    reset,
  };
}
