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
  it('renders 4 tabs', async () => {
    const wrapper = await mountViewer();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
  });

  it('first tab is active by default', async () => {
    const wrapper = await mountViewer();
    const active = wrapper
      .findAll('[role="tab"]')
      .find(t => t.attributes('aria-selected') === 'true');
    expect(active).toBeDefined();
    expect(active.text().trim().length).toBeGreaterThan(0);
  });

  it('non-active tabs have aria-disabled="true"', async () => {
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
});

describe('BrainViewer — aquário (knowledge hub) content', () => {
  it('renders the aquário container', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
  });

  it('renders the Aurora orb core within the viewer', async () => {
    // The living Aurora sphere is the centrepiece of the knowledge hub.
    const wrapper = await mountViewer();
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
  });

  it('renders the four knowledge-layer glass tiles', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.findAll('.alg-glass-tile')).toHaveLength(4);
  });

  it('shows the editorial header (eyebrow + title)', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario__eyebrow').exists()).toBe(true);
    expect(
      wrapper.find('.alg-aquario__title').text().trim().length
    ).toBeGreaterThan(0);
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
