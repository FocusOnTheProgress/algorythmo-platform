<script setup>
// algorythmo: M6.1-b — Reports Commercial overlay placeholder.
// Real composition (SectorDashboard + mock) arrives in M6.1-c once D8/D11
// are founder-confirmed. This shell validates route wiring and sidebar entry
// without shipping premature content.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="alg-commercial-overlay">
    <header class="alg-commercial-overlay__header">
      <h1 class="alg-commercial-overlay__title">
        {{ t('ALGORYTHMO_ADMIN.COMMERCIAL.TITLE') }}
      </h1>
      <p class="alg-commercial-overlay__sub">
        {{ t('ALGORYTHMO_ADMIN.COMMERCIAL.BODY') }}
      </p>
    </header>
  </div>
</template>

<style scoped lang="scss">
.alg-commercial-overlay {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
  padding: var(--space-large, 2rem);
  background: var(--color-background, #0d0d0d);

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-small, 0.5rem);
    padding-bottom: var(--space-large, 2rem);
    border-bottom: 1px solid var(--color-border, rgba(255, 255, 255, 0.08));
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-heading, #f5f5f7);
    line-height: 1.2;
  }

  &__sub {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-light, rgba(245, 245, 247, 0.5));
    line-height: 1.5;
  }
}
</style>
