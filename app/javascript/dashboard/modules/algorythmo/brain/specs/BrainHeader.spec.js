// algorythmo: BrainHeader — Aurora identity strip spec (plan 0012).
//
// The orb is CONTAINED (one instance, inside the strip), stats are LIVE (real
// pages/edges, honest 0 on empty), and the loading state shimmers rather than
// spins. "cresceu há Xd" only shows with a real last-event timestamp.
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainHeader from '../BrainHeader.vue';

function mountHeader(props = {}) {
  return mount(BrainHeader, { props });
}

describe('BrainHeader — contained Aurora orb', () => {
  it('renders exactly one Aurora orb, inside the header strip', () => {
    const wrapper = mountHeader({ stats: { pages: 0, edges: 0 } });
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
    expect(
      wrapper.find('.alg-brain-header__orb .alg-aurora-orb').exists()
    ).toBe(true);
  });
});

describe('BrainHeader — live stats', () => {
  it('shows formatted page and edge counts', () => {
    const wrapper = mountHeader({ stats: { pages: 12, edges: 1340 } });
    const text = wrapper.find('.alg-brain-header__stats').text();
    expect(text).toContain('12');
    // The thousands separator follows the runtime locale (',' or '.'); assert
    // the grouped digits are present rather than a specific separator.
    const grouped = new Intl.NumberFormat().format(1340);
    expect(text).toContain(grouped);
  });

  it('reads honest zeros on an empty brain (0 is not an error)', () => {
    const wrapper = mountHeader({ stats: { pages: 0, edges: 0 } });
    const values = wrapper
      .findAll('.alg-brain-header__stat-value')
      .map(n => n.text());
    expect(values[0]).toBe('0');
    expect(values[1]).toBe('0');
  });

  it('shimmers (no spinner) while loading', () => {
    const wrapper = mountHeader({ isLoading: true, stats: null });
    expect(wrapper.find('.alg-brain-header__shimmer').exists()).toBe(true);
    // No numeric value is shown mid-load.
    expect(
      wrapper.find('.alg-brain-header__stats').attributes('aria-busy')
    ).toBe('true');
  });
});

describe('BrainHeader — "grew" recency', () => {
  it('shows a relative "grew" label when a last event exists', () => {
    const twoDaysAgo = new Date(
      Date.now() - 2 * 24 * 3600 * 1000
    ).toISOString();
    const wrapper = mountHeader({
      stats: { pages: 3, edges: 9 },
      lastGrewAt: twoDaysAgo,
    });
    expect(wrapper.find('.alg-brain-header__stat--grew').exists()).toBe(true);
    expect(wrapper.find('.alg-brain-header__stat--grew').text()).toContain(
      '2d ago'
    );
  });

  it('omits the "grew" stat when the brain has no events', () => {
    const wrapper = mountHeader({
      stats: { pages: 0, edges: 0 },
      lastGrewAt: null,
    });
    expect(wrapper.find('.alg-brain-header__stat--grew').exists()).toBe(false);
  });
});
