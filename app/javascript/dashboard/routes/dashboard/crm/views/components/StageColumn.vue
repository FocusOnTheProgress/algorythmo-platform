<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §2 — one column per pipeline stage.
//
// Per-column empty state ([data-testid="stage-empty-state"]) renders ONLY when
// the column has zero leads AND the board globally has at least one lead.
// That distinction (vs the global [data-testid="kanban-empty-state"]) is the
// product affordance — an empty column inside a populated pipeline asks the
// agent to drag/move; an empty board asks the admin to connect a channel.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import LeadCard from './LeadCard.vue';

const props = defineProps({
  stage: { type: Object, required: true },
  leads: { type: Array, required: true },
  boardHasAnyLead: { type: Boolean, required: true },
  isDropTarget: { type: Boolean, default: false },
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

const stageCountLabel = computed(() => {
  const count = props.leads.length;
  if (count === 0) return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT_ZERO');
  if (count === 1) return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT_ONE');
  return t('ALGORYTHMO_CRM.KANBAN.STAGE_COUNT', { count });
});
</script>

<template>
  <section
    class="alg-stage-column"
    :class="{ 'alg-stage-column--drop-target': isDropTarget }"
    data-testid="stage-column"
    :data-stage-id="stage.id"
    :data-stage-kind="stage.kind"
    @dragenter="emit('drag-enter', $event, stage.id)"
    @dragover="emit('drag-over', $event)"
    @dragleave="emit('drag-leave', $event, stage.id)"
    @drop="emit('drop', $event, { stageId: stage.id, stageName: stage.name })"
  >
    <header class="alg-stage-column__header" data-testid="stage-column-header">
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
.alg-stage-column {
  display: flex;
  flex-direction: column;
  min-width: 18rem;
  max-width: 22rem;
  flex: 1 1 18rem;
  background-color: var(--alg-column-bg, #f9fafb);
  border-radius: 0.625rem;
  padding: 0.75rem;
  gap: 0.625rem;
  transition:
    background-color 0.15s ease,
    box-shadow 0.15s ease;

  &--drop-target {
    background-color: var(--alg-column-bg-active, #eef2ff);
    box-shadow: inset 0 0 0 2px var(--alg-focus-ring, #2563eb);
  }
}

.alg-stage-column__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
}

.alg-stage-column__name {
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0;
  color: var(--alg-column-header-fg, #374151);
}

.alg-stage-column__count {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--alg-column-muted-fg, #6b7280);
}

.alg-stage-column__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-height: 1rem;
}

.alg-stage-column__empty {
  padding: 1rem 0.5rem;
  font-size: 0.8125rem;
  color: var(--alg-column-muted-fg, #6b7280);
  text-align: center;
  border: 1px dashed var(--alg-column-empty-border, #d1d5db);
  border-radius: 0.5rem;
}
</style>
