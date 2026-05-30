// algorythmo: Brain Aquário (knowledge hub) — unit spec.
//
// Round-4 rebuild (faithful to Ref design 2). The Aurora sphere is structurally
// the HUB at the centre column of a grid, surrounded by the FOUR canonical
// "Knowledge Layer" cards (Source / Human / Auto / Agent Interaction), each with
// a count + a "<Kind> Knowledge Layers" title + a short description. Ice beams
// reach from the orb to each card. A signature ingestion dropzone sits below.
//
// This spec asserts that structure — most importantly: AlgAuroraOrb is mounted
// exactly once (max one Aurora per screen), fed ice-toned aimed beams that match
// the cards (no symmetric clock rays), the cards carry Knowledge-Layer content,
// and — critically — NO lead/CRM data leaks into the Brain.
//
// Motion One is WAAPI-backed and not meaningful in jsdom; we mock it so the
// component's mount-time card reveal (useAlgMotion) doesn't touch a real WAAPI.
import { describe, it, expect, vi } from 'vitest';

vi.mock('motion', () => ({
  animate: vi.fn(() => ({ finished: Promise.resolve() })),
  stagger: vi.fn((each, opts) => ({ __stagger: each, ...opts })),
}));

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

  it('drives the orb with the ice beam tone (Brain hub direction)', () => {
    const wrapper = mountAquario();
    const orb = wrapper.findComponent(AlgAuroraOrb);
    expect(orb.props('beam')).toBe('ice');
  });

  it('feeds the orb hand-aimed beams, one per surrounding card', () => {
    const wrapper = mountAquario();
    const orb = wrapper.findComponent(AlgAuroraOrb);
    const aimed = orb.props('aimedConduits');
    const cards = wrapper.findAll('.alg-aquario__card');
    expect(Array.isArray(aimed)).toBe(true);
    expect(aimed.length).toBe(cards.length);
    aimed.forEach(c => {
      expect(typeof c.angle).toBe('number');
      expect(c.length).toBeGreaterThan(0);
    });
    // The orb renders one beam element per aimed ray.
    expect(wrapper.findAll('.alg-aurora-orb__conduit')).toHaveLength(
      aimed.length
    );
  });

  it('presents the four canonical Knowledge Layers, each with count, title and body', () => {
    const wrapper = mountAquario();
    const cards = wrapper.findAll('.alg-aquario__card');
    // Source / Human / Auto / Agent Interaction — exactly four (Ref design 2).
    expect(cards).toHaveLength(4);
    cards.forEach(card => {
      expect(card.find('.alg-aquario__card-count').text().trim()).toMatch(
        /^[\d.,]+$/
      );
      expect(card.find('.alg-aquario__card-kind').text().trim()).not.toBe('');
      expect(card.find('.alg-aquario__card-suffix').text().trim()).not.toBe('');
      expect(card.find('.alg-aquario__card-body').text().trim()).not.toBe('');
    });
  });

  it('labels every card as a "Knowledge Layers" layer', () => {
    const wrapper = mountAquario();
    const suffixes = wrapper
      .findAll('.alg-aquario__card-suffix')
      .map(s => s.text().trim());
    expect(suffixes).toHaveLength(4);
    suffixes.forEach(s => expect(s).toBe('Knowledge Layers'));
    // The four canonical kinds are present.
    const kinds = wrapper
      .findAll('.alg-aquario__card-kind')
      .map(k => k.text().trim());
    expect(kinds).toEqual(
      expect.arrayContaining(['Source', 'Human', 'Auto', 'Agent Interaction'])
    );
  });

  it('contains NO lead / CRM data anywhere in the Brain', () => {
    const wrapper = mountAquario();
    const text = wrapper.text().toLowerCase();
    // The prior round leaked a CRM lead ("Maria Silva → Qualified", moved by
    // João, sales team). None of that vocabulary belongs in the Brain.
    [
      'lead',
      'maria silva',
      'qualific',
      'comercial',
      'sales team',
      'joão',
    ].forEach(token => expect(text).not.toContain(token));
  });

  it('surfaces a single coherent living-layer count in the core', () => {
    const wrapper = mountAquario();
    const count = wrapper.find('.alg-aquario__core-count');
    expect(count.exists()).toBe(true);
    expect(count.text().trim()).toMatch(/^[\d.,]+$/);
    expect(wrapper.find('.alg-aquario__core-label').text().trim()).not.toBe('');
  });

  it('renders the editorial header (eyebrow + title + subtitle)', () => {
    const wrapper = mountAquario();
    expect(wrapper.find('.alg-aquario__eyebrow').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__title').text().trim()).not.toBe('');
    expect(wrapper.find('.alg-aquario__subtitle').text().trim()).not.toBe('');
  });

  it('marks the cards as reveal targets for the motion system', () => {
    const wrapper = mountAquario();
    // The cards must be wired to animate in (entrance/stagger via useAlgMotion).
    expect(wrapper.findAll('[data-alg-card]')).toHaveLength(4);
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
