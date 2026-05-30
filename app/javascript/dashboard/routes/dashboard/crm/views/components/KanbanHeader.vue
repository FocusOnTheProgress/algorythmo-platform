<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §2 v1.3.0 — Kanban header with funnel summary.
//
// Layout: title on the left, search in the middle, summary on the right.
// The summary block ([data-testid="kanban-metrics-summary"]) shows three
// stats — open_leads, avg_funnel_hours, conversion_rate — each tagged with
// data-metric-key so Playwright (M2 onda 2) and the Brain export job can
// pick the values without parsing labels.
//
// Round-3 redesign: the global "Configure pipeline" text-link was REMOVED from
// here. Pipeline configuration is now reachable only from the per-column gear
// in StageColumn (one obvious, contextual entry point instead of a stray link
// in the chrome).
//
// State handling:
//   - loading: faded opacity. Header stays visible so the layout does not jump.
//   - error:   alert triangle + tooltip. Numbers fall back to placeholder.
//   - empty:   summary may be null on first paint; we render placeholders.
//
// Accessibility: the summary is aria-live="polite" so a screen reader hears
// "Open leads 42, conversion 31%" after drag-and-drop refresh — without the
// announcement, blind agents would not know the funnel snapshot changed.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  summary: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: null },
  searchValue: { type: String, default: '' },
  // Whether the pipeline-config surface is currently revealed (C5). Drives the
  // gear's pressed state + aria-expanded so the toggle reads correctly to AT.
  configOpen: { type: Boolean, default: false },
});

const emit = defineEmits(['update:searchValue', 'toggle-config']);

const { t } = useI18n();

const PLACEHOLDER = computed(() => t('ALGORYTHMO_CRM.METRICS.PLACEHOLDER'));

function onSearchInput(event) {
  emit('update:searchValue', event.target.value);
}

// Hours formatter: < 1 → "0.5h" with one decimal; ≥ 1 → integer hours; ≥ 48h → days.
// The chip is meant to be scannable in one glance; sub-hour precision matters
// only at the low end (a 2-minute funnel time is a debug situation, not a
// product surface).
function formatHours(value) {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return PLACEHOLDER.value;
  }
  if (value < 1) {
    return t('ALGORYTHMO_CRM.METRICS.MINUTES_SHORT', {
      value: Math.max(1, Math.round(value * 60)),
    });
  }
  // 96h (4 days) is the hours→days break: a 3-day average funnel still reads
  // crisper as "74h" than "3d", but past 4d the days unit is more scannable.
  if (value < 96) {
    return t('ALGORYTHMO_CRM.METRICS.HOURS_SHORT', {
      value: Math.round(value),
    });
  }
  return t('ALGORYTHMO_CRM.METRICS.DAYS_SHORT', {
    value: Math.round(value / 24),
  });
}

function formatPercentage(value) {
  if (value == null || !Number.isFinite(value)) return PLACEHOLDER.value;
  return `${Math.round(value * 100)}%`;
}

const openLeadsValue = computed(() => {
  const v = props.summary?.open_leads;
  return Number.isFinite(v) ? String(v) : PLACEHOLDER.value;
});

const avgFunnelValue = computed(() =>
  formatHours(props.summary?.avg_funnel_hours)
);

const conversionRateValue = computed(() =>
  formatPercentage(props.summary?.conversion_rate)
);
</script>

