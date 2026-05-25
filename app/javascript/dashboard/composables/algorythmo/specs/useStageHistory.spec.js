import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dashboard/helper/algorythmo/leadApi.js', () => ({
  fetchStageHistory: vi.fn(),
}));

import { fetchStageHistory } from 'dashboard/helper/algorythmo/leadApi.js';
import { useStageHistory } from '../useStageHistory.js';

const ACCOUNT_ID = '42';

const entry = (id, extras = {}) => ({
  id,
  from_stage_id: null,
  to_stage_id: 1,
  to_stage_name: 'Novo',
  actor_type: 'system',
  actor_id: null,
  actor_summary: null,
  changed_at: '2026-05-24T12:00:00Z',
  ...extras,
});

describe('useStageHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts empty and idle', () => {
      const s = useStageHistory(ACCOUNT_ID);
      expect(s.entries.value).toEqual([]);
      expect(s.loading.value).toBe(false);
      expect(s.error.value).toBeNull();
      expect(s.truncated.value).toBe(false);
    });
  });

  describe('load — happy path', () => {
    it('toggles loading true → false around the request', async () => {
      let resolveFn;
      fetchStageHistory.mockReturnValue(
        new Promise(resolve => {
          resolveFn = resolve;
        })
      );
      const s = useStageHistory(ACCOUNT_ID);
      const pending = s.load(7);
      expect(s.loading.value).toBe(true);
      resolveFn({ data: { stage_history: [], truncated: false } });
      await pending;
      expect(s.loading.value).toBe(false);
    });

    it('populates entries from response and calls the right URL', async () => {
      fetchStageHistory.mockResolvedValue({
        data: {
          stage_history: [entry(1), entry(2, { actor_type: 'user' })],
          truncated: false,
        },
      });
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(fetchStageHistory).toHaveBeenCalledWith(ACCOUNT_ID, 7);
      expect(s.entries.value).toHaveLength(2);
      expect(s.entries.value[0].id).toBe(1);
      expect(s.truncated.value).toBe(false);
      expect(s.error.value).toBeNull();
    });

    it('coerces missing stage_history to []', async () => {
      fetchStageHistory.mockResolvedValue({ data: {} });
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(s.entries.value).toEqual([]);
    });
  });

  describe('load — truncated branch', () => {
    it('flips truncated when backend signals cap hit', async () => {
      fetchStageHistory.mockResolvedValue({
        data: {
          stage_history: Array.from({ length: 100 }, (_, i) => entry(i + 1)),
          truncated: true,
        },
      });
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(s.entries.value).toHaveLength(100);
      expect(s.truncated.value).toBe(true);
    });
  });

  describe('load — error branch', () => {
    it('captures server-side error message and clears entries', async () => {
      fetchStageHistory.mockRejectedValue({
        response: { data: { message: 'boom' } },
      });
      const s = useStageHistory(ACCOUNT_ID);
      s.entries.value = [entry(1)];
      await s.load(7);
      expect(s.loading.value).toBe(false);
      expect(s.error.value).toBe('boom');
      expect(s.entries.value).toEqual([]);
      expect(s.truncated.value).toBe(false);
    });

    it('falls back to err.message when no response payload', async () => {
      fetchStageHistory.mockRejectedValue(new Error('network down'));
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(s.error.value).toBe('network down');
    });

    it('falls back to fetch_failed when nothing is provided', async () => {
      fetchStageHistory.mockRejectedValue({});
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(s.error.value).toBe('fetch_failed');
    });

    it('allows retry to recover into success', async () => {
      fetchStageHistory
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({
          data: { stage_history: [entry(1)], truncated: false },
        });
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      expect(s.error.value).toBe('boom');
      await s.load(7);
      expect(s.error.value).toBeNull();
      expect(s.entries.value).toHaveLength(1);
    });
  });

  describe('stale-response guard', () => {
    it('drops the older response when a newer load supersedes it', async () => {
      let resolveFirst;
      fetchStageHistory.mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirst = resolve;
        })
      );
      fetchStageHistory.mockResolvedValueOnce({
        data: { stage_history: [entry(99)], truncated: false },
      });

      const s = useStageHistory(ACCOUNT_ID);
      const first = s.load(7);
      const second = s.load(8);
      await second;
      resolveFirst({
        data: { stage_history: [entry(1), entry(2)], truncated: true },
      });
      await first;

      expect(s.entries.value).toEqual([entry(99)]);
      expect(s.truncated.value).toBe(false);
      expect(s.loading.value).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      fetchStageHistory.mockResolvedValue({
        data: { stage_history: [entry(1)], truncated: true },
      });
      const s = useStageHistory(ACCOUNT_ID);
      await s.load(7);
      s.reset();
      expect(s.entries.value).toEqual([]);
      expect(s.loading.value).toBe(false);
      expect(s.error.value).toBeNull();
      expect(s.truncated.value).toBe(false);
    });
  });
});
