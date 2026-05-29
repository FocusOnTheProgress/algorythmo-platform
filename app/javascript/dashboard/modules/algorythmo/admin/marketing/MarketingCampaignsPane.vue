<script setup>
// algorythmo: plan 0009 — Campanhas (F1) inside Marketing, premium polish pass.
// The upstream campaign routes stay LIVE and unmodified; this pane surfaces
// their entry points inside the Marketing shell at premium standard.
// Layout: editorial header + glass KPI tiles + campaign links with metadata.
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

// Demo KPIs for campaign overview.
const kpis = [
  {
    id: 'ativas',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    value: '6',
    unit: 'ativas',
    label: 'Campanhas em execução',
    delta: { text: '+2 novos mês', variant: 'up' },
  },
  {
    id: 'roas',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    value: '4,8',
    unit: 'x',
    label: 'ROAS consolidado',
    delta: { text: '+0,3x', variant: 'up' },
  },
  {
    id: 'budget',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    value: 'R$ 48',
    unit: 'mil',
    label: 'Budget mensal alocado',
    delta: { text: '97% utilizado', variant: 'up' },
  },
  {
    id: 'impressoes',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
    value: '2,1',
    unit: 'M',
    label: 'Impressões no mês',
    delta: { text: '+14%', variant: 'up' },
  },
];
</script>

<template>
  <section
    class="alg-cust-support"
    style="position: relative; display: flex; flex-direction: column; gap: 0"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <!-- editorial header -->
    <div class="alg-overview-head" style="margin-top: var(--alg-space-2)">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">Marketing</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span class="alg-overview-crumb__item" style="color: rgba(255,255,255,0.72)">Campanhas</span>
        </div>
        <h2 class="alg-overview-title">{{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.HEADING') }}</h2>
        <p class="alg-overview-subtitle">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.HINT') }}
        </p>
      </div>
    </div>

    <!-- KPI tiles (demo) -->
    <div class="alg-kpi-row">
      <div v-for="kpi in kpis" :key="kpi.id" class="alg-kpi-tile">
        <div class="alg-kpi-tile__top">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="alg-kpi-tile__icon" aria-hidden="true" v-html="kpi.icon" />
          <span
            class="alg-kpi-tile__delta"
            :class="`alg-kpi-tile__delta--${kpi.delta.variant}`"
          >{{ kpi.delta.text }}</span>
        </div>
        <p class="alg-kpi-tile__value">
          {{ kpi.value }}<span class="alg-kpi-tile__unit">{{ kpi.unit }}</span>
        </p>
        <p class="alg-kpi-tile__label">{{ kpi.label }}</p>
      </div>
    </div>

    <!-- Campaign type links — glass cards pointing to upstream routes -->
    <div class="alg-section-head" aria-hidden="true">
      <h3 class="alg-section-head__title">Construtores de campanha</h3>
      <span class="alg-section-head__count">{{ links.length }} tipos</span>
      <span class="alg-section-head__line" />
    </div>

    <div class="alg-subarea-grid">
      <RouterLink
        v-for="link in links"
        :key="link.id"
        :to="link.to"
        class="alg-subarea-card"
        style="text-decoration: none"
        :aria-label="t(link.labelKey)"
      >
        <div class="alg-subarea-card__head">
          <span class="alg-subarea-card__icon-wrap" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </span>
          <h4 class="alg-subarea-card__name">{{ t(link.labelKey) }}</h4>
          <span class="alg-subarea-card__status">
            <span class="alg-subarea-card__chip alg-subarea-card__chip--ok">Acessar</span>
          </span>
        </div>
        <div class="alg-subarea-card__row" style="border-top: none; padding-top: 0">
          <span class="alg-subarea-card__key" style="font-size: var(--alg-text-sm); color: var(--alg-fg-secondary)">
            {{ t(link.descKey) }}
          </span>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
