<script setup>
// algorythmo: plan 0009 — Marketing Overview, premium cinematic pass (S-MK).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'cac',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    value: 'R$ 148',
    unit: '',
    label: 'CAC médio (30d)',
    delta: { text: '−R$ 12', variant: 'up' },
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
    id: 'leads',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    value: '1.240',
    unit: 'leads',
    label: 'Leads gerados (30d)',
    delta: { text: '+18%', variant: 'up' },
  },
  {
    id: 'retencao',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    value: '84',
    unit: '%',
    label: 'Retenção de clientes',
    delta: { text: '+2pp', variant: 'up' },
  },
];

const subareas = [
  {
    id: 'branding',
    name: 'Branding',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    status: 'ok',
    statusLabel: 'Estável',
    rows: [
      { key: 'Reconhecimento de marca', val: '62%' },
      { key: 'NPS de marca', val: '+51' },
      { key: 'Menções positivas', val: '94%' },
    ],
  },
  {
    id: 'campanhas',
    name: 'Campanhas',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    status: 'ok',
    statusLabel: 'Ativas',
    rows: [
      { key: 'Campanhas ativas', val: '6' },
      { key: 'ROAS consolidado', val: '4,8x' },
      { key: 'Budget alocado', val: '97%' },
    ],
  },
  {
    id: 'redes_sociais',
    name: 'Redes Sociais',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
    status: 'ok',
    statusLabel: 'Crescendo',
    rows: [
      { key: 'Seguidores totais', val: '48,2 mil' },
      { key: 'Engajamento médio', val: '3,8%' },
      { key: 'Crescimento MoM', val: '+4,1%' },
    ],
  },
  {
    id: 'trafego',
    name: 'Tráfego',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    status: 'warn',
    statusLabel: 'Abaixo da meta',
    rows: [
      { key: 'Visitas únicas (30d)', val: '12,4 mil' },
      { key: 'Taxa de conversão', val: '2,1%' },
      { key: 'Custo por clique', val: 'R$ 1,42' },
    ],
  },
  {
    id: 'crm',
    name: 'CRM / Base',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'Leads ativos na base', val: '4.820' },
      { key: 'MQLs no mês', val: '312' },
      { key: 'Taxa de qualificação', val: '25%' },
    ],
  },
  {
    id: 'retencao',
    name: 'Retenção',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    status: 'ok',
    statusLabel: 'Acima da meta',
    rows: [
      { key: 'Retenção de clientes', val: '84%' },
      { key: 'Churn mensal', val: '1,6%' },
      { key: 'LTV médio', val: 'R$ 3.240' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <div class="alg-overview-head">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">{{
            t('ALGORYTHMO_ADMIN.SECTORS.CRUMB_ROOT')
          }}</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span
            class="alg-overview-crumb__item alg-overview-crumb__item--current"
            >{{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.NAME') }}</span
          >
        </div>
        <h2 class="alg-overview-title">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TITLE') }}
        </h2>
        <p class="alg-overview-subtitle">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.SUBTITLE') }}
        </p>
      </div>
    </div>

    <div class="alg-kpi-row">
      <div v-for="kpi in kpis" :key="kpi.id" class="alg-kpi-tile">
        <div class="alg-kpi-tile__top">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span
            class="alg-kpi-tile__icon"
            aria-hidden="true"
            v-html="kpi.icon"
          />
          <span
            class="alg-kpi-tile__delta"
            :class="`alg-kpi-tile__delta--${kpi.delta.variant}`"
            >{{ kpi.delta.text }}</span
          >
        </div>
        <p class="alg-kpi-tile__value">
          {{ kpi.value }}<span class="alg-kpi-tile__unit">{{ kpi.unit }}</span>
        </p>
        <p class="alg-kpi-tile__label">{{ kpi.label }}</p>
      </div>
    </div>

    <div class="alg-section-head" aria-hidden="true">
      <h3 class="alg-section-head__title">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.SUBAREAS_HEADER') }}
      </h3>
      <span class="alg-section-head__count">{{
        t('ALGORYTHMO_ADMIN.SECTORS.SUBAREAS_COUNT', { count: subareas.length })
      }}</span>
      <span class="alg-section-head__line" />
    </div>

    <div class="alg-subarea-grid">
      <div
        v-for="area in subareas"
        :key="area.id"
        class="alg-subarea-card"
        tabindex="0"
        role="region"
        :aria-label="area.name"
      >
        <div class="alg-subarea-card__head">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span
            class="alg-subarea-card__icon-wrap"
            aria-hidden="true"
            v-html="area.icon"
          />
          <h4 class="alg-subarea-card__name">{{ area.name }}</h4>
          <span class="alg-subarea-card__status">
            <span
              class="alg-subarea-card__dot"
              :class="`alg-subarea-card__dot--${area.status}`"
              aria-hidden="true"
            />
            <span
              class="alg-subarea-card__chip"
              :class="`alg-subarea-card__chip--${area.status}`"
              >{{ area.statusLabel }}</span
            >
          </span>
        </div>
        <div
          v-for="row in area.rows"
          :key="row.key"
          class="alg-subarea-card__row"
        >
          <span class="alg-subarea-card__key">{{ row.key }}</span>
          <span class="alg-subarea-card__val">{{ row.val }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
