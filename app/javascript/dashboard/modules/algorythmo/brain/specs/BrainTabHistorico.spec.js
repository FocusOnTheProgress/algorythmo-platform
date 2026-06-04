// algorythmo: BrainTabHistorico — "Histórico" tab spec (plan 0012 §9).
//
// Timeline states: data (nodes newest-first), empty (honest), loading
// (skeleton), error (retry). Trigger → glyph mapping is covered structurally.
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainTabHistorico from '../BrainTabHistorico.vue';

function mountHist(props = {}) {
  return mount(BrainTabHistorico, {
    props: { events: [], isLoading: false, hasError: false, ...props },
  });
}

const EVENTS = [
  {
    id: 'snapshot-3',
    type: 'snapshot',
    occurred_at: '2026-06-03T10:00:00Z',
    summary: 'Captured policy.pdf',
    trigger: 'upload',
    meta: { pages: 12 },
  },
  {
    id: 'snapshot-2',
    type: 'snapshot',
    occurred_at: '2026-06-02T10:00:00Z',
    summary: 'Pasted return policy',
    trigger: 'adjustment',
    meta: {},
  },
  {
    id: 'ingestion-1',
    type: 'conversation_ingested',
    occurred_at: '2026-06-01T10:00:00Z',
    summary: 'Conversation #5 indexed',
    trigger: 'cron',
    meta: {},
  },
];

describe('BrainTabHistorico — data state', () => {
  it('renders one node per event, newest first (as given)', () => {
    const wrapper = mountHist({ events: EVENTS });
    const nodes = wrapper.findAll('.alg-brain-historico__node');
    expect(nodes).toHaveLength(3);
    expect(nodes[0].text()).toContain('Captured policy.pdf');
    expect(nodes[2].text()).toContain('Conversation #5 indexed');
  });
});

describe('BrainTabHistorico — empty state (honest)', () => {
  it('renders the honest empty state when there is no history', () => {
    const wrapper = mountHist({ events: [] });
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(true);
    expect(wrapper.find('.alg-brain-empty__title').text()).toBe(
      "The Brain hasn't grown yet"
    );
  });
});

describe('BrainTabHistorico — loading state', () => {
  it('renders skeleton nodes while loading', () => {
    const wrapper = mountHist({ isLoading: true });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(
      wrapper.findAll('.alg-brain-historico__node--skeleton').length
    ).toBeGreaterThan(0);
  });
});

describe('BrainTabHistorico — error state', () => {
  it('renders an alert with retry on error', async () => {
    const wrapper = mountHist({ hasError: true });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    await wrapper.find('.alg-brain-historico__retry').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
