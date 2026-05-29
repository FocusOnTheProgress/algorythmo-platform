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
