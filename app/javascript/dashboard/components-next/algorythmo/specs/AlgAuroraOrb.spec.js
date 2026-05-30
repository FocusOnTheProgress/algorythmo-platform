import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgAuroraOrb from '../AlgAuroraOrb.vue';

describe('AlgAuroraOrb', () => {
  it('renders the sphere, halo and beam', () => {
    const wrapper = mount(AlgAuroraOrb);
    expect(wrapper.find('.alg-aurora-orb__sphere').exists()).toBe(true);
    expect(wrapper.find('.alg-aurora-orb__halo').exists()).toBe(true);
    expect(wrapper.find('.alg-aurora-orb__beam').exists()).toBe(true);
  });

  it('renders no conduits by default', () => {
    const wrapper = mount(AlgAuroraOrb);
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(0);
  });

  it('renders the requested number of conduits', () => {
    const wrapper = mount(AlgAuroraOrb, { props: { conduits: 4 } });
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(4);
  });

  it('caps conduits at 6', () => {
    const wrapper = mount(AlgAuroraOrb, { props: { conduits: 6 } });
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(6);
  });

  it('renders one conduit per aimed ray when aimedConduits is given', () => {
    const wrapper = mount(AlgAuroraOrb, {
      props: {
        aimedConduits: [
          { angle: 209, length: 188 },
          { angle: 29, length: 150, delay: 0.5 },
        ],
      },
    });
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(2);
  });

  it('aimed conduits take precedence over the count-based conduits prop', () => {
    const wrapper = mount(AlgAuroraOrb, {
      props: {
        conduits: 6,
        aimedConduits: [{ angle: 90, length: 120 }],
      },
    });
    // The explicit aimed ray wins — not the 6 symmetric clock rays.
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(1);
  });

  it('applies the active modifier when processing', () => {
    const wrapper = mount(AlgAuroraOrb, { props: { active: true } });
    expect(wrapper.classes()).toContain('alg-aurora-orb--active');
  });

  it('exposes an accessible label', () => {
    const wrapper = mount(AlgAuroraOrb);
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toBeTruthy();
  });
});
