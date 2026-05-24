import { reactive } from 'vue';
import {
  fetchLeads,
  moveLead,
  reopenLead,
} from 'dashboard/helper/algorythmo/leadApi.js';

// ---------------------------------------------------------------------------
// Lead store — per-account singleton.
// Keyed by accountId so switching accounts never blends data across tenants.
// ---------------------------------------------------------------------------

/**
 * @typedef {object} StageState
 * @property {object[]} leads
 * @property {string|null} cursor
 * @property {boolean} isLoading
 * @property {boolean} hasMore
 * @property {string|null} error
 */

/** @type {Map<string, import('vue').UnwrapNestedRefs<Map<string|number, StageState>>>} */
const accountStore = new Map();

// Per-account, per-lead monotonic move counter. Each optimistic move
// increments the counter; commitMove captures the counter before awaiting
// the network and discards the response if a newer move has happened since.
// Without this guard, A→B then B→C can roll back to A if the first request
// resolves after the second.
/** @type {Map<string, Map<string|number, number>>} */
const moveSeqByAccount = new Map();

function getMoveSeqMap(accountId) {
  const key = String(accountId);
  if (!moveSeqByAccount.has(key)) moveSeqByAccount.set(key, new Map());
  return moveSeqByAccount.get(key);
}

function getStageMap(accountId) {
  const key = String(accountId);
  if (!accountStore.has(key)) {
    accountStore.set(key, reactive(new Map()));
  }
  return accountStore.get(key);
}

function defaultStageState() {
  return {
    leads: [],
    cursor: null,
    isLoading: false,
    hasMore: true,
    error: null,
  };
}

function ensureStage(stageMap, stageId) {
  if (!stageMap.has(stageId)) {
    stageMap.set(stageId, defaultStageState());
  }
  return stageMap.get(stageId);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @param {string|number} accountId
 */
export function useLeadStore(accountId) {
  const stageMap = getStageMap(accountId);
  const moveSeqMap = getMoveSeqMap(accountId);

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
  // Upsert (merge server truth into local state, preserving pending moves)
  // -------------------------------------------------------------------------
  function upsertLeads(stageId, incomingLeads) {
    const state = ensureStage(stageMap, stageId);
    const incomingIds = new Set(incomingLeads.map(l => l.id));
    const updated = [];

    state.leads.forEach(existing => {
      if (existing.movePending) {
        updated.push(existing);
        return;
      }
      if (incomingIds.has(existing.id)) {
        const fresh = incomingLeads.find(l => l.id === existing.id);
        updated.push(fresh);
      }
      // Not in incoming and not pending → gone from server, omit.
    });

    // Prepend new leads not seen locally (auto-created by CrmListener).
    const existingIds = new Set(updated.map(l => l.id));
    incomingLeads.forEach(lead => {
      if (!existingIds.has(lead.id)) updated.unshift(lead);
    });

    state.leads = updated;
  }

  // -------------------------------------------------------------------------
  // Fetch — routes through upsertLeads to preserve movePending leads
  // -------------------------------------------------------------------------
  async function fetchStage(stageId) {
    const state = ensureStage(stageMap, stageId);
    if (state.isLoading) return;

    state.isLoading = true;
    state.error = null;
    try {
      const res = await fetchLeads(accountId, { stage_id: stageId, limit: 50 });
      const incomingLeads = res.data.leads ?? [];
      upsertLeads(stageId, incomingLeads); // preserves movePending
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
    const state = ensureStage(stageMap, stageId);
    if (state.isLoading || !state.hasMore || !state.cursor) return;

    state.isLoading = true;
    try {
      const res = await fetchLeads(accountId, {
        stage_id: stageId,
        cursor: state.cursor,
        limit: 50,
      });
      const newLeads = res.data.leads ?? [];
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
  // Optimistic move (with monotonic seq guard against A→B→C race)
  // -------------------------------------------------------------------------
  function bumpMoveSeq(leadId) {
    const next = (moveSeqMap.get(leadId) ?? 0) + 1;
    moveSeqMap.set(leadId, next);
    return next;
  }

  function isLatestMove(leadId, seq) {
    return moveSeqMap.get(leadId) === seq;
  }

  function moveLeadOptimistic({ leadId, fromStageId, toStageId }) {
    const fromState = stageMap.get(fromStageId);
    const toState = ensureStage(stageMap, toStageId);

    if (!fromState) return 0;

    const idx = fromState.leads.findIndex(l => l.id === leadId);
    if (idx === -1) return 0;

    const seq = bumpMoveSeq(leadId);
    const [lead] = fromState.leads.splice(idx, 1);
    toState.leads.unshift({ ...lead, stage_id: toStageId, movePending: true });
    return seq;
  }

  async function commitMove({ leadId, toStageId }) {
    const seqAtCall = moveSeqMap.get(leadId);
    const res = await moveLead(accountId, leadId, toStageId);
    const updated = res.data;

    if (!updated?.id) {
      throw new Error(
        `algorythmo:commitMove: invalid response for lead ${leadId}`
      );
    }

    // Discard stale response: a newer optimistic move has happened on this
    // lead, so applying this older server truth would clobber the newer
    // local state. The newer move's commit (or rollback) will be the one
    // that lands.
    if (!isLatestMove(leadId, seqAtCall)) return;

    // Remove from every bucket (covers rapid re-drag mid-flight and dedup).
    stageMap.forEach(state => {
      const idx = state.leads.findIndex(l => l.id === leadId);
      if (idx !== -1) state.leads.splice(idx, 1);
    });

    // Insert into the stage the server confirms — may differ from toStageId
    // if the server applied a business rule or the user dragged again mid-flight.
    const targetState = ensureStage(stageMap, updated.stage_id);
    targetState.leads.unshift({ ...updated, movePending: false });
  }

  function rollbackMove({ leadId, fromStageId }) {
    Array.from(stageMap.values()).some(state => {
      const idx = state.leads.findIndex(l => l.id === leadId);
      if (idx !== -1) {
        const [lead] = state.leads.splice(idx, 1);
        const fromState = ensureStage(stageMap, fromStageId);
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
    const state = ensureStage(stageMap, firstStageId);
    state.leads.unshift(newLead);
    return newLead;
  }

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

/**
 * Clear all lead state for a given account (call on account switch).
 * @param {string|number} accountId
 */
export function clearLeadStoreForAccount(accountId) {
  const key = String(accountId);
  accountStore.delete(key);
  moveSeqByAccount.delete(key);
}
