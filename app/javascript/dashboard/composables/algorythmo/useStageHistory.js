import { ref } from 'vue';
import { fetchStageHistory } from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// useStageHistory — per-instance composable for the LeadDetailDrawer.
// Lazy-fetches the stage transition history for ONE lead at a time.
//
// Why per-instance (not singleton): the drawer holds one lead at a time and
// unmounts on close. A singleton would either share state across drawers
// (none today, but planned in M2 multi-tab) or accumulate stale leads. The
// per-instance pattern keeps memory bounded and the API trivially testable.
//
// Why a monotonic call-token guard: the drawer can switch lead without
// unmounting (next/prev arrows in M2) AND the same lead can be re-loaded
// while a previous request is still in flight (close + reopen, retry while
// loading). A leadId-only compare would let the stale response slip through
// when both calls target the same lead. The token is bumped on every load()
// AND on reset() so any in-flight response is invalidated before its
// continuation runs.
// ---------------------------------------------------------------------------

/**
 * @param {string|number} accountId
 */
export function useStageHistory(accountId) {
  const entries = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const truncated = ref(false);

  let callSeq = 0;

  async function load(leadId) {
    callSeq += 1;
    const myCall = callSeq;
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchStageHistory(accountId, leadId);
      if (myCall !== callSeq) return;
      entries.value = Array.isArray(res?.data?.stage_history)
        ? res.data.stage_history
        : [];
      truncated.value = !!res?.data?.truncated;
    } catch (err) {
      if (myCall !== callSeq) return;
      entries.value = [];
      truncated.value = false;
      error.value =
        err?.response?.data?.message || err?.message || 'fetch_failed';
    } finally {
      if (myCall === callSeq) loading.value = false;
    }
  }

  function reset() {
    callSeq += 1;
    entries.value = [];
    loading.value = false;
    error.value = null;
    truncated.value = false;
  }

  return {
    entries,
    loading,
    error,
    truncated,
    load,
    reset,
  };
}
