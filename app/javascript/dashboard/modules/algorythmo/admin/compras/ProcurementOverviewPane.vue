<script setup>
// algorythmo: plan 0009 — Procurement Overview, premium cinematic pass (S-PR).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'fornecedores',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    value: '48',
    unit: 'ativos',
    label: 'Fornecedores homologados',
    delta: { text: '+3 novos', variant: 'up' },
  },
  {
    id: 'cmv',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    value: '38,4',
    unit: '%',
    label: 'CMV sobre receita',
    delta: { text: '−0,8pp', variant: 'up' },
  },
  {
    id: 'pedidos',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    value: '17',
    unit: 'POs',
    label: 'Pedidos em andamento',
    delta: { text: '4 atrasados', variant: 'warn' },
  },
  {
    id: 'giro',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`,
    value: '31',
    unit: 'dias',
    label: 'Giro médio de estoque',
    delta: { text: '+2 dias', variant: 'down' },
  },
];

const subareas = [
  {
    id: 'fornecedores',
    name: 'Fornecedores',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>`,
    status: 'ok',
    statusLabel: 'Estável',
    rows: [
      { key: 'Homologados', val: '48' },
      { key: 'Avaliação média', val: '8,4/10' },
      { key: 'Em onboarding', val: '3' },
    ],
  },
  {
    id: 'reposicao',
    name: 'Reposição',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
    status: 'warn',
    statusLabel: 'Atenção',
    rows: [
      { key: 'POs abertas', val: '17' },
      { key: 'Atrasadas', val: '4' },
      { key: 'Lead time médio', val: '6,2 dias' },
    ],
  },
  {
    id: 'custo',
    name: 'Custo de Mercadoria',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    status: 'ok',
    statusLabel: 'No alvo',
    rows: [
      { key: 'CMV 30d', val: '38,4%' },
      { key: 'Meta', val: '≤ 40%' },
      { key: 'Variação MoM', val: '−0,8pp' },
    ],
  },
  {
    id: 'giro',
    name: 'Análise de Giro',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/></svg>`,
    status: 'warn',
    statusLabel: 'Devagar',
    rows: [
      { key: 'Giro médio', val: '31 dias' },
      { key: 'Itens parados', val: '12' },
      { key: 'Meta', val: '≤ 28 dias' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    style="position: relative"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <div class="alg-overview-head">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">Gestão</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span
            class="alg-overview-crumb__item"
            style="color: rgba(255, 255, 255, 0.72)"
            >Procurement</span>
        </div>
        <h2 class="alg-overview-title">Compras</h2>
        <p class="alg-overview-subtitle">
          Fornecedores, reposição, CMV e giro — o abastecimento da operação sob
          controle.
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
            >{{ kpi.delta.text }}</span>
        </div>
        <p class="alg-kpi-tile__value">
          {{ kpi.value }}<span class="alg-kpi-tile__unit">{{ kpi.unit }}</span>
        </p>
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
              >{{ area.statusLabel }}</span>
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
