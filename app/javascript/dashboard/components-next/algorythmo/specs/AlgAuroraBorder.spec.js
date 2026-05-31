// algorythmo: plan 0011 Stream C — AlgAuroraBorder unit spec
//
// The travelling beam is the MOST scarred surface (requested 3+ times, kept
// rendering static). The motion itself is CSS (conic + @property, in the global
// engine stylesheet — not testable in jsdom). What we CAN and MUST lock here is
// the structural contract the CSS depends on, so a refactor cannot silently
// re-break the comet:
//   - the three-layer structure exists (frame ring + beam arc + content);
//   - the beam element carries the class the global @keyframes/@property + the
//     reduced-motion EXCEPTION key off (.alg-aurora-border__beam). If this class
//     is renamed, the _tokens.scss reduced-motion exception stops matching and
//     the founder's Windows machine sees a dead beam again — this guards that;
//   - per-instance CSS vars (radius / thickness / opacity) are wired;
//   - the beam is WHITE/ICE universal: the component does NOT set a per-sector
//     hue var on the beam (founder Brief v3: the beam is branco, no sector tint).
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgAuroraBorder from '../AlgAuroraBorder.vue';

function mountBorder(props = {}, slots = {}) {
  return mount(AlgAuroraBorder, { props, slots });
}

describe('AlgAuroraBorder', () => {
  it('renders the three-layer structure (frame ring, travelling beam, content)', () => {
    const wrapper = mountBorder({}, { default: '<p class="kid">hi</p>' });
    expect(wrapper.find('.alg-aurora-border').exists()).toBe(true);
    expect(wrapper.find('.alg-aurora-border__frame').exists()).toBe(true);
    // The beam class is the anchor the global @property/@keyframes AND the
    // reduced-motion exception in _tokens.scss key off — renaming it re-breaks
    // the beam on reduced-motion machines.
    expect(wrapper.find('.alg-aurora-border__beam').exists()).toBe(true);
    expect(wrapper.find('.alg-aurora-border__content').exists()).toBe(true);
    expect(wrapper.find('.kid').exists()).toBe(true);
  });

  it('renders the requested semantic element', () => {
    const wrapper = mountBorder({ as: 'section' });
    expect(wrapper.element.tagName).toBe('SECTION');
  });

  it('wires per-instance radius + thickness CSS vars', () => {
    const wrapper = mountBorder({
      radius: 'var(--alg-radius-2xl)',
      thickness: '2px',
    });
    const style = wrapper.attributes('style') || '';
    expect(style).toContain('--alg-border-radius: var(--alg-radius-2xl)');
    expect(style).toContain('--alg-border-thickness: 2px');
  });

  it('maps intensity to a border-opacity var (subtle vs normal)', () => {
    const subtle = mountBorder({ intensity: 'subtle' });
    expect(subtle.attributes('style')).toContain('--alg-border-opacity: 0.55');
    const normal = mountBorder({ intensity: 'normal' });
    expect(normal.attributes('style')).toContain('--alg-border-opacity: 0.9');
  });

  it('does NOT set a per-sector hue var on the instance (beam is WHITE/ICE universal)', () => {
    // Founder Brief v3: "o feixe de luz da borda dos agentes deve ser branco."
    // The component must never inject a sector hue onto the beam — the white/ICE
    // beam is hard-coded in the global stylesheet, independent of sector.
    const wrapper = mountBorder();
    const style = wrapper.attributes('style') || '';
    expect(style).not.toContain('--alg-sector-hue');
    expect(style).not.toContain('--alg-beam-h');
  });

  it('adds the active modifier when active (quickens the arc via CSS)', () => {
    const wrapper = mountBorder({ active: true });
    expect(wrapper.classes()).toContain('alg-aurora-border--active');
  });

  it('composes elevation + glow into a single box-shadow (grounded, not flat)', () => {
    const wrapper = mountBorder({
      glow: true,
      elevation: 'var(--alg-elevation-2)',
    });
    const style = wrapper.attributes('style') || '';
    expect(style).toContain('var(--alg-elevation-2)');
    expect(style).toContain('var(--alg-aurora-border-glow)');
  });

  it('marks the frame aria-hidden (decorative, not announced)', () => {
    const wrapper = mountBorder();
    expect(
      wrapper.find('.alg-aurora-border__frame').attributes('aria-hidden')
    ).toBe('true');
  });
});
