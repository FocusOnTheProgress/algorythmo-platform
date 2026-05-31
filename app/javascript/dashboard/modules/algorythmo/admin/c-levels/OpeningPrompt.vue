<script setup>
// algorythmo: Stream E4 — the opening prompt for the Sala de Conselho.
//
// A prominent challenge prompt + preset goal chips. Choosing a goal (chip or
// free-text submit) starts the round: the parent resolves the scripted debate,
// the relevant directors debate each other, and the simulator previews impact.
//
// The free-text field is wired to the same `start` intent so the surface feels
// end-to-end real; in demo mode any free text falls back to the first preset.
//
// TODO(real-wiring): free text becomes the actual challenge handed to the
// director agents to debate; presets become parameterized briefs.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({
  goals: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['start']);

const { t } = useI18n();
const draft = ref('');

function submit() {
  const text = draft.value.trim();
  // Demo: free text routes to the first preset goal so the round always runs.
  // TODO(real-wiring): pass `text` to the agent debate engine.
  emit('start', { goalId: null, text });
}
</script>

<template>
  <section
    class="alg-cl-opening"
    :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.ARIA')"
  >
    <div class="alg-cl-opening__inner" data-alg-reveal-opening>
      <p class="alg-cl-opening__eyebrow">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.EYEBROW') }}
      </p>
      <h2 class="alg-cl-opening__prompt">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.PROMPT') }}
      </h2>

      <form class="alg-cl-opening__form" @submit.prevent="submit">
        <input
          v-model="draft"
          type="text"
          class="alg-input alg-cl-opening__input"
          :placeholder="t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.PLACEHOLDER')"
          :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.PROMPT')"
        />
        <button
          type="submit"
          class="alg-btn alg-btn--primary alg-cl-opening__submit"
          :disabled="!draft.trim()"
        >
          {{ t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.SUBMIT') }}
        </button>
      </form>

      <div class="alg-cl-opening__goals">
        <span class="alg-cl-opening__goals-label">{{
          t('ALGORYTHMO_ADMIN.C_LEVELS.OPENING.GOALS_LABEL')
        }}</span>
        <ul class="alg-cl-opening__chips" role="list">
          <li v-for="goal in goals" :key="goal.id">
            <button
              type="button"
              class="alg-cl-chip"
              @click="emit('start', { goalId: goal.id })"
            >
              {{ t(goal.labelKey) }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.alg-cl-opening {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  padding: var(--alg-space-8) var(--alg-space-6);
}

.alg-cl-opening__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--alg-space-5);
  max-width: 44rem;
  width: 100%;
}

.alg-cl-opening__eyebrow {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-opening__prompt {
  margin: 0;
  font-size: var(--alg-text-2xl);
  font-weight: 400;
  letter-spacing: var(--alg-tracking-tight);
  line-height: 1.2;
  color: var(--alg-fg-primary);
  max-width: 24ch;
}

.alg-cl-opening__form {
  display: flex;
  gap: var(--alg-space-2);
  width: 100%;
  max-width: 32rem;
}

.alg-cl-opening__input {
  flex: 1 1 auto;
  min-height: 44px;
}

.alg-cl-opening__submit {
  flex: 0 0 auto;
  min-height: 44px;
}

.alg-cl-opening__goals {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--alg-space-3);
  margin-top: var(--alg-space-2);
}

.alg-cl-opening__goals-label {
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-quaternary, var(--alg-fg-tertiary));
}

.alg-cl-opening__chips {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--alg-space-2);
}

.alg-cl-chip {
  min-height: 36px;
  padding: 0 var(--alg-space-4);
  font-size: var(--alg-text-sm);
  font-weight: 500;
  color: var(--alg-fg-secondary);
  background: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-pill);
  cursor: pointer;
  appearance: none;
  transition:
    background var(--alg-duration-fast) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic),
    color var(--alg-duration-fast) var(--alg-ease-cinematic),
    transform var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    background: var(--alg-bg-tint-med);
    border-color: var(--alg-border-strong);
    color: var(--alg-fg-primary);
    transform: translateY(-1px);
  }
  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
  &:active {
    transform: translateY(0.5px) scale(0.99);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-chip {
    transition: none;
    &:hover {
      transform: none;
    }
  }
}

@media (max-width: 600px) {
  .alg-cl-opening__form {
    flex-direction: column;
  }
}
</style>
