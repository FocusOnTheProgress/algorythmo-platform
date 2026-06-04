<script setup>
// algorythmo: Brain — honest empty state (plan 0012).
//
// The whole point of this screen is that EMPTY is empty — no fixture-fantasma.
// A quiet, editorial empty: a hairline glyph, an editorial line, an optional
// hint. No illustration, no Aurora (the orb is the identity strip's; an empty
// tab is not where the living intelligence "speaks"). DESIGN.md: copy is design.
defineProps({
  glyph: { type: String, default: 'i-lucide-circle-dashed' },
  title: { type: String, required: true },
  body: { type: String, default: '' },
});
</script>

<template>
  <div class="alg-brain-empty" role="status">
    <span class="alg-brain-empty__glyph" :class="glyph" aria-hidden="true" />
    <p class="alg-brain-empty__title">{{ title }}</p>
    <p v-if="body" class="alg-brain-empty__body">{{ body }}</p>
  </div>
</template>

<style scoped lang="scss">
.alg-brain-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-3);
  padding: var(--alg-space-8) var(--alg-space-6);
  text-align: center;
  min-height: 220px;
}

.alg-brain-empty__glyph {
  width: 1.75rem;
  height: 1.75rem;
  color: var(--alg-fg-quaternary);
}

.alg-brain-empty__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-md);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-secondary);
}

.alg-brain-empty__body {
  margin: 0;
  max-width: 42ch;
  font-size: var(--alg-text-xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-tertiary);
}
</style>
