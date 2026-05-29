<script setup>
// algorythmo: Cinematic OS glass primitive — KPI Glass Tile (DESIGN.md §5.11)
//
// The editorial KPI tile used across sector overviews. Glass material (via
// AlgGlassCard) with the canonical KPI anatomy: a mono uppercase micro-label
// (tracking widest), a large display value, and an optional caption/delta.
// Color is semantic exception only — the `tone` prop tints the delta, never
// the surface.
import { computed } from 'vue';
import AlgGlassCard from './AlgGlassCard.vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
  // Optional supporting line under the value (e.g. "+12% vs. semana anterior").
  caption: {
    type: String,
    default: '',
  },
  // Delta tone — semantic colour for the caption only. 'neutral' = no colour.
  tone: {
    type: String,
    default: 'neutral',
    validator: v =>
      ['neutral', 'success', 'warning', 'danger', 'info'].includes(v),
  },
});

const captionClass = computed(() => `alg-glass-tile__caption--${props.tone}`);
</script>

<template>
  <AlgGlassCard tier="soft" class="alg-glass-tile">
    <span class="alg-glass-tile__label">{{ label }}</span>
    <span class="alg-glass-tile__value">{{ value }}</span>
    <span v-if="caption" class="alg-glass-tile__caption" :class="captionClass">
      {{ caption }}
    </span>
  </AlgGlassCard>
</template>

<style lang="scss" scoped>
.alg-glass-tile {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-glass-tile__label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-glass-tile__value {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-2xl);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tightest);
  line-height: var(--alg-leading-tight);
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
}

.alg-glass-tile__caption {
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-secondary);
}

.alg-glass-tile__caption--success {
  color: var(--alg-color-success);
}
.alg-glass-tile__caption--warning {
  color: var(--alg-color-warning);
}
.alg-glass-tile__caption--danger {
  color: var(--alg-color-danger);
}
.alg-glass-tile__caption--info {
  color: var(--alg-color-info);
}
</style>
