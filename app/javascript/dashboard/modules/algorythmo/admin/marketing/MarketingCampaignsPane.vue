<script setup>
// algorythmo: plan 0007 M2-d — Campanhas sub-tab (D8).
// Absorbs the former top-level Campaigns surface. The upstream campaign routes
// (campaigns_ongoing_index / campaigns_one_off_index) stay LIVE and unmodified;
// this pane only surfaces their entry points inside the Marketing shell. We do
// NOT embed the heavy campaign list SFCs (own store + chrome) — the links keep
// the unabridged campaign builders one click away.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import campaignLinks from '../mocks/sectors/marketing-campaigns';

const { t } = useI18n();
const { accountScopedRoute } = useAccount();

const links = computed(() =>
  campaignLinks.map(link => ({
    ...link,
    to: accountScopedRoute(link.routeName),
  }))
);
</script>

<template>
  <section
    class="alg-support"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ARIA')"
  >
    <header class="alg-support__header">
      <p class="alg-support__portal">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.HEADING') }}
      </p>
      <p class="alg-support__hint">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.HINT') }}
      </p>
    </header>

    <ul class="alg-support__list">
      <li v-for="link in links" :key="link.id" class="alg-support__article">
        <RouterLink class="alg-subtab__link" :to="link.to">
          {{ t(link.labelKey) }}
        </RouterLink>
        <span class="alg-support__article-meta">{{ t(link.descKey) }}</span>
      </li>
    </ul>
  </section>
</template>
