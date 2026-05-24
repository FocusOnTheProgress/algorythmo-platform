<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §6 — keyboard fallback for drag. Native drag is mouse-only;
// keyboard users open this modal via lead-card menu → "Mover para…".
//
// Why a radiogroup (not a select): a radio list of ≤7 stages keeps the
// destination visually scannable and the keyboard model deterministic —
// Tab into the group, ArrowDown/ArrowUp moves the selection, Enter confirms.
// A native <select> hides the options until opened and breaks aria-modal
// focus trapping on some mobile browsers.
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  open: { type: Boolean, required: true },
  lead: { type: Object, default: null },
  stages: { type: Array, required: true },
});
const emit = defineEmits(['close', 'confirm']);

const { t } = useI18n();
const selectedStageId = ref(null);
const dialogRef = ref(null);
const firstRadioRef = ref(null);
const previouslyFocused = ref(null);

const targetStages = computed(() =>
  props.stages.filter(s => s.id !== props.lead?.stage_id)
);

const descriptionText = computed(() =>
  props.lead
    ? t('ALGORYTHMO_CRM.MOVE_MODAL.DESCRIPTION', { leadName: props.lead.name })
    : ''
);

const canConfirm = computed(() => selectedStageId.value !== null);

// Background tree to inert while the dialog is open — prevents AT virtual
// cursor + Tab navigation from reaching the kanban behind the dialog. We
// remember the chosen element so cleanup restores its inert state precisely
// instead of toggling a permanent attribute.
let inertTarget = null;
// Monotonic generation guards against rapid open/close/open races: if the
// modal closes while the open-side awaits nextTick, the captured gen no
// longer matches and the inert apply is skipped — otherwise the background
// stays inert forever and the user has to refresh.
let modalGen = 0;

function applyBackgroundInert() {
  if (typeof document === 'undefined') return;
  const root =
    document.querySelector('.app-wrapper') ||
    document.querySelector('main.app-content') ||
    document.body;
  if (!root || root === inertTarget) return;
  inertTarget = root;
  inertTarget.setAttribute('inert', '');
  inertTarget.setAttribute('aria-hidden', 'true');
}

function releaseBackgroundInert() {
  if (!inertTarget) return;
  inertTarget.removeAttribute('inert');
  inertTarget.removeAttribute('aria-hidden');
  inertTarget = null;
}

watch(
  () => props.open,
  async open => {
    modalGen += 1;
    const myGen = modalGen;
    if (open) {
      previouslyFocused.value =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      selectedStageId.value = targetStages.value[0]?.id ?? null;
      await nextTick();
      // Bail if a later open/close has superseded this transition.
      if (myGen !== modalGen || !props.open) return;
      // Apply inert AFTER caching the activeElement — otherwise the cached
      // element would already be inside an inert subtree.
      applyBackgroundInert();
      firstRadioRef.value?.focus();
    } else {
      // No generation guard here: the close branch is sync up to this
      // point (no await between `modalGen += 1` above and the work below),
      // so myGen is always equal to modalGen. Releasing inert + restoring
      // focus immediately is what we want — adding a nextTick would only
      // delay the user's focus restore without preventing a real race.
      releaseBackgroundInert();
      if (
        previouslyFocused.value instanceof HTMLElement &&
        previouslyFocused.value.isConnected
      ) {
        previouslyFocused.value.focus();
      }
      previouslyFocused.value = null;
    }
  },
  { immediate: true }
);

function getFocusable() {
  const root = dialogRef.value;
  if (!root) return [];
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => el.offsetParent !== null || el === document.activeElement);
}

function trapTab(event) {
  const focusable = getFocusable();
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('close');
    return;
  }
  if (event.key === 'Tab') {
    trapTab(event);
  }
}

function handleSubmit(event) {
  event.preventDefault();
  if (!canConfirm.value) return;
  const stage = props.stages.find(s => s.id === selectedStageId.value);
  emit('confirm', { leadId: props.lead?.id, stage });
}

onBeforeUnmount(() => {
  releaseBackgroundInert();
  previouslyFocused.value = null;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="alg-move-lead-backdrop" @click.self="emit('close')">
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="lead ? `move-lead-title-${lead.id}` : null"
        data-testid="move-lead-modal"
        :data-lead-id="lead?.id"
        class="alg-move-lead-modal"
        @keydown="handleKeydown"
      >
        <h2
          v-if="lead"
          :id="`move-lead-title-${lead.id}`"
          class="alg-move-lead-modal__title"
        >
          {{ t('ALGORYTHMO_CRM.MOVE_MODAL.TITLE') }}
        </h2>
        <p class="alg-move-lead-modal__desc">{{ descriptionText }}</p>

        <form @submit="handleSubmit">
          <fieldset
            role="radiogroup"
            class="alg-move-lead-modal__group"
            :aria-label="t('ALGORYTHMO_CRM.MOVE_MODAL.RADIOGROUP_LABEL')"
          >
            <label
              v-for="(stage, idx) in targetStages"
              :key="stage.id"
              class="alg-move-lead-modal__option"
            >
              <input
                :ref="el => (idx === 0 ? (firstRadioRef = el) : null)"
                v-model="selectedStageId"
                type="radio"
                name="move-stage"
                :value="stage.id"
                :data-testid="`move-stage-radio-${stage.id}`"
              />
              <span>{{ stage.name }}</span>
            </label>
          </fieldset>

          <div class="alg-move-lead-modal__actions">
            <button
              type="button"
              class="alg-move-lead-modal__btn alg-move-lead-modal__btn--ghost"
              data-testid="move-lead-modal-cancel"
              @click="emit('close')"
            >
              {{ t('ALGORYTHMO_CRM.MOVE_MODAL.CANCEL') }}
            </button>
            <button
              type="submit"
              class="alg-move-lead-modal__btn alg-move-lead-modal__btn--primary"
              data-testid="move-lead-modal-confirm"
              :disabled="!canConfirm"
            >
              {{ t('ALGORYTHMO_CRM.MOVE_MODAL.CONFIRM') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.alg-move-lead-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.alg-move-lead-modal {
  min-width: 22rem;
  max-width: 28rem;
  padding: 1.5rem;
  border-radius: 0.75rem;
  background-color: var(--alg-modal-bg, #ffffff);
  color: var(--alg-modal-fg, #111827);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
}

.alg-move-lead-modal__title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
}

.alg-move-lead-modal__desc {
  font-size: 0.875rem;
  color: var(--alg-modal-muted-fg, #6b7280);
  margin: 0 0 1rem;
}

.alg-move-lead-modal__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: none;
  padding: 0;
  margin: 0 0 1.25rem;
}

.alg-move-lead-modal__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0.375rem 0.5rem;
  border-radius: 0.375rem;

  &:hover {
    background-color: var(--alg-modal-row-hover, #f3f4f6);
  }
}

.alg-move-lead-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.alg-move-lead-modal__btn {
  padding: 0.5rem 0.875rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: none;

  &--ghost {
    background-color: transparent;
    color: var(--alg-modal-fg, #111827);

    &:hover {
      background-color: var(--alg-modal-row-hover, #f3f4f6);
    }
  }

  &--primary {
    background-color: var(--alg-cta-bg, #2563eb);
    color: var(--alg-cta-fg, #ffffff);

    &:hover:not(:disabled) {
      background-color: var(--alg-cta-bg-hover, #1d4ed8);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 2px;
  }
}
</style>
