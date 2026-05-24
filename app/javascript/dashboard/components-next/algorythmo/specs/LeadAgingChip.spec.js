// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import LeadAgingChip from '../LeadAgingChip.vue';

const GLYPHS = {
  neutral: '—',
  green: '\u25CF',
  yellow: '\u25D0',
  red: '\u25CB',
};

const mountChip = (overrides = {}) =>
  mount(LeadAgingChip, {
    props: {
      state: 'green',
      timeHuman: '3h',
      ariaLabel: 'há 3 horas nesta etapa',
      ...overrides,
    },
  });

describe('LeadAgingChip', () => {
  describe('per-state rendering (CONTRACT_M1B §4)', () => {
    it.each(['neutral', 'green', 'yellow', 'red'])(
      'renders state="%s" with the correct data-state and glyph',
      state => {
        const wrapper = mountChip({ state });
        const chip = wrapper.find('[data-testid="lead-aging-chip"]');
        expect(chip.exists()).toBe(true);
        expect(chip.attributes('data-state')).toBe(state);
        const glyph = wrapper.find('[data-testid="lead-aging-chip-glyph"]');
        expect(glyph.text()).toBe(GLYPHS[state]);
        expect(glyph.attributes('aria-hidden')).toBe('true');
      }
    );
  });

  describe('label and aria-label propagation', () => {
    it('renders timeHuman in the label span', () => {
      const wrapper = mountChip({ timeHuman: '2d' });
      expect(wrapper.find('[data-testid="lead-aging-chip-label"]').text()).toBe(
        '2d'
      );
    });

    it('propagates ariaLabel to the outer chip span', () => {
      const wrapper = mountChip({ ariaLabel: 'há 2 dias nesta etapa' });
      expect(
        wrapper.find('[data-testid="lead-aging-chip"]').attributes('aria-label')
      ).toBe('há 2 dias nesta etapa');
    });
  });

  describe('defensive fallback on invalid state', () => {
    it('falls back to "neutral" when the state prop is unexpected', () => {
      // Suppress the prop-validator warning that Vue logs in dev mode so the
      // test output stays clean; the warning itself is expected behaviour.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const wrapper = mountChip({ state: 'magenta' });
        const chip = wrapper.find('[data-testid="lead-aging-chip"]');
        expect(chip.attributes('data-state')).toBe('neutral');
        expect(
          wrapper.find('[data-testid="lead-aging-chip-glyph"]').text()
        ).toBe(GLYPHS.neutral);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
