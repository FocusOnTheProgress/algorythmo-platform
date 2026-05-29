import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgSunburstOrb from '../AlgSunburstOrb.vue';

describe('AlgSunburstOrb', () => {
  it('renders a constellation of dots', () => {
    const wrapper = mount(AlgSunburstOrb);
    expect(wrapper.findAll('.alg-sunburst-orb__dot').length).toBeGreaterThan(
      100
    );
  });

  it('scales the dot count with the ray count', () => {
    const few = mount(AlgSunburstOrb, { props: { rays: 8 } });
    const many = mount(AlgSunburstOrb, { props: { rays: 18 } });
    expect(many.findAll('.alg-sunburst-orb__dot').length).toBeGreaterThan(
      few.findAll('.alg-sunburst-orb__dot').length
    );
  });

  it('renders dots in pure white (monochrome — never coloured)', () => {
    const wrapper = mount(AlgSunburstOrb);
    const fills = wrapper
      .findAll('.alg-sunburst-orb__dot')
      .map(d => d.attributes('fill'));
    expect(fills.every(f => f === '#ffffff')).toBe(true);
  });

  it('is decorative (aria-hidden) — it carries no semantic text', () => {
    const wrapper = mount(AlgSunburstOrb);
    expect(wrapper.attributes('aria-hidden')).toBe('true');
  });

  it('sizes the envelope by the size prop', () => {
    const wrapper = mount(AlgSunburstOrb, { props: { size: 320 } });
    expect(wrapper.attributes('style')).toContain('320px');
  });
});
