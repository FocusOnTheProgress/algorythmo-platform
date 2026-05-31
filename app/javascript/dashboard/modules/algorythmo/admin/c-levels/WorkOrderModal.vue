<script setup>
// algorythmo: Stream E2/E4 — Create-a-Work-Order flow (opened by 👍 Aprovar).
//
// Two-step demo flow:
//   1. The AI emits a STRUCTURED CHECKLIST for the approved proposal — each
//      item maps to a destination operational tab. The CEO reviews/toggles.
//   2. On confirm, we show that the OS WOULD create those tasks in the
//      operational tabs (clearly labelled DEMO — nothing is created yet).
//
// The checklist shape ({ id, labelKey, destKey, checked }) is the contract the
// real work-order creator consumes.
//
// TODO(real-wiring): on confirm, POST a real Ordem de Serviço per checked item
// to its destination operational tab (Marketing/Operação/Financeiro/…). Today
// confirm only flips to a demo confirmation state and emits the checklist.
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import CLevelsModal from './CLevelsModal.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  // The approved proposal turn (carries workOrderKey + role context).
  proposal: { type: Object, default: null },
  director: { type: Object, default: null },
});

const emit = defineEmits(['update:open', 'confirm']);

const { t } = useI18n();

// Structured checklist. Each item names its destination operational tab so the
// CEO sees exactly where the OS would act. DEMO data — see TODO above.
const checklist = ref([]);
const confirmed = ref(false);

function buildChecklist(workOrderKey) {
  if (!workOrderKey) return [];
  // Three canonical steps per work order, keyed off the proposal's base.
  return [
    {
      id: 'brief',
      labelKey: `${workOrderKey}.STEP_BRIEF`,
      destKey: `${workOrderKey}.DEST_BRIEF`,
      checked: true,
    },
    {
      id: 'owner',
      labelKey: `${workOrderKey}.STEP_OWNER`,
      destKey: `${workOrderKey}.DEST_OWNER`,
      checked: true,
    },
    {
      id: 'track',
      labelKey: `${workOrderKey}.STEP_TRACK`,
      destKey: `${workOrderKey}.DEST_TRACK`,
      checked: true,
    },
  ];
}

watch(
  () => props.open,
  open => {
    if (open) {
      confirmed.value = false;
      checklist.value = buildChecklist(props.proposal?.workOrderKey);
    }
  },
  { immediate: true }
);

const checkedItems = computed(() =>
  checklist.value.filter(item => item.checked)
);

function toggleItem(id) {
  const item = checklist.value.find(i => i.id === id);
  if (item) item.checked = !item.checked;
}

