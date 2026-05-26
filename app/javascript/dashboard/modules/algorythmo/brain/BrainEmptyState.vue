<script setup>
// algorythmo: M3-PR3 — Brain empty state (Day-1 onboarding)
// Shown when compiled truth has no content. Guides the founder through the
// 3-step first-time setup without auto-populating (preserves D2 intent:
// "the act of pasting is half the value").
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const steps = [
  {
    number: 1,
    icon: 'i-lucide-clipboard-paste',
    titleKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_1_TITLE',
    descKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_1_DESC',
  },
  {
    number: 2,
    icon: 'i-lucide-refresh-cw',
    titleKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_2_TITLE',
    descKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_2_DESC',
  },
  {
    number: 3,
    icon: 'i-lucide-terminal',
    titleKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_3_TITLE',
    descKey: 'ALGORYTHMO_BRAIN.EMPTY_STATE.STEP_3_DESC',
  },
];
</script>

<template>
  <div class="alg-brain-empty">
    <ol
      class="alg-brain-empty__steps"
      :aria-label="t('ALGORYTHMO_BRAIN.EMPTY_STATE.ARIA_LABEL')"
    >
      <li
        v-for="step in steps"
        :key="step.number"
        class="alg-brain-empty__step"
      >
        <div class="alg-brain-empty__step-number" aria-hidden="true">
          {{ step.number }}
        </div>
        <div class="alg-brain-empty__step-body">
          <div class="alg-brain-empty__step-header">
            <span
              class="alg-brain-empty__step-icon"
              :class="[step.icon]"
              aria-hidden="true"
            />
            <h3 class="alg-brain-empty__step-title">{{ t(step.titleKey) }}</h3>
          </div>
          <p class="alg-brain-empty__step-desc">{{ t(step.descKey) }}</p>
        </div>
      </li>
    </ol>
    <p class="alg-brain-empty__footer">
      {{ t('ALGORYTHMO_BRAIN.EMPTY_STATE.FOOTER') }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.alg-brain-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-large, 1.5rem);
  padding: var(--space-large, 1.5rem) 0;
  max-width: 520px;
}

.alg-brain-empty__steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-normal, 1rem);
  counter-reset: none;
}

.alg-brain-empty__step {
  display: flex;
  gap: var(--space-normal, 1rem);
  align-items: flex-start;
}

.alg-brain-empty__step-number {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-small, 0.75rem);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: var(--color-woot, #6c4de5);
  color: #fff;
  letter-spacing: 0;
}

.alg-brain-empty__step-body {
  flex: 1;
  min-width: 0;
}

.alg-brain-empty__step-header {
  display: flex;
  align-items: center;
  gap: var(--space-small, 0.5rem);
  margin-bottom: var(--space-smaller, 0.25rem);
}

.alg-brain-empty__step-icon {
  width: 1rem;
  height: 1rem;
  color: var(--color-woot, #6c4de5);
  flex-shrink: 0;
}

.alg-brain-empty__step-title {
  font-size: var(--font-size-default, 0.875rem);
  font-weight: 600;
  color: var(--color-heading, #fff);
  margin: 0;
  line-height: 1.4;
}

.alg-brain-empty__step-desc {
  font-size: var(--font-size-small, 0.75rem);
  color: var(--color-body, rgba(255, 255, 255, 0.55));
  margin: 0;
  line-height: 1.5;
}

.alg-brain-empty__footer {
  font-size: var(--font-size-small, 0.75rem);
  color: var(--color-body, rgba(255, 255, 255, 0.35));
  margin: 0;
  padding-top: var(--space-small, 0.5rem);
  border-top: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  line-height: 1.5;
}
</style>
