// algorythmo: Brain Aquário (knowledge hub) — unit spec.
//
// The Aquário was redesigned into the Aurora knowledge hub: the living Aurora
// sphere (AlgAuroraOrb) at the centre as the knowledge core, surrounded by
// glass tiles (AlgGlassTile) presenting the company's knowledge layers. This
// spec asserts that structure — most importantly that AlgAuroraOrb is actually
// mounted (the component was previously dead) and that the four layer tiles
// render with their numerals.
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainAquario from '../BrainAquario.vue';
import {
  AlgAuroraOrb,
  AlgGlassTile,
} from 'dashboard/components-next/algorythmo';

function mountAquario() {
  return mount(BrainAquario);
}

describe('BrainAquario (knowledge hub)', () => {
  it('renders the aquário root with an aria-label', () => {
    const wrapper = mountAquario();
    const root = wrapper.find('.alg-aquario');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBeTruthy();
  });

  it('mounts the Aurora orb at the centre as the living knowledge core', () => {
    // Resolves the dead-component finding: AlgAuroraOrb must actually render.
    const wrapper = mountAquario();
    const orb = wrapper.findComponent(AlgAuroraOrb);
    expect(orb.exists()).toBe(true);
    // The hub wires the maximum conduit count (DESIGN.md caps at 6).
    expect(Number(orb.props('conduits'))).toBe(6);
    // The orb renders exactly one sphere (max one Aurora instance per screen).
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(6);
  });

  it('presents exactly four knowledge-layer glass tiles', () => {
    const wrapper = mountAquario();
    expect(wrapper.findAllComponents(AlgGlassTile)).toHaveLength(4);
  });

  it('each layer tile shows a non-empty label and a numeral value', () => {
    const wrapper = mountAquario();
    const tiles = wrapper.findAllComponents(AlgGlassTile);
    tiles.forEach(tile => {
      expect(tile.props('label').trim().length).toBeGreaterThan(0);
      // Demo values are integer numerals (e.g. 192 / 322 / 237 / 88).
      expect(String(tile.props('value'))).toMatch(/^\d+$/);
    });
  });

  it('surfaces the four demo numerals from the mockup', () => {
    const wrapper = mountAquario();
    const text = wrapper.text();
    ['192', '322', '237', '88'].forEach(n => {
      expect(text).toContain(n);
    });
  });

  it('renders the editorial header (eyebrow + title + subtitle)', () => {
    const wrapper = mountAquario();
    expect(wrapper.find('.alg-aquario__eyebrow').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__title').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__subtitle').text().trim()).not.toBe('');
  });

  it('marks the demo data with the demonstration watermark', () => {
    const wrapper = mountAquario();
    const watermark = wrapper.find('.alg-aquario__watermark');
    expect(watermark.exists()).toBe(true);
    expect(watermark.attributes('aria-hidden')).toBe('true');
    expect(watermark.text().trim()).not.toBe('');
  });
});
