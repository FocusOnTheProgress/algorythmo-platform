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
// Why an inFlightLeadId guard: the drawer can switch lead without unmounting
// (next/prev arrows in M2). A second load() can resolve before the first.
// Without the guard, the first response would clobber the second's data.
// ---------------------------------------------------------------------------

/**
 * @param {string|number} accountId
 */
export function useStageHistory(accountId) {
  const entries = ref([]);
  const loading = ref(false);
  const error = ref(null);
  const truncated = ref(false);

  let inFlightLeadId = null;

  async function load(leadId) {
    inFlightLeadId = leadId;
    loading.value = true;
    error.value = null;
    try {
      const res = await fetchStageHistory(accountId, leadId);
      if (inFlightLeadId !== leadId) return;
      entries.value = Array.isArray(res?.data?.stage_history)
        ? res.data.stage_history
        : [];
      truncated.value = !!res?.data?.truncated;
    } catch (err) {
      if (inFlightLeadId !== leadId) return;
      entries.value = [];
      truncated.value = false;
      error.value =
        err?.response?.data?.message || err?.message || 'fetch_failed';
    } finally {
      if (inFlightLeadId === leadId) loading.value = false;
    }
  }

  function reset() {
    inFlightLeadId = null;
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
