<script setup>
// algorythmo: plan 0009 — Administration Overview, premium cinematic pass (S-AD).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'metas',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    value: '78',
    unit: '%',
    label: 'Metas atingidas no trimestre',
    delta: { text: '+6pp', variant: 'up' },
  },
  {
    id: 'iniciativas',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    value: '12',
    unit: 'atv.',
    label: 'Iniciativas estratégicas ativas',
    delta: { text: '2 novas', variant: 'up' },
  },
  {
    id: 'indicadores',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    value: '91',
    unit: '%',
    label: 'Indicadores no alvo',
    delta: { text: '3 fora', variant: 'warn' },
  },
  {
    id: 'compliance',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    value: '100',
    unit: '%',
    label: 'Compliance regulatório',
    delta: { text: 'Sem pendências', variant: 'up' },
  },
];

const subareas = [
  {
    id: 'estrategia',
    name: 'Estratégia',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'Iniciativas ativas', val: '12' },
      { key: 'Em risco', val: '2' },
      { key: 'Concluídas no trimestre', val: '4' },
    ],
  },
  {
    id: 'metas',
    name: 'Metas',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    status: 'ok',
    statusLabel: 'No alvo',
    rows: [
      { key: 'Atingidas (Q2)', val: '78%' },
      { key: 'Abaixo da meta', val: '3 metas' },
      { key: 'Revisão próxima', val: 'jun/26' },
    ],
  },
  {
    id: 'indicadores',
    name: 'Indicadores',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    status: 'warn',
    statusLabel: 'Atenção',
    rows: [
      { key: 'KPIs no alvo', val: '91%' },
      { key: 'Fora do alvo', val: '3 KPIs' },
      { key: 'Em alerta crítico', val: '0' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    style="position: relative"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.ADMINISTRATION.OVERVIEW.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <div class="alg-overview-head">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">Gestão</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span class="alg-overview-crumb__item" style="color: rgba(255,255,255,0.72)">Administration</span>
        </div>
        <h2 class="alg-overview-title">Administração</h2>
        <p class="alg-overview-subtitle">
          Estratégia, metas e indicadores — o painel de controle executivo da empresa.
        </p>
      </div>
    </div>

    <div class="alg-kpi-row">
      <div v-for="kpi in kpis" :key="kpi.id" class="alg-kpi-tile">
        <div class="alg-kpi-tile__top">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span class="alg-kpi-tile__icon" aria-hidden="true" v-html="kpi.icon" />
          <span class="alg-kpi-tile__delta" :class="`alg-kpi-tile__delta--${kpi.delta.variant}`">{{ kpi.delta.text }}</span>
        </div>
        <p class="alg-kpi-tile__value">{{ kpi.value }}<span class="alg-kpi-tile__unit">{{ kpi.unit }}</span></p>
        <p class="alg-kpi-tile__label">{{ kpi.label }}</p>
      </div>
    </div>

    <div class="alg-section-head" aria-hidden="true">
      <h3 class="alg-section-head__title">Sub-áreas</h3>
      <span class="alg-section-head__count">{{ subareas.length }} áreas</span>
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
          <span class="alg-subarea-card__icon-wrap" aria-hidden="true" v-html="area.icon" />
          <h4 class="alg-subarea-card__name">{{ area.name }}</h4>
          <span class="alg-subarea-card__status">
            <span class="alg-subarea-card__dot" :class="`alg-subarea-card__dot--${area.status}`" aria-hidden="true" />
            <span class="alg-subarea-card__chip" :class="`alg-subarea-card__chip--${area.status}`">{{ area.statusLabel }}</span>
          </span>
        </div>
        <div v-for="row in area.rows" :key="row.key" class="alg-subarea-card__row">
          <span class="alg-subarea-card__key">{{ row.key }}</span>
          <span class="alg-subarea-card__val">{{ row.val }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
