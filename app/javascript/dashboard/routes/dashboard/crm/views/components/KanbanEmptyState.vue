<script setup>
// algorythmo: feature-gate algorythmo_crm
// On-brand empty state — shown only for a genuinely-empty LIVE pipeline (the
// default surface renders the demonstration board instead). No Chatwoot copy,
// no blue CTA: editorial copy that frames the pipeline as something that fills
// itself as conversations arrive (DESIGN.md §14.11 — "copy is design").
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="alg-kanban-empty" data-testid="kanban-empty-state">
    <h2 class="alg-kanban-empty__title" data-testid="kanban-empty-title">
      {{ t('ALGORYTHMO_CRM.EMPTY_STATE.TITLE') }}
    </h2>
    <p class="alg-kanban-empty__body">
      {{ t('ALGORYTHMO_CRM.EMPTY_STATE.BODY') }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.alg-kanban-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: var(--alg-space-24, 6rem) 1.5rem;
  text-align: center;
  color: var(--alg-fg-primary);
}

.alg-kanban-empty__title {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-xl, 1.5rem);
  font-weight: var(--alg-weight-light, 300);
  letter-spacing: var(--alg-tracking-tight, -0.022em);
  margin: 0;
}

.alg-kanban-empty__body {
  max-width: 32rem;
  font-size: var(--alg-text-sm, 0.875rem);
  line-height: var(--alg-leading-normal, 1.45);
  color: var(--alg-fg-tertiary);
  margin: 0;
}
</style>
