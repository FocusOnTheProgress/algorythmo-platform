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
  height: 100%;
  padding: var(--alg-density-editorial-padding, 2rem) 1.5rem;
  color: var(--alg-fg-primary);
  background-color: var(--alg-bg);

  h1 {
    font-family: var(--alg-font-display);
    font-size: var(--alg-text-xl, 1.25rem);
    font-weight: var(--alg-weight-medium, 500);
    letter-spacing: var(--alg-tracking-tight, -0.022em);
    margin: 0;
  }

  p {
    font-size: var(--alg-text-md, 0.9375rem);
    color: var(--alg-fg-tertiary);
    margin: 0;
  }
}
</style>
