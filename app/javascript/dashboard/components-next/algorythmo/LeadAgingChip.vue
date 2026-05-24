<script setup>
// algorythmo: feature-gate algorythmo_crm
// Visual aging indicator for a Lead within its current stage.
//
// Inputs (all required):
//   - state: one of 'neutral' | 'green' | 'yellow' | 'red' (CONTRACT_M1B §4)
//   - timeHuman: pre-formatted compact label ("3h", "2d") — see helper/algorythmo/timeFormat
//   - ariaLabel: full screen-reader sentence, computed by parent so the chip
//     can pluralise inside a Lead context ("há 3 horas nesta etapa")
//
// Dual-coding: every state is encoded BOTH by a colored background (CSS var)
// AND by a glyph (— / ● / ◐ / ○). Colour alone fails WCAG 1.4.1 for users
// with red-green vision deficiency; the glyph is the accessibility floor.
//
// Aging math itself (deciding which state to pass) lives in the LeadCard
// parent — this component is a pure presenter. Tests assert that.
import { computed } from 'vue';
import {
  LEAD_AGING_STATES,
  LEAD_AGING_GLYPH_BY_STATE,
} from './leadAgingChipConstants';

const props = defineProps({
  state: {
    type: String,
    required: true,
    validator: value => LEAD_AGING_STATES.includes(value),
  },
  timeHuman: {
    type: String,
    required: true,
  },
  ariaLabel: {
    type: String,
    required: true,
  },
});

// Defensive: a bad upstream payload should not break the layout. If the
// validator throws in production (warnings are stripped), fall back to
// 'neutral' so the chip still renders something coherent.
const safeState = computed(() =>
  LEAD_AGING_STATES.includes(props.state) ? props.state : 'neutral'
);

const glyph = computed(() => LEAD_AGING_GLYPH_BY_STATE[safeState.value]);
</script>

<template>
  <span
    class="alg-lead-aging-chip"
    data-testid="lead-aging-chip"
    :data-state="safeState"
    :aria-label="ariaLabel"
  >
    <span
      class="alg-lead-aging-chip__glyph"
      data-testid="lead-aging-chip-glyph"
      aria-hidden="true"
    >
      {{ glyph }}
    </span>
    <span
      class="alg-lead-aging-chip__label"
      data-testid="lead-aging-chip-label"
    >
      {{ timeHuman }}
    </span>
  </span>
</template>

<style lang="scss" scoped>
// All visual values resolve from CSS custom properties so a future tenant
// override in the Algorythmo design system flows through without touching
// this file. Defaults below are picked to meet WCAG AA (contrast ≥ 4.5)
// against the LeadCard background.
.alg-lead-aging-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
  background-color: var(--alg-aging-bg, transparent);
  color: var(--alg-aging-fg, currentColor);

  &[data-state='neutral'] {
    --alg-aging-bg: var(--alg-chip-neutral-bg, #e5e7eb);
    --alg-aging-fg: var(--alg-chip-neutral-fg, #374151);
  }
  &[data-state='green'] {
    --alg-aging-bg: var(--alg-chip-green-bg, #d1fae5);
    --alg-aging-fg: var(--alg-chip-green-fg, #065f46);
  }
  &[data-state='yellow'] {
    --alg-aging-bg: var(--alg-chip-yellow-bg, #fef3c7);
    --alg-aging-fg: var(--alg-chip-yellow-fg, #78350f);
  }
  &[data-state='red'] {
    --alg-aging-bg: var(--alg-chip-red-bg, #fee2e2);
    --alg-aging-fg: var(--alg-chip-red-fg, #7f1d1d);
  }
}

.alg-lead-aging-chip__glyph {
  font-size: 0.625rem;
  line-height: 1;
}
</style>
