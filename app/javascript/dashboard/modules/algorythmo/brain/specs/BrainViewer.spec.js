// algorythmo: M8a — BrainViewer + Aquário unit spec
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import BrainViewer from '../BrainViewer.vue';
import { brainService } from '../brain.service';

// Mock the composable that reads account ID from the Vuex store.
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: vi.fn(() => ({ value: 1 })),
}));

// Mock brain service to avoid actual HTTP calls in unit tests.
vi.mock('../brain.service', () => ({
  brainService: {
    fetchCompiledTruth: vi.fn(),
    fetchTimeline: vi.fn(),
  },
}));

const FIXTURE_TRUTH = {
  meta: { updated_at: '2026-05-26T06:00:00Z', version: 1, source: 'fixture' },
  content: '---\ntitle: Test\n---\n\nBody content here.',
};

const FIXTURE_TIMELINE = {
  events: [
    {
      id: 'e1',
      type: 'adjustment',
      timestamp: '2026-05-26T06:00:00Z',
      title: 'Ajuste inicial',
      preview: 'Contexto base colado.',
      actor: 'founder',
    },
  ],
};

beforeEach(() => {
  brainService.fetchCompiledTruth.mockResolvedValue(FIXTURE_TRUTH);
  brainService.fetchTimeline.mockResolvedValue(FIXTURE_TIMELINE);
});

async function mountViewer() {
  const wrapper = mount(BrainViewer);
  await flushPromises();
  return wrapper;
}

describe('BrainViewer — tab bar', () => {
  it('renders 5 tabs', async () => {
    const wrapper = await mountViewer();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(5);
  });

  it('first tab is active by default', async () => {
    const wrapper = await mountViewer();
    const active = wrapper
      .findAll('[role="tab"]')
      .find(t => t.attributes('aria-selected') === 'true');
    expect(active).toBeDefined();
    expect(active.text().trim().length).toBeGreaterThan(0);
  });

  it('Aquário + Documentos are clickable; the rest are disabled', async () => {
    const wrapper = await mountViewer();
    const disabledTabs = wrapper
      .findAll('[role="tab"]')
      .filter(t => t.attributes('aria-disabled') === 'true');
    expect(disabledTabs).toHaveLength(3);
  });

  it('disabled tabs render the "em breve" / "Coming soon" badge', async () => {
    const wrapper = await mountViewer();
    const soonBadges = wrapper.findAll('.alg-brain-tabs__soon');
    expect(soonBadges).toHaveLength(3);
  });

  it('disabled tabs have tabindex="-1"', async () => {
    const wrapper = await mountViewer();
    const disabled = wrapper
      .findAll('[role="tab"]')
      .filter(t => t.attributes('tabindex') === '-1');
    expect(disabled).toHaveLength(3);
  });

  it('clicking Documentos switches the active view to BrainDocumentUpload', async () => {
    const wrapper = await mountViewer();
    const tabs = wrapper.findAll('[role="tab"]');
    // second tab is Documentos (active)
    await tabs[1].trigger('click');
    expect(wrapper.find('.alg-upload').exists()).toBe(true);
    expect(wrapper.find('.alg-aquario').exists()).toBe(false);
  });
});

describe('BrainViewer — aquário content', () => {
  it('renders the aquário container', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
  });

  it('renders 2 anchor columns', async () => {
    const wrapper = await mountViewer();
    const anchors = wrapper.findAll('.alg-aquario__column--anchor');
    expect(anchors).toHaveLength(2);
  });

  it('renders 4 secondary columns', async () => {
    const wrapper = await mountViewer();
    const secondary = wrapper.findAll('.alg-aquario__column--secondary');
    expect(secondary).toHaveLength(4);
  });

  it('every column has a non-empty label', async () => {
    const wrapper = await mountViewer();
    const labels = wrapper.findAll('.alg-aquario__column-label');
    expect(labels.length).toBe(6);
    labels.forEach(l => expect(l.text().trim().length).toBeGreaterThan(0));
  });

  it('every column has at least one specimen sentence', async () => {
    const wrapper = await mountViewer();
    const columns = wrapper.findAll('.alg-aquario__column');
    columns.forEach(col => {
      expect(col.findAll('.alg-aquario__specimen').length).toBeGreaterThan(0);
    });
  });
});

describe('BrainViewer — empty state', () => {
  it('renders BrainEmptyState when compiled truth is absent', async () => {
    brainService.fetchCompiledTruth.mockResolvedValue({
      meta: {},
      content: '',
    });
    const wrapper = mount(BrainViewer);
    await flushPromises();
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(true);
    expect(wrapper.find('.alg-aquario').exists()).toBe(false);
  });
});

describe('BrainViewer — error state', () => {
  it('renders error alert when service throws', async () => {
    brainService.fetchCompiledTruth.mockRejectedValue(new Error('network'));
    brainService.fetchTimeline.mockRejectedValue(new Error('network'));
    const wrapper = mount(BrainViewer);
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
});
