// algorythmo: feature-gate algorythmo_crm
//
// Demo-gating regression spec for KanbanBoard.vue.
//
// Live QA found that a tenant WITH pipeline stages but ZERO leads showed the
// on-brand empty state instead of the demo board — the founder could not see a
// populated kanban. The gate is now: demo is active whenever there are 0 real
// leads, EVEN WHEN stages exist; as soon as ≥1 real lead exists, the board
// switches to live data. This spec pins that behavior at the component level by
// stubbing the data composables to simulate each backend shape.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reactive, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

// ---------------------------------------------------------------------------
// Mutable backend doubles. Each test seeds these before mounting.
// ---------------------------------------------------------------------------
const live = reactive({
  stages: [],
  // Map<stageId, leads[]>
  leadsByStageId: {},
  isLoading: false,
});

const pipelineStoreStub = {
  stages: { value: [] },
  isLoading: { value: false },
  stageById: { value: new Map() },
  pipeline: { value: { id: 'live-pipeline' } },
  loadPipeline: vi.fn(() => Promise.resolve()),
};

const leadStoreStub = {
  stageMap: new Map(),
  leadsByStage: vi.fn(stageId => live.leadsByStageId[stageId] ?? []),
  fetchStage: vi.fn(() => Promise.resolve()),
  moveLeadOptimistic: vi.fn(),
  commitMove: vi.fn(() => Promise.resolve()),
  rollbackMove: vi.fn(),
};

function syncStubsFromLive() {
  pipelineStoreStub.stages = { value: live.stages };
  pipelineStoreStub.isLoading = { value: live.isLoading };
  pipelineStoreStub.stageById = {
    value: new Map(live.stages.map(s => [s.id, s])),
  };
}

vi.mock('dashboard/composables/algorythmo/usePipelineStore.js', () => ({
  usePipelineStore: () => pipelineStoreStub,
  clearPipelineStoreForAccount: vi.fn(),
}));

vi.mock('dashboard/composables/algorythmo/useLeadStore.js', () => ({
  useLeadStore: () => leadStoreStub,
  clearLeadStoreForAccount: vi.fn(),
}));

vi.mock('dashboard/composables/algorythmo/useStageMetrics.js', () => ({
  useStageMetrics: () => ({
    summary: { value: null },
    loading: { value: false },
    error: { value: null },
    fetchMetrics: vi.fn(),
    metricsForStage: vi.fn(() => null),
    reset: vi.fn(),
  }),
}));

vi.mock('dashboard/composables/algorythmo/useDragLead.js', () => ({
  useDragLead: () => ({
    hoveredStageId: { value: null },
    start: vi.fn(),
    enter: vi.fn(),
    over: vi.fn(),
    leave: vi.fn(),
    drop: vi.fn(),
    end: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { accountId: '1' } }),
}));

import KanbanBoard from '../KanbanBoard.vue';

const stubChild = template => ({ template });

async function mountBoard() {
  syncStubsFromLive();
  // i18n is installed globally by vitest.setup.js — no local plugin needed.
  const wrapper = mount(KanbanBoard, {
    global: {
      stubs: {
        // Keep StageColumn real so we can assert the rendered columns +
        // demo header counts. Stub the heavier siblings we don't exercise.
        KanbanHeader: stubChild('<div data-testid="kanban-header-stub" />'),
        KanbanEmptyState: stubChild('<div data-testid="kanban-empty-state" />'),
        MoveLeadModal: true,
        LeadCardMenu: true,
        LeadDetailDrawer: true,
        AlgToastContainer: true,
      },
    },
  });
  await flushPromises();
  await nextTick();
  return wrapper;
}

const liveStage = (id, name) => ({
  id,
  name,
  kind: 'open',
  position: 1,
  aging_coefficient: 3,
});

const liveLead = (id, stageId) => ({
  id,
  stage_id: stageId,
  channel_origin: 'whatsapp',
  stage_entered_at: new Date().toISOString(),
  contact: { name: `Lead ${id}` },
  owner: null,
});

beforeEach(() => {
  live.stages = [];
  live.leadsByStageId = {};
  live.isLoading = false;
  leadStoreStub.leadsByStage.mockClear();
  pipelineStoreStub.loadPipeline.mockClear();
  leadStoreStub.fetchStage.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('KanbanBoard — demo gating (0 real leads)', () => {
  it('shows the demo board when there are NO stages at all', async () => {
    live.stages = [];
    const wrapper = await mountBoard();
    expect(wrapper.find('[data-testid="kanban-demo-watermark"]').exists()).toBe(
      true
    );
    // The four demo stages render.
    expect(wrapper.findAll('[data-testid="stage-column"]')).toHaveLength(4);
  });

  it('shows the demo board when stages EXIST but there are ZERO real leads', async () => {
    // This is the live-QA bug: previously this rendered the empty state.
    live.stages = [liveStage('s1', 'Entrada'), liveStage('s2', 'Qualificado')];
    live.leadsByStageId = { s1: [], s2: [] };

    const wrapper = await mountBoard();

    // Demo board, not the empty state.
    expect(wrapper.find('[data-testid="kanban-demo-watermark"]').exists()).toBe(
      true
    );
    expect(wrapper.find('[data-testid="kanban-empty-state"]').exists()).toBe(
      false
    );
    // Demo board paints its four columns…
    expect(wrapper.findAll('[data-testid="stage-column"]')).toHaveLength(4);
    // …with the demo stage-total header counts (84/52/42/21), not 0.
    const counts = wrapper
      .findAll('[data-testid="stage-count"]')
      .map(n => n.text());
    expect(counts).toEqual(['84', '52', '42', '21']);
  });

  it('renders the ~16 demo lead cards in the 0-real-leads case', async () => {
    live.stages = [liveStage('s1', 'Entrada')];
    live.leadsByStageId = { s1: [] };
    const wrapper = await mountBoard();
    expect(wrapper.findAll('[data-testid="lead-card"]')).toHaveLength(16);
  });

  it('switches to LIVE data as soon as ≥1 real lead exists', async () => {
    live.stages = [liveStage('s1', 'Entrada'), liveStage('s2', 'Fechado')];
    live.leadsByStageId = { s1: [liveLead('L1', 's1')], s2: [] };

    const wrapper = await mountBoard();

    // No demo watermark — this is a real, populated pipeline.
    expect(wrapper.find('[data-testid="kanban-demo-watermark"]').exists()).toBe(
      false
    );
    // Live stages (2), not the four demo stages.
    expect(wrapper.findAll('[data-testid="stage-column"]')).toHaveLength(2);
    // The single real lead renders.
    expect(wrapper.findAll('[data-testid="lead-card"]')).toHaveLength(1);
  });
});
