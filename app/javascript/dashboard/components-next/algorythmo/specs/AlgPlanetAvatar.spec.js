import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgPlanetAvatar from '../AlgPlanetAvatar.vue';

describe('AlgPlanetAvatar', () => {
  it('renders an accessible img with the agent name', () => {
    const wrapper = mount(AlgPlanetAvatar, { props: { name: 'Manu' } });
    expect(wrapper.attributes('role')).toBe('img');
    expect(wrapper.attributes('aria-label')).toContain('Manu');
  });

  it('is deterministic — same name produces the same planet markup', () => {
    const a = mount(AlgPlanetAvatar, { props: { name: 'Cortex' } });
    const b = mount(AlgPlanetAvatar, { props: { name: 'Cortex' } });
    // Gradient stops encode the chosen palette slot; equal name → equal stops.
    const stopsA = a.findAll('stop').map(s => s.attributes('stop-color'));
    const stopsB = b.findAll('stop').map(s => s.attributes('stop-color'));
    expect(stopsA).toEqual(stopsB);
  });

  it('spreads agents across the curated palette band', () => {
    // With a finite 6-slot palette, two names can share a slot — but a healthy
    // hash spreads a realistic agent roster across multiple slots.
    const names = ['Manu', 'Cortex', 'Atlas', 'Vega', 'Nova', 'Orion', 'Iris'];
    const cores = new Set(
      names.map(name =>
        mount(AlgPlanetAvatar, { props: { name } })
          .find('stop')
          .attributes('stop-color')
      )
    );
    expect(cores.size).toBeGreaterThan(1);
  });

  it('differentiates same-palette planets by band rotation', () => {
    // Two names in the same palette slot still render distinct planets: the
    // atmospheric band rotation is driven by separate hash bits.
    const a = mount(AlgPlanetAvatar, { props: { name: 'Atlas' } });
    const b = mount(AlgPlanetAvatar, { props: { name: 'Vega' } });
    const rotA = a.find('.alg-planet-avatar__bands').attributes('style');
    const rotB = b.find('.alg-planet-avatar__bands').attributes('style');
    expect(rotA).not.toBe(rotB);
  });

  it('honours seed over name for stable agent-id pinning', () => {
    const byName = mount(AlgPlanetAvatar, { props: { name: 'A' } });
    const bySeedSameId = mount(AlgPlanetAvatar, {
      props: { name: 'Different Display', seed: 'A' },
    });
    const a = byName.find('stop').attributes('stop-color');
    const b = bySeedSameId.find('stop').attributes('stop-color');
    expect(a).toBe(b);
  });

  it('uses Aurora-family hues only (never an arbitrary rainbow hue)', () => {
    const allowedHues = [350, 12, 295, 75, 185, 265];
    const wrapper = mount(AlgPlanetAvatar, { props: { name: 'Nova' } });
    const core = wrapper.find('stop').attributes('stop-color');
    const hue = Number(core.match(/oklch\([^)]*?\s(\d+)\)/)[1]);
    expect(allowedHues).toContain(hue);
  });

  it('sizes the SVG by the size prop', () => {
    const sm = mount(AlgPlanetAvatar, { props: { name: 'X', size: 'sm' } });
    const lg = mount(AlgPlanetAvatar, { props: { name: 'X', size: 'lg' } });
    expect(sm.find('svg').attributes('width')).toBe('24');
    expect(lg.find('svg').attributes('width')).toBe('48');
  });
});
