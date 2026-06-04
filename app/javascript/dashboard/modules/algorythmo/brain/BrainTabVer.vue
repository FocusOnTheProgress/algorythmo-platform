<script setup>
// algorythmo: Brain — "Ver" tab (plan 0012).
//
// The real knowledge view: a dense, honest list of the documents the motor has
// (or hasn't) absorbed. Each row carries a status badge — captured ✓, extracting
// ⏳, pending ⏳, failed ✗ — driven by the real document.status enum. No fixture:
// an empty brain shows the honest empty state directing the operator to Ajustar.
//
// Loading → skeleton rows (DESIGN.md bans spinners). Error → designed error
// panel with retry. The header strip owns the page/edge counts (compiled_truth);
// this tab owns the document inventory (documents#index).
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrainEmptyState from './BrainEmptyState.vue';

const props = defineProps({
  documents: { type: Array, default: () => [] },
  isLoading: { type: Boolean, default: false },
  hasError: { type: Boolean, default: false },
});

const emit = defineEmits(['retry']);

const { t } = useI18n();

// Maps the real status enum to a badge token + glyph + label. `extracting` and
// `pending` collapse to one "reading" affordance for the operator (both mean
// "in flight"); captured = indexed, failed = error.
const STATUS = {
  captured: { tone: 'ok', glyph: 'i-lucide-check', key: 'INDEXED' },
  extracting: { tone: 'pending', glyph: 'i-lucide-loader', key: 'READING' },
  pending: { tone: 'pending', glyph: 'i-lucide-clock', key: 'PENDING' },
  failed: { tone: 'fail', glyph: 'i-lucide-x', key: 'FAILED' },
};

function badgeFor(status) {
  return STATUS[status] || STATUS.pending;
}

const rows = computed(() =>
  props.documents.map(doc => {
    const badge = badgeFor(doc.status);
    return {
      id: doc.id,
      filename: doc.filename,
      category: doc.category,
      lastError: doc.last_error,
      createdAt: doc.created_at,
      tone: badge.tone,
      glyph: badge.glyph,
      label: t(`ALGORYTHMO_BRAIN.VER.STATUS.${badge.key}`),
    };
  })
);

const isEmpty = computed(
  () => !props.isLoading && !props.hasError && rows.value.length === 0
);

const dateFmt = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
});
function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : dateFmt.format(d);
}
</script>

<template>
  <section
    class="alg-brain-ver"
    :aria-label="t('ALGORYTHMO_BRAIN.VER.ARIA_LABEL')"
  >
    <!-- Error -->
    <div v-if="hasError" class="alg-brain-ver__error" role="alert">
      <span
        class="i-lucide-triangle-alert alg-brain-ver__error-glyph"
        aria-hidden="true"
      />
      <p class="alg-brain-ver__error-text">
        {{ t('ALGORYTHMO_BRAIN.VER.ERROR') }}
      </p>
      <button type="button" class="alg-brain-ver__retry" @click="emit('retry')">
        {{ t('ALGORYTHMO_BRAIN.VER.RETRY') }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <ul v-else-if="isLoading" class="alg-brain-ver__list" aria-busy="true">
      <li
        v-for="n in 4"
        :key="`sk-${n}`"
        class="alg-brain-ver__row alg-brain-ver__row--skeleton"
      >
        <span class="alg-brain-ver__sk alg-brain-ver__sk--badge" />
        <span class="alg-brain-ver__sk alg-brain-ver__sk--name" />
        <span class="alg-brain-ver__sk alg-brain-ver__sk--meta" />
      </li>
    </ul>

    <!-- Empty -->
    <BrainEmptyState
      v-else-if="isEmpty"
      glyph="i-lucide-folder-open"
      :title="t('ALGORYTHMO_BRAIN.VER.EMPTY_TITLE')"
      :body="t('ALGORYTHMO_BRAIN.VER.EMPTY_BODY')"
    />

    <!-- Documents -->
    <ul
      v-else
      class="alg-brain-ver__list"
      :aria-label="t('ALGORYTHMO_BRAIN.VER.LIST_ARIA')"
    >
      <li
        v-for="row in rows"
        :key="row.id"
        class="alg-brain-ver__row"
        :class="{ 'alg-brain-ver__row--failed': row.tone === 'fail' }"
      >
        <span
          class="alg-brain-ver__badge"
          :class="`alg-brain-ver__badge--${row.tone}`"
        >
          <span
            :class="row.glyph"
            class="alg-brain-ver__badge-glyph"
            aria-hidden="true"
          />
          <span class="alg-brain-ver__badge-label">{{ row.label }}</span>
        </span>

        <span class="alg-brain-ver__name" :title="row.filename">
          {{ row.filename }}
        </span>

        <span class="alg-brain-ver__meta">
          <span class="alg-brain-ver__category">{{ row.category }}</span>
          <span
            v-if="row.createdAt"
            class="alg-brain-ver__sep"
            aria-hidden="true"
            >·</span
          >
          <span v-if="row.createdAt" class="alg-brain-ver__date">{{
            formatDate(row.createdAt)
          }}</span>
        </span>

        <p v-if="row.lastError" class="alg-brain-ver__error-detail">
          {{ row.lastError }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.alg-brain-ver {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

// ── Error ─────────────────────────────────────────────────────────────────────
.alg-brain-ver__error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-3);
  padding: var(--alg-space-8) var(--alg-space-6);
  text-align: center;
  min-height: 220px;
}

.alg-brain-ver__error-glyph {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--alg-color-warning);
}

