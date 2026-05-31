// algorythmo: BrainViewer — Aquarium-only landing spec (round-3 rebuild).
//
// The Brain landing IS the Aurora knowledge hub. The disabled Ajustes / Histórico
// / Config tab bar was removed (Aquarium-only), so this spec asserts the new
// structure: no tab bar, the Aurora hub rendered, and the demo hub still shown
// on an empty OR failed backend load (the CRM demo-board philosophy is kept).
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Motion One is WAAPI-backed and not meaningful in jsdom; BrainViewer renders
// BrainAquario, whose mount-time card reveal uses it — mock it so mounting is
// inert here.
vi.mock('motion', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn((each, opts) => ({ __stagger: each, ...opts })),
}));

import { mount, flushPromises } from '@vue/test-utils';
import BrainViewer from '../BrainViewer.vue';
import { brainService } from '../brain.service';

// Shared, reactive account-id ref. BrainViewer's `accountId` IS this ref, so a
// test can mutate it to drive the watch(accountId, …) reload path. Using a real
// ref (not a plain { value } object) also stops Vue warning that the watch
// source is invalid on every mount. Built inside vi.hoisted — which runs above
// the (also-hoisted) vi.mock factory — and pulls `ref` from vue there, since a
// top-level `import { ref }` would still be in the TDZ when the factory closes
// over the ref.
const { accountIdRef } = vi.hoisted(() => {
  // eslint-disable-next-line global-require
  const { ref } = require('vue');
  return { accountIdRef: ref(1) };
});

// Mock the composable that reads account ID from the Vuex store.
vi.mock('dashboard/composables/store', () => ({
  useMapGetter: vi.fn(() => accountIdRef),
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

beforeEach(() => {
  vi.clearAllMocks();
  accountIdRef.value = 1;
  brainService.fetchCompiledTruth.mockResolvedValue(FIXTURE_TRUTH);
});

async function mountViewer() {
  const wrapper = mount(BrainViewer);
  await flushPromises();
  return wrapper;
}

describe('BrainViewer — Aquarium-only (no tab bar)', () => {
  it('renders no role="tab" elements (the disabled tab bar was removed)', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(0);
    expect(wrapper.find('.alg-brain-tabs').exists()).toBe(false);
  });
});

describe('BrainViewer — aquário (knowledge hub) content', () => {
  it('renders the aquário container', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
  });

  it('renders exactly one Aurora orb core within the viewer', async () => {
    // The living Aurora sphere is the centrepiece — max one per screen.
    const wrapper = await mountViewer();
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
  });

  it('renders the six Knowledge Layer cards (reference scatter)', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.findAll('.alg-aquario__card')).toHaveLength(6);
  });

  it('has NO ingestion dropzone (the "black split panel" was removed)', async () => {
    // Round-6: the dropzone split the page into a second dark panel; the
    // reference (Ref design 2) is one clean canvas, so it is gone.
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-brain-dropzone').exists()).toBe(false);
  });

  it('has NO editorial header (Ref design 2 is a header-less canvas)', async () => {
    const wrapper = await mountViewer();
    expect(wrapper.find('.alg-aquario__eyebrow').exists()).toBe(false);
    expect(wrapper.find('.alg-aquario__title').exists()).toBe(false);
  });
});

describe('BrainViewer — empty/failed backend still shows the demo hub', () => {
  // The Aurora hub is a frontend-only showpiece; an empty or failed backend
  // load must NOT hide it behind an empty-state or error screen (the live-QA
  // bug). Mirrors the CRM demo-board philosophy: empty/error → show demo.

  it('renders the Aurora hub when compiled truth is absent (empty)', async () => {
    brainService.fetchCompiledTruth.mockResolvedValue({
      meta: {},
      content: '',
    });
    const wrapper = mount(BrainViewer);
    await flushPromises();
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
    // No legacy empty-state onboarding.
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(false);
  });

  it('renders the Aurora hub (not an error screen) when the service throws', async () => {
    brainService.fetchCompiledTruth.mockRejectedValue(new Error('network'));
    const wrapper = mount(BrainViewer);
    await flushPromises();
    // No "Could not load Brain" error alert — the demo hub renders instead.
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
    expect(wrapper.findAll('.alg-aquario__card')).toHaveLength(6);
  });
});

describe('BrainViewer — account-id reactivity (watch reload path)', () => {
  // accountId is a real ref, so watch(accountId, …) is a valid source. Mutating
  // it must drive a fresh compiled-truth fetch — the reload path the round-2
  // mock (a plain { value } object) silently never exercised.

  it('does not gate the hub on a fetch and reloads when the account id changes', async () => {
    const wrapper = mount(BrainViewer);
    await flushPromises();
    // Mounted with id=1 → one fetch on mount, and the hub renders regardless.
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
    expect(brainService.fetchCompiledTruth).toHaveBeenCalledWith(1);

    // Isolate the watcher-driven call: forget the mount fetch, then drive the
    // ref so the watch(accountId, …) reload path is the only thing under test.
    brainService.fetchCompiledTruth.mockClear();
    accountIdRef.value = 7;
    await flushPromises();
    // The watcher fired and refetched for the NEW account id (the reload path
    // the round-2 plain-object mock could never exercise).
    expect(brainService.fetchCompiledTruth).toHaveBeenCalledWith(7);
    expect(brainService.fetchCompiledTruth).toHaveBeenLastCalledWith(7);
    // And the hub is still up after the reload.
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);

    wrapper.unmount();
  });

  it('renders the hub with NO account id and never gets stuck loading', async () => {
    // Tenant where the account id is not hydrated at mount: loadBrain never runs,
    // isLoading stays false, the Aquário renders immediately (no forever spinner).
    accountIdRef.value = null;
    brainService.fetchCompiledTruth.mockClear();
    const wrapper = mount(BrainViewer);
    await flushPromises();
    expect(wrapper.find('.alg-aquario').exists()).toBe(true);
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
    // No spinner, and no fetch was attempted without an account id.
    expect(wrapper.find('.alg-brain-loading').exists()).toBe(false);
    expect(brainService.fetchCompiledTruth).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});
