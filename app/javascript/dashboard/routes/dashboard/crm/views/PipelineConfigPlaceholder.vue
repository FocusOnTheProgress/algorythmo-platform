<script setup>
// algorythmo: feature-gate algorythmo_crm
// Pipeline configuration surface (C5). Lives behind the board's gear — the gear
// reveals it; there is no stray "configure" link in the chrome. Two mounts:
//   1. Inline reveal panel inside KanbanBoard (the primary path — gear toggle).
//   2. Standalone route view (/crm/pipeline) for deep-links / bookmarks.
//
// The editable mechanics (rename/reorder stages, add/remove, aging coefficient)
// ship with the real backend write layer later; here we render a faithful,
// read-only shell of the current stages so the operator sees exactly what they
// will configure. Clearly labelled "em breve" for the parts that need the write
// path — never a blank stub.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  // When provided (inline reveal from the board), the panel lists the live/demo
  // stages with their hue so the config mirrors the board. Omitted on the bare
  // route view → the panel shows its empty/standalone copy.
  stages: { type: Array, default: () => [] },
  // Inline reveal renders a header with a close affordance; the route view does
  // not (it's a full page).
  embedded: { type: Boolean, default: false },
});

const emit = defineEmits(['close']);

const { t } = useI18n();

const hasStages = computed(
  () => Array.isArray(props.stages) && props.stages.length > 0
);

function styleFor(stage) {
  return stage?.accent ? { '--alg-config-accent': stage.accent } : {};
}
</script>

<template>
  <main
    class="alg-pipeline-config"
    :class="{ 'alg-pipeline-config--embedded': embedded }"
    data-testid="pipeline-config-placeholder"
  >
    <header class="alg-pipeline-config__head">
      <div class="alg-pipeline-config__head-text">
        <h1
          class="alg-pipeline-config__title"
          data-testid="pipeline-config-placeholder-title"
        >
          {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.PLACEHOLDER_TITLE') }}
        </h1>
        <p
          class="alg-pipeline-config__body"
          data-testid="pipeline-config-placeholder-body"
        >
          {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.PLACEHOLDER_BODY') }}
        </p>
      </div>

      <button
        v-if="embedded"
        type="button"
        class="alg-pipeline-config__close"
        data-testid="pipeline-config-close"
        :aria-label="t('ALGORYTHMO_CRM.KANBAN.CONFIG_CLOSE')"
        :title="t('ALGORYTHMO_CRM.KANBAN.CONFIG_CLOSE')"
        @click="emit('close')"
      >
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </header>

    <section
      v-if="hasStages"
      class="alg-pipeline-config__stages"
      data-testid="pipeline-config-stages"
    >
      <h2 class="alg-pipeline-config__section-label">
        {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.STAGES_LABEL') }}
      </h2>
      <ul class="alg-pipeline-config__list">
        <li
          v-for="(stage, i) in stages"
          :key="stage.id"
          class="alg-pipeline-config__stage"
          :style="styleFor(stage)"
        >
          <span class="alg-pipeline-config__stage-swatch" aria-hidden="true" />
          <span class="alg-pipeline-config__stage-name">{{ stage.name }}</span>
          <span class="alg-pipeline-config__stage-pos">{{ i + 1 }}</span>
        </li>
      </ul>
      <p class="alg-pipeline-config__hint">
        {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.EDIT_SOON') }}
      </p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.alg-pipeline-config {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  height: 100%;
  padding: var(--alg-density-editorial-padding, 2rem) 1.5rem;
  color: var(--alg-fg-primary);
  background-color: var(--alg-bg);

  // Embedded reveal: a contained panel (not a full page) that sits over the
  // board canvas. Scrollable, hairline-framed, elevated.
  &--embedded {
    height: auto;
    max-height: 100%;
    overflow-y: auto;
    padding: 1.25rem;
    background-color: var(--alg-bg-raised);
    border-left: 1px solid var(--alg-border);
    box-shadow: var(--alg-elevation-3);
  }
}

.alg-pipeline-config__head {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.alg-pipeline-config__head-text {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
}

.alg-pipeline-config__title {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-xl, 1.25rem);
  font-weight: var(--alg-weight-medium, 500);
  letter-spacing: var(--alg-tracking-tight, -0.022em);
  margin: 0;
}

.alg-pipeline-config__body {
  font-size: var(--alg-text-md, 0.9375rem);
  color: var(--alg-fg-tertiary);
  margin: 0;
  line-height: 1.5;
}

.alg-pipeline-config__close {
  flex: 0 0 auto;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.875rem;
  height: 1.875rem;
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm, 8px);
  background-color: var(--alg-bg-tint-low);
  color: var(--alg-fg-tertiary);
  cursor: pointer;
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

.alg-pipeline-config__section-label {
  margin: 0 0 0.625rem;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-pipeline-config__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-pipeline-config__stage {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--alg-radius-md, 12px);
  background-color: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
}

.alg-pipeline-config__stage-swatch {
  flex: 0 0 auto;
  width: 0.625rem;
  height: 0.625rem;
  border-radius: var(--alg-radius-pill, 9999px);
  background-color: var(--alg-config-accent, var(--alg-fg-quaternary));
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.2);
}

.alg-pipeline-config__stage-name {
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--alg-text-sm, 0.875rem);
  font-weight: var(--alg-weight-medium, 500);
  color: var(--alg-fg-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alg-pipeline-config__stage-pos {
  flex: 0 0 auto;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs, 0.6875rem);
  color: var(--alg-fg-tertiary);
  font-variant-numeric: tabular-nums;
}

.alg-pipeline-config__hint {
  margin: 0.875rem 0 0;
  font-size: var(--alg-text-xs, 0.75rem);
  color: var(--alg-fg-tertiary);
  font-style: italic;
}
</style>
