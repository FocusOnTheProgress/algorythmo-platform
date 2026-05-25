// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dashboard/helper/algorythmo/leadApi.js', () => ({
  fetchPipelineMetrics: vi.fn(),
}));

import { fetchPipelineMetrics } from 'dashboard/helper/algorythmo/leadApi.js';
import { useStageMetrics } from '../useStageMetrics.js';

const ACCOUNT_ID = '42';
const PIPELINE_ID = 7;

const payload = (overrides = {}) => ({
  pipeline_id: PIPELINE_ID,
  computed_at: '2026-05-25T12:00:00Z',
  ttl_seconds: 60,
  summary: {
    open_leads: 12,
    avg_funnel_hours: 73.5,
    conversion_rate: 0.31,
  },
  stages: [
    {
      stage_id: 1,
      stage_kind: 'open',
      lead_count: 5,
      avg_time_in_stage_seconds: 14400,
      conversion_rate_to_next: 0.55,
    },
    {
      stage_id: 2,
      stage_kind: 'won',
      lead_count: 3,
      avg_time_in_stage_seconds: 0,
      conversion_rate_to_next: null,
    },
  ],
  ...overrides,
});

describe('useStageMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts empty and idle', () => {
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      expect(s.metrics.value).toBeNull();
      expect(s.summary.value).toBeNull();
      expect(s.loading.value).toBe(false);
      expect(s.error.value).toBeNull();
      expect(s.lastFetchedAt.value).toBeNull();
    });

    it('metricsForStage returns null before any fetch', () => {
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      expect(s.metricsForStage(1)).toBeNull();
    });
  });

  describe('fetchMetrics — happy path', () => {
    it('hydrates metrics, summary and lastFetchedAt', async () => {
      fetchPipelineMetrics.mockResolvedValue({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();

      expect(fetchPipelineMetrics).toHaveBeenCalledWith(
        ACCOUNT_ID,
        PIPELINE_ID
      );
      expect(s.metrics.value.pipeline_id).toBe(PIPELINE_ID);
      expect(s.summary.value.open_leads).toBe(12);
      expect(s.lastFetchedAt.value).toBeTypeOf('number');
      expect(s.error.value).toBeNull();
      expect(s.loading.value).toBe(false);
    });

    it('toggles loading true → false around the request', async () => {
      let resolveFn;
      fetchPipelineMetrics.mockReturnValue(
        new Promise(resolve => {
          resolveFn = resolve;
        })
      );
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      const pending = s.fetchMetrics();
      expect(s.loading.value).toBe(true);
      resolveFn({ data: payload() });
      await pending;
      expect(s.loading.value).toBe(false);
    });
  });

  describe('metricsForStage', () => {
    it('returns the matching stage entry by stage_id', async () => {
      fetchPipelineMetrics.mockResolvedValue({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      const m = s.metricsForStage(1);
      expect(m).toMatchObject({
        stage_id: 1,
        lead_count: 5,
        avg_time_in_stage_seconds: 14400,
        conversion_rate_to_next: 0.55,
      });
    });

    it('returns null when the stage_id is absent', async () => {
      fetchPipelineMetrics.mockResolvedValue({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      expect(s.metricsForStage(999)).toBeNull();
    });

    it('surfaces null conversion_rate_to_next for terminal stages', async () => {
      fetchPipelineMetrics.mockResolvedValue({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      expect(s.metricsForStage(2).conversion_rate_to_next).toBeNull();
    });
  });

  describe('fetchMetrics — error branch', () => {
    it('captures server-side error message and preserves prior metrics', async () => {
      fetchPipelineMetrics.mockResolvedValueOnce({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      const fetchedAtBefore = s.lastFetchedAt.value;

      fetchPipelineMetrics.mockRejectedValueOnce({
        response: { data: { error: 'boom' } },
      });
      await s.fetchMetrics();

      expect(s.error.value).toBe('boom');
      expect(s.loading.value).toBe(false);
      // Prior payload is intentionally retained — header shows last-known
      // numbers with an error indicator rather than collapsing to a blank
      // state on a transient failure.
      expect(s.metrics.value.pipeline_id).toBe(PIPELINE_ID);
      expect(s.lastFetchedAt.value).toBe(fetchedAtBefore);
    });

    it('falls back to err.message when no response payload', async () => {
      fetchPipelineMetrics.mockRejectedValue(new Error('network down'));
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      expect(s.error.value).toBe('network down');
    });

    it('falls back to fetch_failed when nothing is provided', async () => {
      fetchPipelineMetrics.mockRejectedValue({});
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      expect(s.error.value).toBe('fetch_failed');
    });
  });

  describe('stale-response guard', () => {
    it('drops the older response when a newer fetch supersedes it', async () => {
      let resolveFirst;
      fetchPipelineMetrics.mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirst = resolve;
        })
      );
      fetchPipelineMetrics.mockResolvedValueOnce({
        data: payload({
          summary: { open_leads: 99, avg_funnel_hours: 0, conversion_rate: 0 },
        }),
      });

      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      const first = s.fetchMetrics();
      const second = s.fetchMetrics();
      await second;
      // The older request resolves AFTER the newer one — must not paint over it.
      resolveFirst({
        data: payload({
          summary: { open_leads: 1, avg_funnel_hours: 0, conversion_rate: 0 },
        }),
      });
      await first;

      expect(s.summary.value.open_leads).toBe(99);
      expect(s.loading.value).toBe(false);
    });
  });

  describe('guard rails', () => {
    it('no-ops when accountId is null', async () => {
      const s = useStageMetrics(null, PIPELINE_ID);
      await s.fetchMetrics();
      expect(fetchPipelineMetrics).not.toHaveBeenCalled();
    });

    it('no-ops when pipelineId is null', async () => {
      const s = useStageMetrics(ACCOUNT_ID, null);
      await s.fetchMetrics();
      expect(fetchPipelineMetrics).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears all state', async () => {
      fetchPipelineMetrics.mockResolvedValue({ data: payload() });
      const s = useStageMetrics(ACCOUNT_ID, PIPELINE_ID);
      await s.fetchMetrics();
      s.reset();
      expect(s.metrics.value).toBeNull();
      expect(s.summary.value).toBeNull();
      expect(s.error.value).toBeNull();
      expect(s.lastFetchedAt.value).toBeNull();
    });
  });
});
