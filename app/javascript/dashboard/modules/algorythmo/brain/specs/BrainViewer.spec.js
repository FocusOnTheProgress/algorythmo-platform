// algorythmo: BrainViewer — shell spec (plan 0012, founder-approved layout).
//
// The Brain screen is now: a contained Aurora identity strip at the top with
// LIVE stats, then dense data in three tabs (Ver / Ajustar / Histórico). This
// spec asserts the shell: the header renders (one orb, real stats wiring), the
// three tabs exist and switch, and the screen loads the three real endpoints on
// mount — NO fixture, NO fake six-card scatter.
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Motion One is WAAPI-backed and inert in jsdom; the orb in the header has no
// JS motion, but AlgAuroraBorder (in the Ajustar dropzone) is CSS-only too — no
// motion mock needed for the shell. The orb component is pure CSS.

import { mount, flushPromises } from '@vue/test-utils';
import BrainViewer from '../BrainViewer.vue';
import { brainService } from '../brain.service';

const { accountIdRef } = vi.hoisted(() => {
  // eslint-disable-next-line global-require
  const { ref } = require('vue');
  return { accountIdRef: ref(2) };
});

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: vi.fn(() => accountIdRef),
}));

vi.mock('../brain.service', () => ({
  brainService: {
    fetchCompiledTruth: vi.fn(),
    fetchDocuments: vi.fn(),
    fetchTimeline: vi.fn(),
    postDocument: vi.fn(),
    postAdjustment: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  accountIdRef.value = 2;
  brainService.fetchCompiledTruth.mockResolvedValue({
    pages: 12,
    edges: 340,
    raw_stats: {},
    account_id: 2,
  });
  brainService.fetchDocuments.mockResolvedValue({
    documents: [],
    meta: { current_page: 1, total_pages: 1, total_count: 0 },
  });
  brainService.fetchTimeline.mockResolvedValue({
    data: [],
    meta: { page: 1, per_page: 30, count: 0, total_count: 0 },
  });
});

async function mountViewer() {
  const wrapper = mount(BrainViewer);
  await flushPromises();
  return wrapper;
}

describe('BrainViewer — Aurora identity strip (contained header)', () => {
  it('renders exactly one Aurora orb, contained in the header (not a canvas)', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
    expect(wrapper.find('.alg-brain-header').exists()).toBe(true);
    // The orb lives INSIDE the header strip, not as a full-canvas stage.
    expect(
      wrapper.find('.alg-brain-header__orb .alg-aurora-orb__sphere').exists()
    ).toBe(true);
  });

  it('does NOT render the old fake six-card knowledge scatter', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario__stage').exists()).toBe(false);
    expect(wrapper.findAll('.alg-aquario__card')).toHaveLength(0);
  });

  it('shows the real compiled-truth stats in the header', async () => {
    const wrapper = await mountViewer();
    const stats = wrapper.find('.alg-brain-header__stats').text();
    expect(stats).toContain('12'); // pages → "Documents"
    expect(stats).toContain('340'); // edges → "Passages"
  });
});

describe('BrainViewer — tabs', () => {
  it('renders three tabs and View is active by default', async () => {
    const wrapper = await mountViewer();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    expect(wrapper.find('.alg-brain-tab--active').text()).toBe('View');
  });

  it('switches the active panel on tab click', async () => {
    const wrapper = await mountViewer();
    const ajustarTab = wrapper.find('#alg-brain-tab-ajustar');
    await ajustarTab.trigger('click');
    expect(ajustarTab.attributes('aria-selected')).toBe('true');
    expect(wrapper.find('#alg-brain-tab-ver').attributes('aria-selected')).toBe(
      'false'
    );
  });
});

describe('BrainViewer — loads the three real endpoints (no fixture)', () => {
  it('fetches compiled_truth, documents and timeline on mount', async () => {
    await mountViewer();
    expect(brainService.fetchCompiledTruth).toHaveBeenCalledWith(2);
    expect(brainService.fetchDocuments).toHaveBeenCalledWith(2);
    expect(brainService.fetchTimeline).toHaveBeenCalledWith(2);
  });

  it('reloads all three when the account id changes', async () => {
    const wrapper = await mountViewer();
    vi.clearAllMocks();
    brainService.fetchCompiledTruth.mockResolvedValue({ pages: 0, edges: 0 });
    brainService.fetchDocuments.mockResolvedValue({ documents: [], meta: {} });
    brainService.fetchTimeline.mockResolvedValue({ data: [], meta: {} });
    accountIdRef.value = 7;
    await flushPromises();
    expect(brainService.fetchCompiledTruth).toHaveBeenCalledWith(7);
    expect(brainService.fetchDocuments).toHaveBeenCalledWith(7);
    expect(brainService.fetchTimeline).toHaveBeenCalledWith(7);
    wrapper.unmount();
  });

  it('does not fetch without an account id', async () => {
    accountIdRef.value = null;
    vi.clearAllMocks();
    const wrapper = mount(BrainViewer);
    await flushPromises();
    expect(brainService.fetchCompiledTruth).not.toHaveBeenCalled();
    expect(brainService.fetchDocuments).not.toHaveBeenCalled();
    // Shell still renders (header + tabs), no forever spinner.
    expect(wrapper.find('.alg-brain-header').exists()).toBe(true);
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3);
    wrapper.unmount();
  });
});

describe('BrainViewer — empty brain is honestly empty (Ver)', () => {
  it('shows the honest empty state when there are no documents', async () => {
    const wrapper = await mountViewer();
    // Ver is the default tab; with zero documents it renders the empty state.
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(true);
    expect(wrapper.find('.alg-brain-empty__title').text()).toBe(
      'No knowledge yet'
    );
  });
});
