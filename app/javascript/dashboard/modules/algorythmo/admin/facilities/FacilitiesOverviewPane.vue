<script setup>
// algorythmo: plan 0009 — Facilities Overview, premium cinematic pass (S-FA).
// Layout: editorial header + glass KPI tiles + spend-category drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'total',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    value: 'R$ 71,2',
    unit: 'mil',
    label: 'Gasto total mensal',
    delta: { text: '+2,1%', variant: 'down' },
  },
  {
    id: 'unidades',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
    value: '3',
    unit: 'unidades',
    label: 'Unidades monitoradas',
    delta: { text: 'Estável', variant: 'up' },
  },
  {
    id: 'aluguel',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    value: 'R$ 48,2',
    unit: 'mil',
    label: 'Aluguel mensal',
    delta: { text: 'Fixo', variant: 'up' },
  },
  {
    id: 'energia',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    value: 'R$ 12,7',
    unit: 'mil',
    label: 'Energia elétrica',
    delta: { text: '+8,4%', variant: 'down' },
  },
];

const subareas = [
  {
    id: 'higiene',
    name: 'Higiene Pessoal',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/></svg>`,
    status: 'ok',
    statusLabel: 'Regular',
    rows: [
      { key: 'Gasto mensal', val: 'R$ 1.840' },
      { key: 'Por unidade', val: 'R$ 613' },
      { key: 'Variação MoM', val: '+0,3%' },
    ],
  },
  {
    id: 'limpeza_espaco',
    name: 'Limpeza do Espaço',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    status: 'ok',
    statusLabel: 'Regular',
    rows: [
      { key: 'Gasto mensal', val: 'R$ 2.060' },
      { key: 'Frequência', val: 'Diária' },
      { key: 'Contratos ativos', val: '2' },
    ],
  },
  {
    id: 'equipe_limpeza',
    name: 'Equipe de Limpeza',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    status: 'ok',
    statusLabel: 'Estável',
    rows: [
      { key: 'Colaboradores', val: '4' },
      { key: 'Custo pessoal', val: 'R$ 3.900' },
      { key: 'Cobertura', val: '3 unidades' },
    ],
  },
  {
    id: 'energia',
    name: 'Energia',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    status: 'warn',
    statusLabel: 'Alta',
    rows: [
      { key: 'Gasto mensal', val: 'R$ 12.700' },
      { key: 'Variação MoM', val: '+8,4%' },
      { key: 'Maior consumidor', val: 'CD Principal' },
    ],
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    status: 'ok',
    statusLabel: 'Controlada',
    rows: [
      { key: 'Gasto mensal', val: 'R$ 6.400' },
      { key: 'Ocorrências abertas', val: '2' },
      { key: 'Resolução média', val: '1,4 dias' },
    ],
  },
  {
    id: 'aluguel',
    name: 'Aluguel',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    status: 'ok',
    statusLabel: 'Fixo',
    rows: [
      { key: 'Custo mensal', val: 'R$ 48.200' },
      { key: 'Vencimento contrato', val: 'dez/27' },
      { key: 'Reajuste previsto', val: 'jan/27 (IGPM)' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    style="position: relative"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <div class="alg-overview-head">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">Gestão</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span class="alg-overview-crumb__item" style="color: rgba(255,255,255,0.72)">Facilities</span>
        </div>
        <h2 class="alg-overview-title">Facilities</h2>
        <p class="alg-overview-subtitle">
          Aluguel, energia, limpeza e manutenção — o custo de manter a empresa funcionando.
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
      <h3 class="alg-section-head__title">Categorias de gasto</h3>
      <span class="alg-section-head__count">{{ subareas.length }} categorias</span>
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
