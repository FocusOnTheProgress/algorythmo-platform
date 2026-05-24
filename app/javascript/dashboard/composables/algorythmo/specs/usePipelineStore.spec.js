import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('dashboard/helper/algorythmo/leadApi.js', () => ({
  fetchDefaultPipeline: vi.fn(),
}));

import { fetchDefaultPipeline } from 'dashboard/helper/algorythmo/leadApi.js';
import {
  usePipelineStore,
  clearPipelineStoreForAccount,
} from '../usePipelineStore.js';

// Each test uses a unique accountId so per-account keyed caches don't bleed.
// clearPipelineStoreForAccount is used when we need a fresh cache mid-test.

describe('usePipelineStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loadPipeline sets pipeline and stages on success', async () => {
    clearPipelineStoreForAccount('1');
    fetchDefaultPipeline.mockResolvedValue({
      data: {
        pipeline: { id: 1, name: 'Default' },
        stages: [
          { id: 10, name: 'Novo', position: 1, aging_coefficient: 1 },
          { id: 11, name: 'Qualificado', position: 2, aging_coefficient: 2 },
        ],
      },
    });

    const store = usePipelineStore('1');
    await store.loadPipeline();

    expect(store.pipeline.value).toEqual({ id: 1, name: 'Default' });
    expect(store.stages.value).toHaveLength(2);
    expect(store.pipelineLoaded.value).toBe(true);
  });

  it('pipelineLoaded is false before first load', () => {
    // Fresh account — cache entry does not exist yet.
    clearPipelineStoreForAccount('fresh-acct');
    const store = usePipelineStore('fresh-acct');
    expect(store.pipelineLoaded.value).toBe(false);
  });

  it('cross-account: different accountIds have independent caches', async () => {
    clearPipelineStoreForAccount('acct-a');
    clearPipelineStoreForAccount('acct-b');
    fetchDefaultPipeline.mockResolvedValue({
      data: {
        pipeline: { id: 1, name: 'Default' },
        stages: [{ id: 10, name: 'Novo', position: 1, aging_coefficient: 1 }],
      },
    });

    const storeA = usePipelineStore('acct-a');
    await storeA.loadPipeline();

    const storeB = usePipelineStore('acct-b');
    expect(storeB.pipelineLoaded.value).toBe(false);
  });

  it('stageById computed returns a Map keyed by stage id', async () => {
    clearPipelineStoreForAccount('2');
    fetchDefaultPipeline.mockResolvedValue({
      data: {
        pipeline: { id: 1, name: 'Default' },
        stages: [
          { id: 20, name: 'Proposta', position: 3, aging_coefficient: 3 },
        ],
      },
    });
    const store = usePipelineStore('2');
    await store.loadPipeline();
    expect(store.stageById.value.get(20)).toMatchObject({ name: 'Proposta' });
  });

  it('updateStageName mutates the stages ref', async () => {
    clearPipelineStoreForAccount('3');
    fetchDefaultPipeline.mockResolvedValue({
      data: {
        pipeline: { id: 1, name: 'Default' },
        stages: [{ id: 30, name: 'Antigo', position: 1, aging_coefficient: 1 }],
      },
    });
    const store = usePipelineStore('3');
    await store.loadPipeline();
    store.updateStageName(30, 'Renomeado');
    expect(store.stages.value.find(s => s.id === 30).name).toBe('Renomeado');
  });

  it('updateStageCoefficient mutates aging_coefficient', async () => {
    clearPipelineStoreForAccount('4');
    fetchDefaultPipeline.mockResolvedValue({
      data: {
        pipeline: { id: 1, name: 'Default' },
        stages: [{ id: 40, name: 'X', position: 1, aging_coefficient: 1 }],
      },
    });
    const store = usePipelineStore('4');
    await store.loadPipeline();
    store.updateStageCoefficient(40, 5);
    expect(store.stages.value.find(s => s.id === 40).aging_coefficient).toBe(5);
  });

  it('sets error on fetch failure', async () => {
    clearPipelineStoreForAccount('5');
    fetchDefaultPipeline.mockRejectedValue({ message: 'Network error' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const store = usePipelineStore('5');
    await store.loadPipeline();

    expect(store.error.value).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
