<script setup>
// algorythmo: M8c — Marketplace catalog placeholder. Flag algorythmo_marketplace (position 17)
// is BACKEND_DEPS — hardcoded visible until backend flag wiring ships.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Ordered catalog. Keys map 1:1 to i18n ALGORYTHMO_ADMIN.MARKETPLACE.CARDS.*.
const AGENT_KEYS = [
  'VENDAS',
  'FINANCEIRO',
  'RH',
  'MARKETING',
  'COMPRAS',
  'SUPORTE',
  'OPERACAO',
  'JURIDICO',
];

// Two-letter monograms derived from the translated name.
// Computing here keeps template clean and avoids slice() in template expressions.
const agents = computed(() =>
  AGENT_KEYS.map(key => {
    const name = t(`ALGORYTHMO_ADMIN.MARKETPLACE.CARDS.${key}.NAME`);
    const description = t(
      `ALGORYTHMO_ADMIN.MARKETPLACE.CARDS.${key}.DESCRIPTION`
    );
    const words = name.trim().split(/\s+/);
    const monogram =
      words.length >= 2
        ? words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase()
        : name.slice(0, 2).toUpperCase();
    return { key, name, description, monogram };
  })
);
</script>

<template>
  <!-- algorythmo: M8c — Marketplace catalog grid -->
  <main class="flex flex-col flex-1 min-h-0 overflow-y-auto px-8 py-8">
    <!-- Page header -->
    <header class="mb-8">
      <h1
        class="font-interDisplay text-2xl font-[460] text-n-slate-12 m-0 leading-tight"
      >
        {{ $t('ALGORYTHMO_ADMIN.MARKETPLACE.TITLE') }}
      </h1>
      <p class="mt-1.5 text-sm text-n-slate-10 m-0 leading-relaxed">
        {{ $t('ALGORYTHMO_ADMIN.MARKETPLACE.SUBHEAD') }}
      </p>
    </header>

    <!-- Agent catalog grid -->
    <ul
      class="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 list-none m-0 p-0"
      data-testid="marketplace-catalog-grid"
    >
      <li
        v-for="agent in agents"
        :key="agent.key"
        class="flex flex-col gap-3 p-4 border border-n-slate-7 bg-n-slate-1 rounded-lg"
        data-testid="marketplace-agent-card"
      >
        <!-- Avatar + name row -->
        <div class="flex items-center gap-3">
          <!-- Geometric monogram avatar -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-md bg-n-slate-3 flex items-center justify-center"
            aria-hidden="true"
          >
            <span
              class="font-interDisplay text-xs font-[560] text-n-slate-11 leading-none tracking-wide select-none"
            >
              {{ agent.monogram }}
            </span>
          </div>

          <!-- Agent name -->
          <span
            class="font-interDisplay text-sm font-[500] text-n-slate-12 leading-snug"
            data-testid="marketplace-agent-name"
          >
            {{ agent.name }}
          </span>
        </div>

        <!-- Description -->
        <p
          class="text-xs text-n-slate-10 leading-relaxed m-0 flex-1"
          data-testid="marketplace-agent-description"
        >
          {{ agent.description }}
        </p>

        <!-- Status chip -->
        <div>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-[500] bg-n-slate-9 text-n-slate-1 leading-none tracking-wide"
            data-testid="marketplace-status-chip"
          >
            {{ $t('ALGORYTHMO_ADMIN.MARKETPLACE.STATUS_SOON') }}
          </span>
        </div>
      </li>
    </ul>
  </main>
</template>
