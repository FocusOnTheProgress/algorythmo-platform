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
import { inkForAccent } from '../accentInk.js';
import LeadCard from './LeadCard.vue';

const props = defineProps({
  stage: { type: Object, required: true },
  leads: { type: Array, required: true },
  boardHasAnyLead: { type: Boolean, required: true },
  isDropTarget: { type: Boolean, default: false },
  metrics: { type: Object, default: null },
  // The number shown in the header pill + aria. In demo mode this is the full
  // stage total (e.g. 84) so the pill matches the metrics chip and the funnel
  // summary, even though only a sampled subset of cards is rendered below.
  // Real configured pipelines pass null and fall back to leads.length.
  displayCount: { type: Number, default: null },
  // Whether the per-column gear is shown. The gear opens the SAME inline config
  // overlay the header gear opens — one paradigm, no page navigation (adversarial
  // review #111). Defaults to true; isolated unit tests can pass false to assert
  // the hidden state. (The legacy `pipelineConfigPath` router-link prop was
  // removed when the per-column gear stopped navigating to a separate route.)
  showConfig: { type: Boolean, default: true },
});

const emit = defineEmits([
  'open-lead',
  'open-menu',
  'addLead',
  'configureStage',
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

// Per-stage status hue (REF CRM). Drives the COLOURED HEADER BLOCK that crowns
// each column (blue / yellow / purple / orange in the reference), plus a darker
// count pill that sits inside it. The accent stays the locked OKLCH (L≈0.55,
// C≤0.12) — rich enough to read as the ref's coloured header, contained enough
// to never go neon, and never the Aurora magenta (sacred to the orb/avatars).
//
// On the coloured header we drive every derived token from the one accent:
//   --alg-stage-accent        the base hue (the header fill / status bar)
//   --alg-stage-accent-strong a touch deeper for the header's gradient floor
//   --alg-stage-accent-ink    near-white header foreground (name + glyphs)
//   --alg-stage-accent-pill   the translucent-dark count pill inside the header
//   --alg-stage-accent-tint   the column-body wash (separates body from canvas)
// Falls back to a neutral header when a stage carries no accent (live stages).
const accentColor = computed(() => props.stage?.accent ?? null);

// Header ink (light vs dark) is COMPUTED from the accent's WCAG contrast — never
// a hand-set flag (adversarial review #111). Any stage colour bright enough that
// black ink reads better than white (yellow AND orange, and any future hue)
// automatically gets dark ink, so a new accent can't silently fail AA.
const accentInk = computed(() =>
  accentColor.value ? inkForAccent(accentColor.value) : 'light'
);

const columnStyle = computed(() => {
  if (!accentColor.value) return {};
  const dark = accentInk.value === 'dark';
  return {
    '--alg-stage-accent': accentColor.value,
    '--alg-stage-accent-strong': `color-mix(in oklch, ${accentColor.value}, black 18%)`,
    // Ink: near-white on dark/mid hues, near-black on bright hues. The count
    // pill flips with it (dark-translucent on white ink, white-translucent on
    // dark ink) so it always separates from the header fill.
    '--alg-stage-accent-ink': dark
      ? `color-mix(in oklch, ${accentColor.value}, black 78%)`
      : `color-mix(in oklch, ${accentColor.value}, white 90%)`,
    '--alg-stage-accent-pill': dark
      ? `color-mix(in srgb, white 42%, transparent)`
      : `color-mix(in srgb, black 34%, transparent)`,
    '--alg-stage-accent-tint': `color-mix(in oklch, ${accentColor.value} 7%, transparent)`,
  };
});

// Header pill number: the explicit stage total when provided (demo mode),
// otherwise the count of cards actually in the column (real pipelines).
const headerCount = computed(() =>
  props.displayCount == null ? props.leads.length : props.displayCount
);

const stageCountLabel = computed(() => {
  const count = headerCount.value;
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

// Per-column header actions: a gear that opens the SAME inline pipeline-config
// overlay the header gear opens (one paradigm — no page navigation), and an add
// button. The add button is a demo-friendly affordance — it emits 'addLead';
// the parent decides what (if anything) the gesture does.
const configAriaLabel = computed(() =>
  t('ALGORYTHMO_CRM.KANBAN.CONFIGURE_STAGE_ARIA', { stage: props.stage.name })
);

function handleConfigure() {
  emit('configureStage', {
    stageId: props.stage.id,
    stageName: props.stage.name,
  });
}

const addAriaLabel = computed(() =>
  t('ALGORYTHMO_CRM.KANBAN.ADD_LEAD_TO_STAGE_ARIA', { stage: props.stage.name })
);

function handleAddLead() {
  emit('addLead', { stageId: props.stage.id, stageName: props.stage.name });
}
</script>

<template>
  <section
    class="alg-stage-column"
    :class="{
      'alg-stage-column--drop-target': isDropTarget,
      'alg-stage-column--accented': accentColor,
      'alg-stage-column--ink-dark': accentColor && accentInk === 'dark',
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
      <div class="alg-stage-column__header-bar">
        <h3 class="alg-stage-column__name" data-testid="stage-name">
          {{ stage.name }}
        </h3>
        <span
          class="alg-stage-column__count"
          data-testid="stage-count"
          :aria-label="stageCountLabel"
        >
          {{ headerCount }}
        </span>

        <div class="alg-stage-column__actions">
          <button
            v-if="showConfig"
            type="button"
            class="alg-stage-column__action"
            data-testid="pipeline-config-trigger"
            :aria-label="configAriaLabel"
            :title="configAriaLabel"
            aria-haspopup="dialog"
            @click.stop="handleConfigure"
          >
            <svg
              aria-hidden="true"
              width="14"
              height="14"
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
          <button
            type="button"
            class="alg-stage-column__action"
            data-testid="stage-add-lead"
            :aria-label="addAriaLabel"
            :title="addAriaLabel"
            @click="handleAddLead"
          >
            <svg
              aria-hidden="true"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
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
// REF CRM column. A column is a soft-filled zone that separates from the dark
// canvas (C4), crowned by a COLOURED HEADER BLOCK in the stage hue (C1). The
// header carries the name, a darker count pill, and the gear + add glyphs — all
// living inside the colour, exactly as the reference shows.
.alg-stage-column {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 17.5rem;
  max-width: 21rem;
  flex: 1 1 17.5rem;
  // Column body = a subtle wash distinct from the canvas (C4). Defaults to a
  // raised surface; an accented stage adds a 7% tint of its hue on top so each
  // lane reads as its own zone in both dark and light mode.
  background-color: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-lg, 16px);
  // No top padding: the coloured header sits flush to the top edge, bleeding
  // into the rounded corners like the ref. Sides/bottom keep the gutter.
  padding: 0 0.625rem 0.75rem;
  gap: 0.625rem;
  box-shadow: var(--alg-elevation-1);
  overflow: hidden;
  transition:
    box-shadow var(--alg-duration-base, 240ms) var(--alg-ease-cinematic),
    background-color var(--alg-duration-base, 240ms) var(--alg-ease-cinematic);

  // Accented body wash — a whisper of the stage hue over the raised surface so
  // the lane separates from the canvas without becoming a slab.
  &--accented {
    background-image: linear-gradient(
      var(--alg-stage-accent-tint),
      var(--alg-stage-accent-tint)
    );
  }

  &--drop-target {
    background-color: var(--alg-bg-raised-hover);
    box-shadow:
      var(--alg-elevation-2),
      inset 0 0 0 2px var(--alg-border-strong);
  }
}

// Header wrapper holds the coloured bar + the metrics strip beneath it.
.alg-stage-column__header {
  display: flex;
  flex-direction: column;
  // Pull the bar to the column's edges so the colour bleeds to the rounded top.
  margin: 0 -0.625rem 0;
  gap: 0;
}

// THE COLOURED HEADER BLOCK (C1). Full-bleed bar in the stage hue with a
// top-down gradient + inset highlight (DESIGN §3.5 elevation grammar) so it
// reads as an illuminated object, not a flat swatch. Foreground is a near-white
// ink derived from the hue for AA contrast.
.alg-stage-column__header-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem 0.5rem 0.75rem;
  min-height: 2.375rem;
  background-color: var(--alg-bg-tint-high);
}

.alg-stage-column--accented .alg-stage-column__header-bar {
  background-image: linear-gradient(
    180deg,
    var(--alg-stage-accent) 0%,
    var(--alg-stage-accent-strong) 100%
  );
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.18);
}

.alg-stage-column__name {
  font-size: var(--alg-text-sm, 0.875rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: var(--alg-tracking-snug, -0.012em);
  margin: 0;
  color: var(--alg-fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alg-stage-column--accented .alg-stage-column__name {
  color: var(--alg-stage-accent-ink);
  // A faint shadow grounds the white ink on the brighter hues (orange/blue).
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.22);
}

// Dark-ink header (bright hue, e.g. yellow): drop the dark text-shadow (it would
// muddy near-black ink) and use a light-side lift instead.
.alg-stage-column--ink-dark .alg-stage-column__name {
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.24);
}

// Count pill — mono numerals in a darker translucent pill inside the coloured
// header, exactly as the reference (84 / 52 / 42 / 21).
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
  color: var(--alg-stage-accent-ink);
  background-color: var(--alg-stage-accent-pill);
}

// Header action cluster — gear (config) + add, always present on the coloured
// bar (the ref shows them at rest). Ink inherits the header foreground.
.alg-stage-column__actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
}