function confirm() {
  // TODO(real-wiring): create the work orders here.
  emit('confirm', {
    proposalId: props.proposal?.id,
    items: checkedItems.value.map(i => ({ id: i.id })),
  });
  confirmed.value = true;
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <CLevelsModal
    :open="open"
    :title="t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.TITLE')"
    :close-label="t('ALGORYTHMO_ADMIN.C_LEVELS.MODAL.CLOSE')"
    root-testid="cl-work-order"
    @update:open="close"
  >
    <div v-if="proposal" class="alg-cl-wo">
      <p class="alg-cl-wo__demo">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.DEMO_BADGE') }}
      </p>

      <!-- STEP 1 — checklist -->
      <template v-if="!confirmed">
        <header class="alg-cl-wo__head">
          <p class="alg-cl-wo__source">
            {{
              t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.FROM', {
                role: director ? t(director.roleKey) : '',
              })
            }}
          </p>
          <h3 class="alg-cl-wo__heading">
            {{ t(`${proposal.workOrderKey}.HEADING`) }}
          </h3>
          <p class="alg-cl-wo__lede">
            {{ t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.LEDE') }}
          </p>
        </header>

        <ul class="alg-cl-wo__list" role="list">
          <li v-for="item in checklist" :key="item.id" class="alg-cl-wo__item">
            <button
              type="button"
              role="checkbox"
              class="alg-cl-wo__check"
              :class="{ 'alg-cl-wo__check--on': item.checked }"
              :aria-checked="item.checked"
              :aria-label="t(item.labelKey)"
              @click="toggleItem(item.id)"
            >
              <svg
                v-if="item.checked"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
            <span class="alg-cl-wo__item-body">
              <span class="alg-cl-wo__item-label">{{ t(item.labelKey) }}</span>
              <span class="alg-cl-wo__item-dest">{{ t(item.destKey) }}</span>
            </span>
          </li>
        </ul>
      </template>

      <!-- STEP 2 — demo confirmation -->
      <div v-else class="alg-cl-wo__done">
        <span class="alg-cl-wo__done-glyph" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h3 class="alg-cl-wo__done-title">
          {{ t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.DONE_TITLE') }}
        </h3>
        <p class="alg-cl-wo__done-body">
          {{
            t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.DONE_BODY', {
              count: checkedItems.length,
            })
          }}
        </p>
        <ul class="alg-cl-wo__done-list" role="list">
          <li
            v-for="item in checkedItems"
            :key="item.id"
            class="alg-cl-wo__done-row"
          >
            <span>{{ t(item.labelKey) }}</span>
            <span class="alg-cl-wo__done-dest">{{ t(item.destKey) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <button
        v-if="!confirmed"
        type="button"
        class="alg-btn alg-btn--ghost alg-btn--sm"
        @click="close"
      >
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.MODAL.CANCEL') }}
      </button>
      <button
        v-if="!confirmed"
        type="button"
        class="alg-btn alg-btn--primary alg-btn--sm"
        :disabled="checkedItems.length === 0"
        @click="confirm"
      >
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.WORK_ORDER.CONFIRM') }}
      </button>
      <button
        v-else
        type="button"
        class="alg-btn alg-btn--primary alg-btn--sm"
        @click="close"
      >
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.MODAL.DONE') }}
      </button>
    </template>
  </CLevelsModal>
</template>

<style lang="scss" scoped>
.alg-cl-wo {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-5);
}

.alg-cl-wo__demo {
  margin: 0;
  align-self: flex-start;
  font-size: 9px;
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  padding: 2px var(--alg-space-2);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-pill);
}

.alg-cl-wo__head {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-cl-wo__source {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-wo__heading {
  margin: 0;
  font-size: var(--alg-text-lg);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-wo__lede {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: 1.5;
  color: var(--alg-fg-tertiary);
}

.alg-cl-wo__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-cl-wo__item {
  display: flex;
  align-items: flex-start;
  gap: var(--alg-space-3);
  padding: var(--alg-space-3);
  background: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm);
}

.alg-cl-wo__check {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--alg-radius-xs);
  border: 1px solid var(--alg-border-strong);
  background: var(--alg-bg-tint-low);
  color: var(--alg-color-success-fg);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--alg-duration-fast) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &--on {
    background: var(--alg-color-success);
    border-color: var(--alg-color-success);
  }
  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}

.alg-cl-wo__item-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.alg-cl-wo__item-label {
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-primary);
  line-height: 1.4;
}

.alg-cl-wo__item-dest {
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-wide);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-wo__done {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--alg-space-2);
  padding: var(--alg-space-4) 0;
}

.alg-cl-wo__done-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: var(--alg-radius-pill);
  color: var(--alg-color-success);
  background: var(--alg-color-success-subtle);
  margin-bottom: var(--alg-space-1);
}

.alg-cl-wo__done-title {
  margin: 0;
  font-size: var(--alg-text-lg);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-wo__done-body {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: 1.5;
  color: var(--alg-fg-tertiary);
  max-width: 42ch;
}

.alg-cl-wo__done-list {
  list-style: none;
  margin: var(--alg-space-2) 0 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-cl-wo__done-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--alg-space-3);
  padding: var(--alg-space-2) var(--alg-space-3);
  background: var(--alg-bg-tint-low);
  border-radius: var(--alg-radius-sm);
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-secondary);
  text-align: left;
}

.alg-cl-wo__done-dest {
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-wide);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-wo__check {
    transition: none;
  }
}
</style>
