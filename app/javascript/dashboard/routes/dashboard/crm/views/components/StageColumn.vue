<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §2 — one column per pipeline stage.
//
// Per-column empty state ([data-testid="stage-empty-state"]) renders ONLY when
// the column has zero leads AND the board globally has at least one lead.
// That distinction (vs the global [data-testid="kanban-empty-state"]) is the
// product affordance — an empty column inside a populated pipeline asks the
// agent to drag/move; an empty board asks the admin to connect a channel.
//
// v1.2.0 — funnel observability chip ([data-testid="stage-metrics-chip"]):
//   Renders avg time in stage + (when conversion_rate_to_next is non-null)
//   the % to the next stage. The chip is in the header so it survives an
//   empty column — agents see the historical signal even when no card is
//   sitting there right now. Placeholder em-dash when metrics are unavailable
//   so the layout stays stable across the loading → hydrated transition.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LeadCard from './LeadCard.vue';

const props = defineProps({
  stage: { type: Object, required: true },
  leads: { type: Array, required: true },
  boardHasAnyLead: { type: Boolean, required: true },
  isDropTarget: { type: Boolean, default: false },
  metrics: { type: Object, default: null },
});

const emit = defineEmits([
  'open-lead',
  'open-menu',
  'drag-start',
  'drag-enter',
  'drag-over',
  'drag-leave',
  'drop',
  'drag-end',
]);

const { t } = useI18n();

const showColumnEmpty = computed(
  () => props.leads.length === 0 && props.boardHasAnyLead
);

// Per-stage status hue (DESIGN-DELTA-0009). Drives a 2px top bar + a ~12% tint
// on the count pill ONLY — never a saturated header, never the Aurora magenta.
// Falls back to a neutral hairline when a stage carries no accent (live stages).
const accentColor = computed(() => props.stage?.accent ?? null);
const columnStyle = computed(() =>
  accentColor.value
    ? {
        '--alg-stage-accent': accentColor.value,
        '--alg-stage-accent-tint': `color-mix(in oklch, ${accentColor.value} 12%, transparent)`,
      }
    : {}
);

const stageCountLabel = computed(() => {
  const count = props.leads.length;
  if (count === 0) return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT_ZERO');
  if (count === 1) return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT_ONE');
  return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT', { count });
});

const PLACEHOLDER = computed(() => t('ALGORYTHMO_CRM.METRICS.PLACEHOLDER'));

const conversionRateNext = computed(() => {
  const v = props.metrics?.conversion_rate_to_next;
  return Number.isFinite(v) ? v : null;
});

// Seconds → compact label. Tracks the same scale as timeFormat.js but reads
// from numeric seconds rather than an ISO timestamp.
function formatSeconds(value) {
  // Service contract: 0 is a real zero (empty/sub-second stays), not "no data".
  // Only nil/non-finite/negative collapses to the em-dash placeholder.
  if (value == null || !Number.isFinite(value) || value < 0) {
    return PLACEHOLDER.value;
  }
  const seconds = Math.round(value);
  if (seconds < 60) {
    return t('ALGORYTHMO_CRM.METRICS.SECONDS_SHORT', { value: seconds });
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return t('ALGORYTHMO_CRM.METRICS.MINUTES_SHORT', { value: minutes });
  }
  const hours = Math.round(seconds / 3600);
  if (hours < 48) {
    return t('ALGORYTHMO_CRM.METRICS.HOURS_SHORT', { value: hours });
  }
  return t('ALGORYTHMO_CRM.METRICS.DAYS_SHORT', {
    value: Math.round(hours / 24),
  });
}

const avgTimeFormatted = computed(() =>
  formatSeconds(props.metrics?.avg_time_in_stage_seconds)
);

const conversionFormatted = computed(() => {
  const v = conversionRateNext.value;
  return v == null ? PLACEHOLDER.value : `${Math.round(v * 100)}%`;
});

const metricsTooltip = computed(() => {
  if (conversionRateNext.value == null) {
    return t('ALGORYTHMO_CRM.METRICS.STAGE_AVG_TIME_LABEL');
  }
  return `${t('ALGORYTHMO_CRM.METRICS.STAGE_AVG_TIME_LABEL')} · ${t('ALGORYTHMO_CRM.METRICS.STAGE_CONVERSION_NEXT_LABEL')}`;
});

const metricsAriaLabel = computed(() => {
  if (conversionRateNext.value == null) {
    return t('ALGORYTHMO_CRM.METRICS.STAGE_CHIP_ARIA_NO_CONVERSION', {
      time: avgTimeFormatted.value,
    });
  }
  return t('ALGORYTHMO_CRM.METRICS.STAGE_CHIP_ARIA', {
    time: avgTimeFormatted.value,
    rate: conversionFormatted.value,
  });
});
</script>

