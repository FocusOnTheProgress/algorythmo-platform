// algorythmo: BrainTabVer — "Ver" tab spec (plan 0012 §9).
//
// Locks the four states the founder cares about: data (status badges), empty
// (honest, no fixture), loading (skeleton, not a spinner), error (retry). And
// that each document.status enum maps to the right badge.
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainTabVer from '../BrainTabVer.vue';

function mountVer(props = {}) {
  return mount(BrainTabVer, {
    props: { documents: [], isLoading: false, hasError: false, ...props },
  });
}

const DOCS = [
  {
    id: 1,
    filename: 'politica-trocas.pdf',
    category: 'policies',
    status: 'captured',
    last_error: null,
    created_at: '2026-06-01T10:00:00Z',
  },
  {
    id: 2,
    filename: 'manual.docx',
    category: 'manuals',
    status: 'extracting',
    last_error: null,
    created_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 3,
    filename: 'fila.txt',
    category: 'other',
    status: 'pending',
    last_error: null,
    created_at: '2026-06-02T11:00:00Z',
  },
  {
    id: 4,
    filename: 'quebrado.pdf',
    category: 'rules',
    status: 'failed',
    last_error: 'no embeddings',
    created_at: '2026-06-02T12:00:00Z',
  },
];

describe('BrainTabVer — data state', () => {
  it('renders one row per document', () => {
    const wrapper = mountVer({ documents: DOCS });
    expect(wrapper.findAll('.alg-brain-ver__row')).toHaveLength(4);
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(false);
  });

  it('maps status enum to the correct badge tone', () => {
    const wrapper = mountVer({ documents: DOCS });
    const badges = wrapper.findAll('.alg-brain-ver__badge');
    expect(badges[0].classes()).toContain('alg-brain-ver__badge--ok'); // captured
    expect(badges[1].classes()).toContain('alg-brain-ver__badge--pending'); // extracting
    expect(badges[2].classes()).toContain('alg-brain-ver__badge--pending'); // pending
    expect(badges[3].classes()).toContain('alg-brain-ver__badge--fail'); // failed
  });

  it('shows the last_error on a failed document', () => {
    const wrapper = mountVer({ documents: DOCS });
    expect(wrapper.find('.alg-brain-ver__error-detail').text()).toBe(
      'no embeddings'
    );
  });
});

describe('BrainTabVer — empty state (honest, no fixture)', () => {
  it('renders the honest empty state when there are no documents', () => {
    const wrapper = mountVer({ documents: [] });
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(true);
    expect(wrapper.find('.alg-brain-empty__title').text()).toBe(
      'No knowledge yet'
    );
    expect(wrapper.findAll('.alg-brain-ver__row')).toHaveLength(0);
  });
});

describe('BrainTabVer — loading state', () => {
  it('renders skeleton rows (no spinner) while loading', () => {
    const wrapper = mountVer({ isLoading: true });
    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true);
    expect(
      wrapper.findAll('.alg-brain-ver__row--skeleton').length
    ).toBeGreaterThan(0);
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(false);
  });
});

describe('BrainTabVer — error state', () => {
  it('renders an alert with retry on error', async () => {
    const wrapper = mountVer({ hasError: true });
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.find('.alg-brain-empty').exists()).toBe(false);
    await wrapper.find('.alg-brain-ver__retry').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
});
