<script setup>
// algorythmo: Stream E2 — Data Pill.
//
// When an AI cites a real OS figure, the text renders it as a visual link:
//   recomendo cortar [R$ 45k em Infra] 📊
// Clicking opens the source report. This is the inline "the number is real and
// traceable" affordance — a button, not decorative chrome, so it's keyboard-
// reachable and announces as a link to the source report.
//
// TODO(real-wiring): `figure.reportKey` becomes a real source-report id; the
// click opens that report instead of the demo stub panel.
import { useI18n } from 'vue-i18n';

defineProps({
  figure: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['open']);

const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="alg-cl-pill"
    :aria-label="
      t('ALGORYTHMO_ADMIN.C_LEVELS.PILL.OPEN_ARIA', {
        figure: t(figure.labelKey),
      })
    "
    @click="emit('open', figure)"
  >
    <span class="alg-cl-pill__value">{{ t(figure.labelKey) }}</span>
    <svg
      class="alg-cl-pill__glyph"
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M7 14l3.5-3.5 3 3L21 7" />
    </svg>
  </button>
</template>

<style lang="scss" scoped>
// Inline semantic atom posture (DESIGN.md §6.4 / §3.4): radius sm, contained,
// NOT a saturated chip. It reads as a live link to a number, not decoration.
.alg-cl-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 0 2px;
  padding: 1px var(--alg-space-2);
  vertical-align: baseline;
  font-size: inherit;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  color: var(--alg-fg-primary);
  background: var(--alg-bg-tint-med);
  border: 1px solid var(--alg-border-hover);
  border-radius: var(--alg-radius-sm);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--alg-duration-fast) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    background: var(--alg-bg-tint-high);
    border-color: var(--alg-border-strong);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }

  &:active {
    transform: translateY(0.5px);
  }
}

.alg-cl-pill__glyph {
  flex: 0 0 auto;
  color: var(--alg-ice-2);
  opacity: 0.9;
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-pill {
    transition: none;
  }
}
</style>
