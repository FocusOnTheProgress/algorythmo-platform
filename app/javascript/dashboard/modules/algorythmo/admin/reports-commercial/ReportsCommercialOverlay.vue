<script setup>
// algorythmo: M6.1-b — Reports Commercial overlay placeholder.
// Real KPI composition + mock contract arrive in M6.1-c once D8/D11 are
// founder-confirmed. This shell validates route wiring and sidebar entry
// without shipping premature content.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <main
    class="flex flex-col flex-1 min-h-0 overflow-y-auto px-8 py-8"
    data-testid="reports-commercial-overlay"
  >
    <header class="mb-8 pb-8 border-b border-n-slate-7">
      <h1
        class="font-interDisplay text-2xl font-[460] text-n-slate-12 m-0 leading-tight"
      >
        {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING') }}
      </h1>
      <p class="mt-1.5 text-sm text-n-slate-10 m-0 leading-relaxed">
        {{ t('ALGORYTHMO_ADMIN.COMMERCIAL.BODY') }}
      </p>
    </header>
  </main>
</template>