.alg-stage-column__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.625rem;
  height: 1.625rem;
  padding: 0;
  border: none;
  border-radius: var(--alg-radius-sm, 8px);
  background-color: transparent;
  color: var(--alg-fg-tertiary);
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic),
    color var(--alg-duration-fast, 180ms) var(--alg-ease-cinematic);

  &:hover {
    background-color: var(--alg-bg-tint-med);
    color: var(--alg-fg-primary);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}

// On the coloured header the glyphs read as the near-white ink and hover lifts
// with a translucent-white wash (not the dark tint, which would vanish).
.alg-stage-column--accented .alg-stage-column__action {
  color: color-mix(in srgb, var(--alg-stage-accent-ink) 82%, transparent);

  &:hover {
    background-color: rgba(255, 255, 255, 0.16);
    color: var(--alg-stage-accent-ink);
  }
}

// On a bright (dark-ink) header a white hover wash disappears — use a dark one.
.alg-stage-column--ink-dark .alg-stage-column__action:hover {
  background-color: rgba(0, 0, 0, 0.12);
}

// Metrics strip sits on the column body, just under the coloured bar. The
// parent header is full-bled (negative side margin), so re-inset the strip with
// matching side padding to realign it with the cards below.
.alg-stage-column__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  margin-top: 0.625rem;
  padding: 0 0.625rem;
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
  gap: 0.625rem;
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
