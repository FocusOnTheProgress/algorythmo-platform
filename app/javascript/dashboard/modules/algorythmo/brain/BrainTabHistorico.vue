<script setup>
// algorythmo: Brain — "Histórico" tab (plan 0012 §2 / PR5).
//
// A vertical timeline of how the brain grew, from the real /brain/timeline
// endpoint: { data: [{ id, type, occurred_at, summary, trigger, meta }], meta }.
// Each event is a node on a left rail — newest first. Trigger maps to a glyph
// (upload / adjustment / conversation / cron / manual). No fixture: a brain with
// no history shows the honest empty state.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrainEmptyState from './BrainEmptyState.vue';

const props = defineProps({
  events: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  hasError: { type: Boolean, default: false },
});

const emit = defineEmits(['retry']);

const { t } = useI18n();

// trigger/type → glyph. Falls back to a neutral dot.
const TRIGGER_GLYPH = {
  upload: 'i-lucide-file-up',
  adjustment: 'i-lucide-pencil',
  manual: 'i-lucide-hand',
  cron: 'i-lucide-refresh-cw',
};
const TYPE_GLYPH = {
  conversation_ingested: 'i-lucide-messages-square',
  snapshot: 'i-lucide-layers',
};

function glyphFor(event) {
  return (
    TRIGGER_GLYPH[event.trigger] || TYPE_GLYPH[event.type] || 'i-lucide-circle'
  );
}

const dateFmt = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}

const nodes = computed(() =>
  props.events.map(e => ({
    id: e.id,
    glyph: glyphFor(e),
    summary: e.summary,
    when: formatWhen(e.occurred_at),
    trigger: e.trigger,
  }))
);

const isEmpty = computed(
  () => !props.isLoading && !props.hasError && nodes.value.length === 0
);
</script>

<template>
  <section
    class="alg-brain-historico"
    :aria-label="t('ALGORYTHMO_BRAIN.HISTORICO.ARIA_LABEL')"
  >
    <!-- Error -->
    <div v-if="hasError" class="alg-brain-historico__error" role="alert">
      <span
        class="i-lucide-triangle-alert alg-brain-historico__error-glyph"
        aria-hidden="true"
      />
      <p class="alg-brain-historico__error-text">
        {{ t('ALGORYTHMO_BRAIN.HISTORICO.ERROR') }}
      </p>
      <button
        type="button"
        class="alg-brain-historico__retry"
        @click="emit('retry')"
      >
        {{ t('ALGORYTHMO_BRAIN.HISTORICO.RETRY') }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <ol
      v-else-if="isLoading"
      class="alg-brain-historico__rail"
      aria-busy="true"
    >
      <li
        v-for="n in 3"
        :key="`hsk-${n}`"
        class="alg-brain-historico__node alg-brain-historico__node--skeleton"
      >
        <span class="alg-brain-historico__dot" />
        <div class="alg-brain-historico__body">
          <span
            class="alg-brain-historico__sk alg-brain-historico__sk--summary"
          />
          <span class="alg-brain-historico__sk alg-brain-historico__sk--when" />
        </div>
      </li>
    </ol>

    <!-- Empty -->
    <BrainEmptyState
      v-else-if="isEmpty"
      glyph="i-lucide-git-commit-horizontal"
      :title="t('ALGORYTHMO_BRAIN.HISTORICO.EMPTY_TITLE')"
      :body="t('ALGORYTHMO_BRAIN.HISTORICO.EMPTY_BODY')"
    />

    <!-- Timeline -->
    <ol
      v-else
      class="alg-brain-historico__rail"
      :aria-label="t('ALGORYTHMO_BRAIN.HISTORICO.LIST_ARIA')"
    >
      <li
        v-for="node in nodes"
        :key="node.id"
        class="alg-brain-historico__node"
      >
        <span class="alg-brain-historico__dot" aria-hidden="true">
          <span
            :class="node.glyph"
            class="alg-brain-historico__dot-glyph"
            aria-hidden="true"
          />
        </span>
        <div class="alg-brain-historico__body">
          <p class="alg-brain-historico__summary">{{ node.summary }}</p>
          <p class="alg-brain-historico__when">{{ node.when }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped lang="scss">
.alg-brain-historico {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

// ── Error ─────────────────────────────────────────────────────────────────────
.alg-brain-historico__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-3);
  padding: var(--alg-space-8) var(--alg-space-6);
  text-align: center;
  min-height: 220px;
}
.alg-brain-historico__error-glyph {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--alg-color-warning);
}
.alg-brain-historico__error-text {
  margin: 0;
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-secondary);
}
.alg-brain-historico__retry {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  padding: var(--alg-space-2) var(--alg-space-4);
  border-radius: var(--alg-radius-md);
  border: 1px solid var(--alg-glass-border);
  background: var(--alg-bg-elevated);
  color: var(--alg-fg-secondary);
  cursor: pointer;

  &:hover {
    color: var(--alg-fg-primary);
    border-color: var(--alg-glass-border-strong);
  }
  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
  }
}

// ── Rail ──────────────────────────────────────────────────────────────────────
.alg-brain-historico__rail {
  list-style: none;
  margin: 0;
  padding: var(--alg-space-2) 0;
  display: flex;
  flex-direction: column;
}

.alg-brain-historico__node {
  position: relative;
  display: grid;
  grid-template-columns: 32px 1fr;
  gap: var(--alg-space-3);
  padding-bottom: var(--alg-space-5);

  // Connecting line between nodes.
  &::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 28px;
    bottom: 0;
    width: 1px;
    background: var(--alg-border);
  }
  &:last-child::before {
    display: none;
  }
}

.alg-brain-historico__dot {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--alg-radius-pill);
  border: 1px solid var(--alg-glass-border);
  background: var(--alg-bg-elevated);
  color: var(--alg-fg-tertiary);
}

.alg-brain-historico__dot-glyph {
  width: 0.9rem;
  height: 0.9rem;
}

.alg-brain-historico__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;
  min-width: 0;
}

.alg-brain-historico__summary {
  margin: 0;
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-primary);
  line-height: var(--alg-leading-snug);
}

.alg-brain-historico__when {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-tertiary);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
.alg-brain-historico__node--skeleton .alg-brain-historico__dot {
  border-style: dashed;
}

.alg-brain-historico__sk {
  display: block;
  height: 0.85rem;
  border-radius: var(--alg-radius-sm);
  background: linear-gradient(
    90deg,
    var(--alg-border) 0%,
    var(--alg-border-strong) 50%,
    var(--alg-border) 100%
  );
  background-size: 200% 100%;
  animation: alg-historico-shimmer 1.6s var(--alg-ease-cinematic) infinite;
}
.alg-brain-historico__sk--summary {
  width: 70%;
  margin-bottom: 6px;
}
.alg-brain-historico__sk--when {
  width: 28%;
  height: 0.65rem;
}

@keyframes alg-historico-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-brain-historico__sk {
    animation: none;
  }
}
</style>
