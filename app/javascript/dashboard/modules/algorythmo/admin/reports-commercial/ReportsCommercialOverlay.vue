<script setup>
// algorythmo: M6.1-b — Reports Commercial overlay placeholder.
// Real composition + mock arrive in M6.1-c once D8/D11 are founder-confirmed.
// This shell validates route wiring and sidebar entry without shipping
// premature content. Color fallbacks match the sister SectorDashboard so
// the visual hand-off in M6.1-c is seamless.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="alg-commercial-overlay">
    <header class="alg-commercial-overlay__header">
      <h1 class="alg-commercial-overlay__title">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING') }}
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
  padding: 2rem;
  background: var(--color-background, #0a0e1a);

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: #f5f5f7;
    line-height: 1.2;
  }

  &__sub {
    margin: 0;
    font-size: 0.875rem;
    color: rgba(245, 245, 247, 0.5);
    line-height: 1.5;
  }
}
</style>
