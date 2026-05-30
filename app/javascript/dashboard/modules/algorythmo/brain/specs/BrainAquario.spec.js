// algorythmo: Brain Aquário (knowledge hub) — unit spec.
//
// Round-3 rebuild. The Aurora sphere is structurally the HUB at the centre of a
// grid, surrounded by six LIVING glass knowledge cards (recent company docs /
// facts / decisions), with hand-aimed conduits reaching from the orb to each
// card. A signature ingestion dropzone (AlgAuroraBorder + glow) sits below.
// This spec asserts that structure — most importantly that AlgAuroraOrb is
// mounted exactly once (max one Aurora per screen) and is fed aimed conduits
// that match the surrounding cards (no symmetric clock rays that slice cards).
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainAquario from '../BrainAquario.vue';
import BrainDropzone from '../BrainDropzone.vue';
import { AlgAuroraOrb } from 'dashboard/components-next/algorythmo';

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

  it('mounts exactly one Aurora orb as the living knowledge core', () => {
    const wrapper = mountAquario();
    const orbs = wrapper.findAllComponents(AlgAuroraOrb);
    // Max one Aurora instance per screen — placing two is a ship-blocking bug.
    expect(orbs).toHaveLength(1);
    expect(wrapper.findAll('.alg-aurora-orb__sphere')).toHaveLength(1);
  });

  it('feeds the orb hand-aimed conduits, one per surrounding card', () => {
    const wrapper = mountAquario();
    const orb = wrapper.findComponent(AlgAuroraOrb);
    const aimed = orb.props('aimedConduits');
    const cards = wrapper.findAll('.alg-aquario__card');
    // One aimed ray per card — irregular angles, explicit lengths (connect, not
    // a symmetric clock that slices). Count must match the cards on screen.
    expect(Array.isArray(aimed)).toBe(true);
    expect(aimed.length).toBe(cards.length);
    aimed.forEach(c => {
      expect(typeof c.angle).toBe('number');
      expect(c.length).toBeGreaterThan(0);
    });
    // The orb actually renders one conduit element per aimed ray.
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(
      aimed.length
    );
  });

  it('presents six living knowledge cards, each with a label, title and body', () => {
    const wrapper = mountAquario();
    const cards = wrapper.findAll('.alg-aquario__card');
    expect(cards).toHaveLength(6);
    cards.forEach(card => {
      expect(card.find('.alg-aquario__card-label').text().trim()).not.toBe('');
      expect(card.find('.alg-aquario__card-title').text().trim()).not.toBe('');
      expect(card.find('.alg-aquario__card-body').text().trim()).not.toBe('');
    });
  });

  it('surfaces a single coherent living-layer count in the core', () => {
    const wrapper = mountAquario();
    const count = wrapper.find('.alg-aquario__core-count');
    expect(count.exists()).toBe(true);
    // One number, integer numeral, seated under the orb (not four orphans).
    expect(count.text().trim()).toMatch(/^[\d.,]+$/);
    expect(wrapper.find('.alg-aquario__core-label').text().trim()).not.toBe('');
  });

  it('renders the editorial header (eyebrow + title + subtitle)', () => {
    const wrapper = mountAquario();
    expect(wrapper.find('.alg-aquario__eyebrow').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__title').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__subtitle').text().trim()).not.toBe('');
  });

  it('mounts the signature ingestion dropzone below the stage', () => {
    const wrapper = mountAquario();
    expect(wrapper.findComponent(BrainDropzone).exists()).toBe(true);
  });

  it('marks the demo data with the demonstration watermark', () => {
    const wrapper = mountAquario();
    const watermark = wrapper.find('.alg-aquario__watermark');
    expect(watermark.exists()).toBe(true);
    expect(watermark.attributes('aria-hidden')).toBe('true');
    expect(watermark.text().trim()).not.toBe('');
  });
});
