// algorythmo: Brain Aquário (knowledge hub) — unit spec.
//
// Round-5 rebuild (aligned 1:1 to Ref design 2's density). The Aurora sphere is
// the radiant HUB at the centre of a grid, surrounded by SIX "Knowledge Layer"
// cards in the reference's scatter — three across the top (Source / Human / Agent
// Interaction), two flanking the orb (Auto / Tool Interaction), and a totalizer
// below (493 in use). Each layer-type card has a count + a "<Kind> Knowledge
// Layers" title + a description; the totalizer is a single-line summary. Ice
// beams reach from the orb to each card. A signature ingestion dropzone sits below.
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

  it('presents the reference scatter of six Knowledge Layer cards, each with count, kind and body', () => {
    const wrapper = mountAquario();
    const cards = wrapper.findAll('.alg-aquario__card');
    // Ref design 2 density: 3 across the top, 2 flanking the orb, 1 totalizer.
    expect(cards).toHaveLength(6);
    cards.forEach(card => {
      expect(card.find('.alg-aquario__card-count').text().trim()).toMatch(
        /^[\d.,]+$/
      );
      expect(card.find('.alg-aquario__card-kind').text().trim()).not.toBe('');
      expect(card.find('.alg-aquario__card-body').text().trim()).not.toBe('');
    });
  });

  it('labels the five layer-type cards "Knowledge Layers" and includes the four canonical kinds', () => {
    const wrapper = mountAquario();
    // Five layer-type cards carry the "<Kind> Knowledge Layers" suffix; the
    // sixth is the totalizer (single-line title, no suffix).
    const suffixes = wrapper
      .findAll('.alg-aquario__card-suffix')
      .map(s => s.text().trim());
    expect(suffixes).toHaveLength(5);
    suffixes.forEach(s => expect(s).toBe('Knowledge Layers'));
    // The four canonical kinds are present.
    const kinds = wrapper
      .findAll('.alg-aquario__card-kind')
      .map(k => k.text().trim());
    expect(kinds).toEqual(
      expect.arrayContaining(['Source', 'Human', 'Auto', 'Agent Interaction'])
    );
  });

  it('includes the totalizer card (493 in use) with a single-line title', () => {
    const wrapper = mountAquario();
    const total = wrapper.find('.alg-aquario__card--total');
    expect(total.exists()).toBe(true);
    expect(total.find('.alg-aquario__card-count').text().trim()).toBe('493');
    // The totalizer is a summary, not a "<Kind> Knowledge Layers" card.
    expect(total.find('.alg-aquario__card-suffix').exists()).toBe(false);
    expect(total.find('.alg-aquario__card-kind').text().trim()).not.toBe('');
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
    expect(wrapper.findAll('[data-alg-card]')).toHaveLength(6);
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
