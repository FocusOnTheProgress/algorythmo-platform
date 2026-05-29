<script setup>
// algorythmo: Cinematic OS glass primitive — Glass Card (DESIGN.md §3.6, §5.3)
//
// A real-glass surface: backdrop-filter blur + saturate, hairline border,
// inset top highlight, elevation shadow, and the mandatory grain overlay (the
// visionOS tell). Falls back to a solid elevated surface where backdrop-filter
// is unsupported — never "fake glass" with rgba alone.
//
// This is the building block for panels and cards. KPI tiles use AlgGlassTile,
// which composes the same material at operational density.
import { computed } from 'vue';

const props = defineProps({
  // Glass blur tier — soft (panels), medium (drawers/hover), hard (overlays).
  tier: {
    type: String,
    default: 'soft',
    validator: v => ['soft', 'medium', 'hard'].includes(v),
  },
  // Render as an interactive surface (hover lift + focus ring + press).
  interactive: {
    type: Boolean,
    default: false,
  },
  // Semantic element. Use 'button' for clickable tiles so it is keyboard-native.
  as: {
    type: String,
    default: 'div',
  },
});

const tierClass = computed(() => `alg-glass-card--${props.tier}`);
</script>

<template>
  <component
    :is="as"
    class="alg-glass-card"
    :class="[tierClass, { 'alg-glass-card--interactive': interactive }]"
  >
    <span class="alg-glass-card__grain" aria-hidden="true" />
    <span class="alg-glass-card__content"><slot /></span>
  </component>
</template>

<style lang="scss" scoped>
.alg-glass-card {
  position: relative;
  display: block;
  border: 1px solid var(--alg-glass-border);
  border-radius: var(--alg-radius-lg);
  padding: var(--alg-space-card-padding);
  // Solid fallback first; @supports upgrades to real glass below.
  background: var(--alg-bg-elevated);
  box-shadow: var(--alg-glass-highlight), var(--alg-elevation-2);
  overflow: hidden;
  transition:
    border-color var(--alg-duration-base) var(--alg-ease-cinematic),
    box-shadow var(--alg-duration-base) var(--alg-ease-cinematic),
    transform var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-glass-card--soft {
  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-soft-bg);
    backdrop-filter: var(--alg-glass-soft-filter);
    -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  }
}

.alg-glass-card--medium {
  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-medium-bg);
    backdrop-filter: var(--alg-glass-medium-filter);
    -webkit-backdrop-filter: var(--alg-glass-medium-filter);
  }
}

.alg-glass-card--hard {
  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-hard-bg);
    backdrop-filter: var(--alg-glass-hard-filter);
    -webkit-backdrop-filter: var(--alg-glass-hard-filter);
  }
}

// Mandatory grain — the tell that separates real glass from rgba-on-rgba.
.alg-glass-card__grain {
  position: absolute;
  inset: 0;
  background-image: var(--alg-glass-grain);
  opacity: 0.6;
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}

.alg-glass-card__content {
  position: relative;
  display: block;
  z-index: 1;
}

.alg-glass-card--interactive {
  cursor: pointer;
  width: 100%;
  text-align: left;
  appearance: none;
  color: inherit;
  font: inherit;

  &:hover {
    border-color: var(--alg-glass-border-strong);
    box-shadow: var(--alg-glass-highlight), var(--alg-elevation-3);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }

  &:active {
    transform: translateY(0.5px) scale(0.998);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-glass-card--interactive:hover {
    transform: none;
  }
}
</style>