.alg-brain-ver__error-text {
  margin: 0;
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-secondary);
}

.alg-brain-ver__retry {
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
  transition:
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic),
    color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    border-color: var(--alg-glass-border-strong);
    color: var(--alg-fg-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
  }
}

// ── List ──────────────────────────────────────────────────────────────────────
.alg-brain-ver__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.alg-brain-ver__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--alg-space-3) var(--alg-space-4);
  min-height: 52px;
  padding: var(--alg-space-3) var(--alg-space-2);
  border-bottom: 1px solid var(--alg-border);
  transition: background-color var(--alg-duration-fast)
    var(--alg-ease-cinematic);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--alg-bg-elevated);
  }
}

// A failed row carries its error detail on a second line spanning all columns.
.alg-brain-ver__error-detail {
  grid-column: 1 / -1;
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-color-danger);
  max-width: 80ch;
}

.alg-brain-ver__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: var(--alg-radius-pill);
  border: 1px solid var(--alg-glass-border);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  white-space: nowrap;

  &--ok {
    color: var(--alg-color-success);
    border-color: color-mix(
      in oklch,
      var(--alg-color-success),
      transparent 70%
    );
  }
  &--pending {
    color: var(--alg-color-warning);
    border-color: color-mix(
      in oklch,
      var(--alg-color-warning),
      transparent 70%
    );
  }
  &--fail {
    color: var(--alg-color-danger);
    border-color: color-mix(in oklch, var(--alg-color-danger), transparent 70%);
  }
}

.alg-brain-ver__badge-glyph {
  width: 0.85rem;
  height: 0.85rem;
}

.alg-brain-ver__name {
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  color: var(--alg-fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.alg-brain-ver__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  color: var(--alg-fg-tertiary);
  white-space: nowrap;
}

.alg-brain-ver__category {
  text-transform: uppercase;
  letter-spacing: var(--alg-tracking-snug);
}

// ── Skeleton ────────────────────────────────────────────────────────────────
.alg-brain-ver__row--skeleton {
  grid-template-columns: 84px 1fr 120px;
}

.alg-brain-ver__sk {
  height: 0.85rem;
  border-radius: var(--alg-radius-sm);
  background: linear-gradient(
    90deg,
    var(--alg-border) 0%,
    var(--alg-border-strong) 50%,
    var(--alg-border) 100%
  );
  background-size: 200% 100%;
  animation: alg-brain-ver-shimmer 1.6s var(--alg-ease-cinematic) infinite;
}
.alg-brain-ver__sk--badge {
  width: 70px;
  border-radius: var(--alg-radius-pill);
}
.alg-brain-ver__sk--name {
  width: 60%;
}
.alg-brain-ver__sk--meta {
  width: 90px;
}

@keyframes alg-brain-ver-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 600px) {
  .alg-brain-ver__row {
    grid-template-columns: auto 1fr;
  }
  .alg-brain-ver__meta {
    grid-column: 2;
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-brain-ver__sk {
    animation: none;
  }
}
</style>