<template>
  <section
    class="alg-stage-column"
    :class="{
      'alg-stage-column--drop-target': isDropTarget,
      'alg-stage-column--accented': accentColor,
    }"
    :style="columnStyle"
    data-testid="stage-column"
    :data-stage-id="stage.id"
    :data-stage-kind="stage.kind"
    @dragenter="emit('drag-enter', $event, stage.id)"
    @dragover="emit('drag-over', $event)"
    @dragleave="emit('drag-leave', $event, stage.id)"
    @drop="emit('drop', $event, { stageId: stage.id, stageName: stage.name })"
  >
    <header class="alg-stage-column__header" data-testid="stage-column-header">
      <div class="alg-stage-column__header-top">
        <h3 class="alg-stage-column__name" data-testid="stage-name">
          {{ stage.name }}
        </h3>
        <span
          class="alg-stage-column__count"
          data-testid="stage-count"
          :aria-label="stageCountLabel"
        >
          {{ leads.length }}
        </span>
      </div>
      <span
        class="alg-stage-column__metrics"
        data-testid="stage-metrics-chip"
        :data-stage-id="stage.id"
        :title="metricsTooltip"
        :aria-label="metricsAriaLabel"
      >
        <span
          class="alg-stage-column__metric-avg"
          data-testid="stage-metrics-avg-time"
        >
          {{ avgTimeFormatted }}
        </span>
        <span
          v-if="conversionRateNext != null"
          class="alg-stage-column__metric-conversion"
          data-testid="stage-metrics-conversion"
        >
          {{ conversionFormatted }}
          {{ t('ALGORYTHMO_CRM.METRICS.STAGE_CONVERSION_NEXT_LABEL') }}
        </span>
      </span>
    </header>

    <ul
      class="alg-stage-column__list"
      data-testid="stage-column-list"
      role="list"
    >
      <li v-for="lead in leads" :key="lead.id" class="alg-stage-column__item">
        <LeadCard
          :lead="lead"
          draggable="true"
          @dragstart="
            emit('drag-start', $event, {
              leadId: lead.id,
              fromStageId: stage.id,
              leadName: lead.name,
            })
          "
          @dragend="emit('drag-end')"
          @open="emit('open-lead', $event)"
          @menu="emit('open-menu', $event)"
        />
      </li>
    </ul>

    <div
      v-if="showColumnEmpty"
      class="alg-stage-column__empty"
      data-testid="stage-empty-state"
      :data-stage-id="stage.id"
    >
      <span data-testid="stage-empty-text">
        {{ t('ALGORYTHMO_CRM.STAGE.EMPTY') }}
      </span>
    </div>
  </section>
</template>

<style lang="scss" scoped>
// A column is a zone of canvas, not a card. It sits ON --alg-bg with a hairline
// frame; the only colour is the 2px top status bar (attenuated stage hue) and a
// ~12% tint on the count pill. DESIGN.md §7.1.
.alg-stage-column {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 17.5rem;
  max-width: 21rem;
  flex: 1 1 17.5rem;
  background-color: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-lg, 16px);
  padding: 0.875rem;
  gap: 0.75rem;
  box-shadow: var(--alg-elevation-1);
  transition:
    box-shadow var(--alg-duration-base, 240ms) var(--alg-ease-cinematic),
    background-color var(--alg-duration-base, 240ms) var(--alg-ease-cinematic);

  // 2px status bar pinned to the top edge — the single sanctioned use of the
  // stage hue. Hidden when no accent is provided (live stages).
  &--accented::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    border-radius: var(--alg-radius-lg, 16px) var(--alg-radius-lg, 16px) 0 0;
    background-color: var(--alg-stage-accent);
  }

  &--drop-target {
    background-color: var(--alg-bg-raised-hover);
    box-shadow:
      var(--alg-elevation-2),
      inset 0 0 0 2px var(--alg-border-strong);
  }
}

.alg-stage-column__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alg-stage-column__header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.alg-stage-column__name {
  font-size: var(--alg-text-sm, 0.875rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: var(--alg-tracking-snug, -0.012em);
  margin: 0;
  color: var(--alg-fg-primary);
}

// Count pill — mono numerals on a faint tint of the stage hue (12%), or a
// neutral tint when the stage has no accent.
.alg-stage-column__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.25rem;
  padding: 0 0.4375rem;
  border-radius: var(--alg-radius-pill, 9999px);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-xs, 0.75rem);
  font-variant-numeric: tabular-nums;
  color: var(--alg-fg-secondary);
  background-color: var(--alg-bg-tint-med);
}

.alg-stage-column--accented .alg-stage-column__count {
  background-color: var(--alg-stage-accent-tint);
}

.alg-stage-column__metrics {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  color: var(--alg-fg-tertiary);
  font-variant-numeric: tabular-nums;
}

.alg-stage-column__metric-avg {
  font-weight: var(--alg-weight-medium, 500);
  color: var(--alg-fg-secondary);
}

.alg-stage-column__metric-conversion {
  color: var(--alg-fg-tertiary);
}

.alg-stage-column__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: 1rem;
}

.alg-stage-column__empty {
  padding: 1rem 0.5rem;
  font-size: var(--alg-text-sm, 0.8125rem);
  color: var(--alg-fg-tertiary);
  text-align: center;
  border: 1px dashed var(--alg-border-strong);
  border-radius: var(--alg-radius-md, 12px);
}
</style>