<template>
  <header
    class="alg-kanban-header"
    :class="{
      'alg-kanban-header--loading': loading,
      'alg-kanban-header--error': error,
    }"
    data-testid="kanban-header"
  >
    <h1 class="alg-kanban-header__title" data-testid="kanban-title">
      {{ t('ALGORYTHMO_CRM.KANBAN.TITLE') }}
    </h1>

    <div class="alg-kanban-header__center">
      <input
        :value="searchValue"
        type="search"
        class="alg-kanban-header__search"
        data-testid="kanban-search-input"
        :placeholder="t('ALGORYTHMO_CRM.KANBAN.SEARCH_PLACEHOLDER')"
        :aria-label="t('ALGORYTHMO_CRM.KANBAN.SEARCH_PLACEHOLDER')"
        @input="onSearchInput"
      />
    </div>

    <div class="alg-kanban-header__actions">
      <button
        type="button"
        class="alg-kanban-header__gear"
        :class="{ 'is-active': configOpen }"
        data-testid="kanban-config-gear"
        :aria-label="t('ALGORYTHMO_CRM.KANBAN.CONFIGURE_PIPELINE')"
        :title="t('ALGORYTHMO_CRM.KANBAN.CONFIGURE_PIPELINE')"
        aria-haspopup="dialog"
        :aria-expanded="configOpen ? 'true' : 'false'"
        @click="emit('toggle-config')"
      >
        <svg
          aria-hidden="true"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 6.6V6a2 2 0 1 1 4 0v.09c.7.27 1.27.84 1.51 1.51"
          />
        </svg>
      </button>

      <div
        class="alg-kanban-header__summary"
        data-testid="kanban-metrics-summary"
        role="group"
        :aria-label="t('ALGORYTHMO_CRM.METRICS.SUMMARY_ARIA_LABEL')"
        :aria-busy="loading ? 'true' : 'false'"
      >
        <span
          class="alg-kanban-header__stat"
          data-testid="kanban-metrics-stat"
          data-metric-key="open_leads"
        >
          <span class="alg-kanban-header__stat-label">
            {{ t('ALGORYTHMO_CRM.METRICS.OPEN_LEADS_LABEL') }}
          </span>
          <span class="alg-kanban-header__stat-value">{{
            openLeadsValue
          }}</span>
        </span>
        <span
          class="alg-kanban-header__stat"
          data-testid="kanban-metrics-stat"
          data-metric-key="avg_funnel_hours"
        >
          <span class="alg-kanban-header__stat-label">
            {{ t('ALGORYTHMO_CRM.METRICS.AVG_FUNNEL_LABEL') }}
          </span>
          <span class="alg-kanban-header__stat-value">{{
            avgFunnelValue
          }}</span>
        </span>
        <span
          class="alg-kanban-header__stat"
          data-testid="kanban-metrics-stat"
          data-metric-key="conversion_rate"
        >
          <span class="alg-kanban-header__stat-label">
            {{ t('ALGORYTHMO_CRM.METRICS.CONVERSION_RATE_LABEL') }}
          </span>
          <span class="alg-kanban-header__stat-value">{{
            conversionRateValue
          }}</span>
        </span>
        <span
          v-if="error"
          class="alg-kanban-header__error-icon"
          data-testid="kanban-metrics-error"
          :title="t('ALGORYTHMO_CRM.METRICS.ERROR_TOOLTIP')"
          :aria-label="t('ALGORYTHMO_CRM.METRICS.ERROR_TOOLTIP')"
          role="img"
        >
          <!-- inline SVG so the alert glyph survives bundlers without an icon dep -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
            />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.alg-kanban-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--alg-border);

  &--loading .alg-kanban-header__summary {
    opacity: 0.5;
    transition: opacity var(--alg-duration-base, 240ms)
      var(--alg-ease-cinematic);
  }

  &--error .alg-kanban-header__summary {
    color: var(--alg-fg-primary);
  }
}

.alg-kanban-header__title {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-lg, 1.125rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: var(--alg-tracking-snug, -0.012em);
  color: var(--alg-fg-primary);
  margin: 0;
  flex: 0 0 auto;
}

.alg-kanban-header__center {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  min-width: 0;
}

// Input "sinks" into the canvas (tint-low), per .alg-input doctrine (§5.2).
.alg-kanban-header__search {
  width: 100%;
  max-width: 24rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm, 8px);
  font-size: var(--alg-text-sm, 0.875rem);
  background-color: var(--alg-bg-tint-low);
  color: var(--alg-fg-primary);

  &::placeholder {
    color: var(--alg-fg-tertiary);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--alg-border-focus);
    box-shadow: var(--alg-ring-focus);
  }
}

.alg-kanban-header__actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 0 0 auto;
}

// Pipeline-config gear (C5) — the sole entry to pipeline configuration, tucked
// top-right exactly as the reference. Ghost at rest; brand-toned when the config
// surface is revealed.
.alg-kanban-header__gear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm, 8px);
  background-color: var(--alg-bg-tint-low);
  color: var(--alg-fg-tertiary);
  cursor: pointer;
  transition:
    background-color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic),
    color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic);

  &:hover {
    background-color: var(--alg-bg-tint-med);
    color: var(--alg-fg-primary);
    border-color: var(--alg-border-hover);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }

  &.is-active {
    color: var(--alg-color-brand-primary);
    border-color: color-mix(
      in oklch,
      var(--alg-color-brand-primary) 50%,
      var(--alg-border)
    );
    background-color: var(
      --alg-color-brand-primary-subtle,
      var(--alg-bg-tint-med)
    );
  }
}

.alg-kanban-header__summary {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  font-variant-numeric: tabular-nums;
}

.alg-kanban-header__stat {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: var(--alg-text-xs, 0.75rem);
  line-height: 1.1;
}

.alg-kanban-header__stat-label {
  color: var(--alg-fg-tertiary);
  text-transform: uppercase;
  font-family: var(--alg-font-mono);
  letter-spacing: var(--alg-tracking-widest, 0.1em);
  font-size: var(--alg-text-2xs, 0.6875rem);
}

.alg-kanban-header__stat-value {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-md, 0.9375rem);
  font-weight: var(--alg-weight-medium, 500);
  color: var(--alg-fg-primary);
  margin-top: 0.125rem;
}

.alg-kanban-header__error-icon {
  display: inline-flex;
  color: var(--alg-color-warning);
  cursor: help;
}
</style>
