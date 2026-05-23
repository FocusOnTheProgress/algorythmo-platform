import { reactive } from 'vue';
import {
  fetchLeads,
  moveLead,
  reopenLead,
} from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// Lead store — singleton per process.
// State is a Map<stageId, StageState> so each stage column is independently
// paginated, loaded, and updated.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} StageState
 * @property {object[]} leads
 * @property {string|null} cursor
 * @property {boolean} isLoading
 * @property {boolean} hasMore
 * @property {string|null} error
 */

/** @type {Map<string|number, StageState>} */
const stageMap = reactive(new Map());

function defaultStageState() {
  return {
    leads: [],
    cursor: null,
    isLoading: false,
    hasMore: true,
    error: null,
  };
}

function ensureStage(stageId) {
  if (!stageMap.has(stageId)) {
    stageMap.set(stageId, defaultStageState());
  }
  return stageMap.get(stageId);
}

// ---------------------------------------------------------------------------
// Public composable
// ---------------------------------------------------------------------------

/**
 * @param {string|number} accountId
 */
export function useLeadStore(accountId) {
  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------
  function leadsByStage(stageId) {
    return stageMap.get(stageId)?.leads ?? [];
  }

  function findLeadById(id) {
    return Array.from(stageMap.values())
      .flatMap(state => state.leads)
      .find(l => l.id === id);
  }

  // -------------------------------------------------------------------------
  // Fetch
  // -------------------------------------------------------------------------
  async function fetchStage(stageId) {
    const state = ensureStage(stageId);
    if (state.isLoading) return;

    state.isLoading = true;
    state.error = null;
    try {
      const res = await fetchLeads(accountId, { stage_id: stageId, limit: 50 });
      state.leads = res.data.leads ?? [];
      state.cursor = res.data.next_cursor ?? null;
      state.hasMore = state.cursor !== null;
    } catch (err) {
      state.error = err?.response?.data?.message ?? err.message;
      // eslint-disable-next-line no-console
      console.error('algorythmo:fetch-stage-failed', { stageId, err });
    } finally {
      state.isLoading = false;
    }
  }

  async function fetchNextPage(stageId) {
    const state = ensureStage(stageId);
    if (state.isLoading || !state.hasMore || !state.cursor) return;

    state.isLoading = true;
    try {
      const res = await fetchLeads(accountId, {
        stage_id: stageId,
        cursor: state.cursor,
        limit: 50,
      });
      const newLeads = res.data.leads ?? [];
      // Append, de-duping by id.
      const existingIds = new Set(state.leads.map(l => l.id));
      newLeads.forEach(lead => {
        if (!existingIds.has(lead.id)) state.leads.push(lead);
      });
      state.cursor = res.data.next_cursor ?? null;
      state.hasMore = state.cursor !== null;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('algorythmo:fetch-next-page-failed', { stageId, err });
    } finally {
      state.isLoading = false;
    }
  }

  // -------------------------------------------------------------------------
  // Upsert (used by polling — merges server truth into local state)
  // -------------------------------------------------------------------------
  function upsertLeads(stageId, incomingLeads) {
    const state = ensureStage(stageId);
    const incomingIds = new Set(incomingLeads.map(l => l.id));

    const updated = [];

    // Retain optimistic-move leads that aren't confirmed yet.
    state.leads.forEach(existing => {
      if (existing.movePending) {
        updated.push(existing);
        return;
      }
      if (incomingIds.has(existing.id)) {
        // Replace with server version.
        const fresh = incomingLeads.find(l => l.id === existing.id);
        updated.push(fresh);
      }
      // If not in incoming and not pending → gone from server, omit.
    });

    // Prepend truly new leads (auto-created by CrmListener).
    const existingIds = new Set(updated.map(l => l.id));
    incomingLeads.forEach(lead => {
      if (!existingIds.has(lead.id)) updated.unshift(lead);
    });

    state.leads = updated;
  }

  // -------------------------------------------------------------------------
  // Optimistic move
  // -------------------------------------------------------------------------
  function moveLeadOptimistic({ leadId, fromStageId, toStageId }) {
    const fromState = stageMap.get(fromStageId);
    const toState = ensureStage(toStageId);

    if (!fromState) return;

    const idx = fromState.leads.findIndex(l => l.id === leadId);
    if (idx === -1) return;

    const [lead] = fromState.leads.splice(idx, 1);
    toState.leads.unshift({
      ...lead,
      stage_id: toStageId,
      movePending: true,
    });
  }

  async function commitMove({ leadId, toStageId }) {
    const state = stageMap.get(toStageId);
    if (!state) return;

    const res = await moveLead(accountId, leadId, toStageId);
    const updated = res.data;
    const idx = state.leads.findIndex(l => l.id === leadId);
    if (idx !== -1) {
      state.leads[idx] = { ...updated, movePending: false };
    }
  }

  function rollbackMove({ leadId, fromStageId }) {
    // Find the lead in whichever stage it's currently in (could be toStage).
    Array.from(stageMap.values()).some(state => {
      const idx = state.leads.findIndex(l => l.id === leadId);
      if (idx !== -1) {
        const [lead] = state.leads.splice(idx, 1);
        const fromState = ensureStage(fromStageId);
        fromState.leads.unshift({
          ...lead,
          stage_id: fromStageId,
          movePending: false,
        });
        return true;
      }
      return false;
    });
  }

  // -------------------------------------------------------------------------
  // Reopen
  // -------------------------------------------------------------------------
  async function reopenLeadAction(leadId, firstStageId) {
    const res = await reopenLead(accountId, leadId);
    const newLead = res.data;
    const state = ensureStage(firstStageId);
    state.leads.unshift(newLead);
    return newLead;
  }

  // -------------------------------------------------------------------------
  // Exposed
  // -------------------------------------------------------------------------
  return {
    stageMap,
    leadsByStage,
    findLeadById,
    fetchStage,
    fetchNextPage,
    upsertLeads,
    moveLeadOptimistic,
    commitMove,
    rollbackMove,
    reopenLeadAction,
  };
}
