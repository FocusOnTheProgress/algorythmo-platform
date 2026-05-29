<script setup>
// algorythmo: plan 0009 — Finance Overview, premium cinematic pass (S-FI).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'receita',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    value: 'R$ 847',
    unit: 'mil',
    label: 'Receita líquida (30d)',
    delta: { text: '+6,2%', variant: 'up' },
  },
  {
    id: 'margem',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>`,
    value: '18,4',
    unit: '%',
    label: 'Margem operacional',
    delta: { text: '+1,2pp', variant: 'up' },
  },
  {
    id: 'caixa',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    value: 'R$ 312',
    unit: 'mil',
    label: 'Saldo de caixa',
    delta: { text: '−28 mil', variant: 'warn' },
  },
  {
    id: 'inadimplencia',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    value: '2,8',
    unit: '%',
    label: 'Inadimplência',
    delta: { text: '+0,4pp', variant: 'down' },
  },
];

const subareas = [
  {
    id: 'a_pagar',
    name: 'Contas a Pagar',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    status: 'ok',
    statusLabel: 'Em dia',
    rows: [
      { key: 'Vencendo hoje', val: 'R$ 14,2 mil' },
      { key: 'Próximos 7 dias', val: 'R$ 48,6 mil' },
      { key: 'Em atraso', val: 'R$ 0' },
    ],
  },
  {
    id: 'a_receber',
    name: 'Contas a Receber',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    status: 'warn',
    statusLabel: 'Atenção',
    rows: [
      { key: 'A receber 30d', val: 'R$ 203 mil' },
      { key: 'Inadimplente', val: 'R$ 23,7 mil' },
      { key: 'Taxa inadimpl.', val: '2,8%' },
    ],
  },
  {
    id: 'fluxo',
    name: 'Fluxo de Caixa',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    status: 'warn',
    statusLabel: 'Pressão',
    rows: [
      { key: 'Saldo atual', val: 'R$ 312 mil' },
      { key: 'Projeção 30d', val: 'R$ 284 mil' },
      { key: 'Queima mensal', val: 'R$ 28 mil' },
    ],
  },
  {
    id: 'margem',
    name: 'Margem & Lucro',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>`,
    status: 'ok',
    statusLabel: 'Acima da meta',
    rows: [
      { key: 'Margem bruta', val: '52,1%' },
      { key: 'Margem operacional', val: '18,4%' },
      { key: 'Lucro líquido', val: 'R$ 156 mil' },
    ],
  },
  {
    id: 'planejamento',
    name: 'Planejamento',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    status: 'ok',
    statusLabel: 'No alvo',
    rows: [
      { key: 'Aderência ao orçamento', val: '97,2%' },
      { key: 'Revisão trimestral', val: 'Q2 / mai' },
      { key: 'Variância acumulada', val: '−2,8%' },
    ],
  },
  {
    id: 'impostos',
    name: 'Fiscal',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    status: 'ok',
    statusLabel: 'Regular',
    rows: [
      { key: 'Obrigações do mês', val: '7 / 7 ok' },
      { key: 'Regime tributário', val: 'Lucro Real' },
      { key: 'Próximo vencimento', val: '10/jun' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    style="position: relative"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.ARIA')"
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
            >Finance</span>
        </div>
        <h2 class="alg-overview-title">Financeiro</h2>
        <p class="alg-overview-subtitle">
          Contas a pagar, receber, fluxo de caixa e margem — a saúde financeira
          da empresa em uma leitura.
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
