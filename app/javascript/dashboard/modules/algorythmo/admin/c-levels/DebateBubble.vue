<script setup>
// algorythmo: Stream E2 — a single debate bubble.
//
// A styled message from one director with a SUBTLE per-director colour accent
// (a thin side-bar + dot — NOT a saturated border; the ICE comet stays the
// system's border language). The message text may embed a Data Pill (the cited
// OS figure). Proposals get three floating actions below them:
//   👍 Aprovar   → create-a-Work-Order flow
//   💬 Pedir alternativa → recompute (swap to the canned alternative)
//   ❌ Descartar → archive the suggestion
//
// The text is rendered as: <prefix> [pill] <suffix>. The i18n string carries a
// "{figure}" placeholder; we split on it so the pill renders as a real inline
// button rather than interpolated text. When there is no figure the raw string
// renders.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgPlanetAvatar } from 'dashboard/components-next/algorythmo';
import DataPill from './DataPill.vue';

const props = defineProps({
  turn: {
    type: Object,
    required: true,
  },
  director: {
    type: Object,
    required: true,
  },
  // Per-turn UI state owned by the parent.
  status: {
    type: String,
    default: 'open', // 'open' | 'approved' | 'dismissed'
  },
  // True when this proposal's ghost is the one previewed in the simulator.
  previewing: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'openReport',
  'approve',
  'alternative',
  'dismiss',
  'preview',
  'clearPreview',
]);

const { t } = useI18n();

// Split the localized message around the {figure} token so the pill renders
// inline. If the turn has no figure, the whole string is the prefix.
const parts = computed(() => {
  const raw = t(props.turn.textKey);
  if (!props.turn.figure) return { prefix: raw, suffix: '' };
  const idx = raw.indexOf('{figure}');
  if (idx === -1) return { prefix: raw, suffix: '' };
  return {
    prefix: raw.slice(0, idx),
    suffix: raw.slice(idx + '{figure}'.length),
  };
});

const isProposal = computed(() => !!props.turn.proposal);
</script>

<template>
  <article
    class="alg-cl-bubble"
    :class="{
      'alg-cl-bubble--proposal': isProposal,
      'alg-cl-bubble--approved': status === 'approved',
      'alg-cl-bubble--dismissed': status === 'dismissed',
      'alg-cl-bubble--previewing': previewing,
    }"
    :style="{ '--alg-cl-accent': director.accent }"
    data-alg-reveal-bubble
    @mouseenter="isProposal && status === 'open' && emit('preview')"
    @mouseleave="isProposal && status === 'open' && emit('clearPreview')"
    @focusin="isProposal && status === 'open' && emit('preview')"
  >
    <span class="alg-cl-bubble__accent" aria-hidden="true" />

    <header class="alg-cl-bubble__head">
      <AlgPlanetAvatar
        class="alg-cl-bubble__avatar"
        :seed="director.seed"
        :name="t(director.roleKey)"
        size="sm"
        aria-hidden="true"
      />
      <span class="alg-cl-bubble__role">{{ t(director.roleKey) }}</span>
      <span v-if="isProposal" class="alg-cl-bubble__tag">{{
        t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.PROPOSAL_TAG')
      }}</span>
    </header>

    <p class="alg-cl-bubble__text">
      <span>{{ parts.prefix }}</span>
      <DataPill
        v-if="turn.figure"
        :figure="turn.figure"
        @open="emit('openReport', $event)"
      />
      <span v-if="parts.suffix">{{ parts.suffix }}</span>
    </p>

    <footer
      v-if="isProposal && status === 'open'"
      class="alg-cl-bubble__actions"
    >
      <button
        type="button"
        class="alg-cl-action alg-cl-action--approve"
        @click="emit('approve')"
      >
        <span class="alg-cl-action__glyph" aria-hidden="true">👍</span>
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.ACTIONS.APPROVE') }}
      </button>
      <button
        type="button"
        class="alg-cl-action"
        @click="emit('alternative')"
      >
        <span class="alg-cl-action__glyph" aria-hidden="true">💬</span>
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.ACTIONS.ALTERNATIVE') }}
      </button>
      <button
        type="button"
        class="alg-cl-action alg-cl-action--dismiss"
        @click="emit('dismiss')"
      >
        <span class="alg-cl-action__glyph" aria-hidden="true">❌</span>
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.ACTIONS.DISMISS') }}
      </button>
    </footer>

    <p v-else-if="status === 'approved'" class="alg-cl-bubble__resolved alg-cl-bubble__resolved--approved">
      {{ t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.APPROVED_NOTE') }}
    </p>
    <p v-else-if="status === 'dismissed'" class="alg-cl-bubble__resolved">
      {{ t('ALGORYTHMO_ADMIN.C_LEVELS.DEBATE.DISMISSED_NOTE') }}
    </p>
  </article>
</template>

<style lang="scss" scoped>
.alg-cl-bubble {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
  padding: var(--alg-space-3) var(--alg-space-4);
  padding-left: var(--alg-space-5);
  background: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-md);
  box-shadow: var(--alg-elevation-1);
  transition:
    border-color var(--alg-duration-base) var(--alg-ease-cinematic),
    box-shadow var(--alg-duration-base) var(--alg-ease-cinematic),
    opacity var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-cl-bubble--proposal {
  background: var(--alg-bg-raised-hover);
}

.alg-cl-bubble--previewing {
  border-color: color-mix(in oklch, var(--alg-ice-2), transparent 55%);
  box-shadow:
    var(--alg-elevation-2),
    0 0 0 1px color-mix(in oklch, var(--alg-ice-2), transparent 70%);
}

.alg-cl-bubble--dismissed {
  opacity: 0.55;
}

// Subtle per-director side-bar accent — thin, never a saturated frame.
.alg-cl-bubble__accent {
  position: absolute;
  left: 0;
  top: var(--alg-space-3);
  bottom: var(--alg-space-3);
  width: 2px;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-cl-accent);
  opacity: 0.85;
}

.alg-cl-bubble__head {
  display: flex;
  align-items: center;
  gap: var(--alg-space-2);
}

.alg-cl-bubble__role {
  font-size: var(--alg-text-xs);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-secondary);
}

.alg-cl-bubble__tag {
  margin-left: auto;
  font-size: 9px;
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  padding: 1px var(--alg-space-2);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-pill);
}

.alg-cl-bubble__text {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: 1.55;
  color: var(--alg-fg-primary);
}

.alg-cl-bubble__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--alg-space-2);
  margin-top: var(--alg-space-1);
}

.alg-cl-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 var(--alg-space-3);
  font-size: var(--alg-text-xs);
  font-weight: 500;
  color: var(--alg-fg-secondary);
  background: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--alg-duration-fast) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic),
    color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    background: var(--alg-bg-tint-med);
    border-color: var(--alg-border-hover);
    color: var(--alg-fg-primary);
  }
  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
  &:active {
    transform: translateY(0.5px) scale(0.99);
  }
}

.alg-cl-action__glyph {
  font-size: 12px;
  line-height: 1;
}

.alg-cl-action--approve:hover {
  border-color: color-mix(in oklch, var(--alg-color-success), transparent 50%);
  color: var(--alg-color-success);
}
.alg-cl-action--dismiss:hover {
  border-color: color-mix(in oklch, var(--alg-color-danger), transparent 50%);
  color: var(--alg-color-danger);
}

.alg-cl-bubble__resolved {
  margin: 0;
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-tertiary);
}
.alg-cl-bubble__resolved--approved {
  color: var(--alg-color-success);
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-bubble,
  .alg-cl-action {
    transition: none;
  }
}
</style>
