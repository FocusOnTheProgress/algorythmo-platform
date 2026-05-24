<script setup>
// algorythmo: feature-gate algorythmo_crm
// Placeholder for /crm/pipeline route. The real PipelineConfigView ships in
// Sessão C B-PR6; this stub exists so the link from KanbanBoard never 404s
// and Playwright a11y smoke can navigate without hanging.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <main
    class="alg-pipeline-config-placeholder"
    data-testid="pipeline-config-placeholder"
  >
    <h1 data-testid="pipeline-config-placeholder-title">
      {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.PLACEHOLDER_TITLE') }}
    </h1>
    <p data-testid="pipeline-config-placeholder-body">
      {{ t('ALGORYTHMO_CRM.PIPELINE_CONFIG.PLACEHOLDER_BODY') }}
    </p>
  </main>
</template>

<style lang="scss" scoped>
.alg-pipeline-config-placeholder {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 2rem 1.5rem;
  color: var(--alg-modal-fg, #111827);
  background-color: var(--alg-board-bg, #ffffff);

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }

  p {
    font-size: 0.9375rem;
    color: var(--alg-card-muted-fg, #6b7280);
    margin: 0;
  }
}
</style>
