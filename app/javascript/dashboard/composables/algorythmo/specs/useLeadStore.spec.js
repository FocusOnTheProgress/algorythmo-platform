import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dashboard/helper/algorythmo/leadApi.js', () => ({
  fetchLeads: vi.fn(),
  moveLead: vi.fn(),
  reopenLead: vi.fn(),
}));

import {
  fetchLeads,
  moveLead,
  reopenLead,
} from 'dashboard/helper/algorythmo/leadApi.js';
import { useLeadStore } from '../useLeadStore.js';

// The store uses a module-level reactive Map — tests share state.
// We clear the store manually before each test.
function clearStore(store) {
  store.stageMap.clear();
}

const ACCOUNT_ID = '42';
const lead = (id, stageId, extra = {}) => ({
  id,
  stage_id: stageId,
  position: 1.0,
  channel_origin: 'whatsapp',
  channel_metadata: { name: 'Test User' },
  ...extra,
});

describe('useLeadStore', () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    store = useLeadStore(ACCOUNT_ID);
    clearStore(store);
  });

  // -------------------------------------------------------------------------
  // fetchStage
  // -------------------------------------------------------------------------
  describe('fetchStage', () => {
    it('loads leads into the correct stage', async () => {
      fetchLeads.mockResolvedValue({
        data: { leads: [lead(1, 10), lead(2, 10)], next_cursor: null },
      });
      await store.fetchStage(10);
      expect(store.leadsByStage(10)).toHaveLength(2);
    });

    it('sets hasMore when next_cursor is present', async () => {
      fetchLeads.mockResolvedValue({
        data: { leads: [lead(1, 10)], next_cursor: 'cursor-abc' },
      });
      await store.fetchStage(10);
      expect(store.stageMap.get(10).hasMore).toBe(true);
    });

    it('sets hasMore to false when next_cursor is null', async () => {
      fetchLeads.mockResolvedValue({
        data: { leads: [lead(1, 10)], next_cursor: null },
      });
      await store.fetchStage(10);
      expect(store.stageMap.get(10).hasMore).toBe(false);
    });

    it('sets error on failure', async () => {
      fetchLeads.mockRejectedValue({ response: { data: { message: 'boom' } } });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await store.fetchStage(99);
      expect(store.stageMap.get(99).error).toBe('boom');
      spy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // fetchNextPage
  // -------------------------------------------------------------------------
  describe('fetchNextPage', () => {
    it('appends leads (de-duped) to existing stage', async () => {
      fetchLeads.mockResolvedValueOnce({
        data: { leads: [lead(1, 10), lead(2, 10)], next_cursor: 'cursor-1' },
      });
      await store.fetchStage(10);

      fetchLeads.mockResolvedValueOnce({
        data: { leads: [lead(3, 10), lead(4, 10)], next_cursor: null },
      });
      await store.fetchNextPage(10);

      expect(store.leadsByStage(10)).toHaveLength(4);
    });

    it('does nothing when hasMore is false', async () => {
      fetchLeads.mockResolvedValue({
        data: { leads: [lead(1, 10)], next_cursor: null },
      });
      await store.fetchStage(10);
      await store.fetchNextPage(10);
      // Only initial fetch call.
      expect(fetchLeads).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // findLeadById
  // -------------------------------------------------------------------------
  describe('findLeadById', () => {
    it('finds a lead across multiple stages', async () => {
      fetchLeads.mockResolvedValueOnce({
        data: { leads: [lead(10, 1)], next_cursor: null },
      });
      await store.fetchStage(1);
      expect(store.findLeadById(10)).toMatchObject({ id: 10 });
    });

    it('returns undefined for unknown id', () => {
      expect(store.findLeadById(99999)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // upsertLeads
  // -------------------------------------------------------------------------
  describe('upsertLeads', () => {
    it('prepends new leads not present locally', () => {
      store.stageMap.set(5, {
        leads: [lead(1, 5)],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.upsertLeads(5, [lead(1, 5), lead(2, 5)]);
      expect(store.leadsByStage(5)).toHaveLength(2);
      expect(store.leadsByStage(5)[0].id).toBe(2);
    });

    it('replaces existing leads with server version', () => {
      store.stageMap.set(5, {
        leads: [lead(1, 5, { channel_metadata: { name: 'Old' } })],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.upsertLeads(5, [lead(1, 5, { channel_metadata: { name: 'New' } })]);
      expect(store.leadsByStage(5)[0].channel_metadata.name).toBe('New');
    });

    it('preserves optimistic-move leads even if not in server response', () => {
      store.stageMap.set(5, {
        leads: [{ ...lead(7, 5), movePending: true }],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.upsertLeads(5, [lead(1, 5)]);
      const leads = store.leadsByStage(5);
      expect(leads.some(l => l.id === 7)).toBe(true);
    });

    it('removes local leads not in server response (server is source of truth)', () => {
      store.stageMap.set(5, {
        leads: [lead(1, 5), lead(99, 5)],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.upsertLeads(5, [lead(1, 5)]);
      expect(store.leadsByStage(5).some(l => l.id === 99)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Optimistic move + rollback
  // -------------------------------------------------------------------------
  describe('moveLeadOptimistic', () => {
    it('moves lead from fromStage to toStage immediately', () => {
      store.stageMap.set(1, {
        leads: [lead(1, 1), lead(2, 1)],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.moveLeadOptimistic({ leadId: 1, fromStageId: 1, toStageId: 2 });
      expect(store.leadsByStage(1)).toHaveLength(1);
      expect(store.leadsByStage(2)[0]).toMatchObject({
        id: 1,
        movePending: true,
      });
    });
  });

  describe('commitMove', () => {
    it('clears movePending flag and updates with server data', async () => {
      store.stageMap.set(2, {
        leads: [{ ...lead(5, 2), movePending: true }],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      moveLead.mockResolvedValue({
        data: { ...lead(5, 2), stage_entered_at: '2026-01-01' },
      });
      await store.commitMove({ leadId: 5, toStageId: 2 });
      const updated = store.leadsByStage(2).find(l => l.id === 5);
      expect(updated.movePending).toBeFalsy();
      expect(updated.stage_entered_at).toBe('2026-01-01');
    });

    it('throws on API failure so caller can rollback', async () => {
      store.stageMap.set(2, {
        leads: [{ ...lead(5, 2), movePending: true }],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      moveLead.mockRejectedValue(new Error('Network error'));
      await expect(
        store.commitMove({ leadId: 5, toStageId: 2 })
      ).rejects.toThrow('Network error');
    });
  });

  describe('rollbackMove', () => {
    it('moves lead back to fromStageId', () => {
      store.stageMap.set(2, {
        leads: [{ ...lead(3, 2), movePending: true }],
        cursor: null,
        isLoading: false,
        hasMore: false,
        error: null,
      });
      store.rollbackMove({ leadId: 3, fromStageId: 1 });
      expect(store.leadsByStage(2)).toHaveLength(0);
      expect(store.leadsByStage(1)[0]).toMatchObject({ id: 3, stage_id: 1 });
    });
  });

  // -------------------------------------------------------------------------
  // reopenLeadAction
  // -------------------------------------------------------------------------
  describe('reopenLeadAction', () => {
    it('prepends the new lead to first stage', async () => {
      reopenLead.mockResolvedValue({
        data: lead(100, 1, { previous_lead_id: 5 }),
      });
      const newLead = await store.reopenLeadAction(5, 1);
      expect(newLead.id).toBe(100);
      expect(store.leadsByStage(1)[0].id).toBe(100);
    });
  });
});
