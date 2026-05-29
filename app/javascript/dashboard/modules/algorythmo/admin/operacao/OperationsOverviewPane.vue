<script setup>
// algorythmo: plan 0009 — Operations Overview, premium cinematic pass (G5 + S-OP).
// Matches the approved layout from docs/plans/cinematic-os/preview/01-sector-overview.html:
//   1. editorial header with crumb + title + subtitle
//   2. glass KPI tiles row (4 across)
//   3. sub-area drill-down grid (6 glass cards × 3 metric rows)
// Agent chat is at the bottom via SectorShellV2's #agentChat slot — not here.
// All data is demo (D12 contract — watermark always visible).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Four top-level KPIs summarising the sector at a glance.
const kpis = [
  {
    id: 'estoque',
    // box icon
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12"/></svg>`,
    value: '1.284',
    unit: 'SKUs',
    label: 'Itens em estoque',
    delta: { text: '+4,2%', variant: 'up' },
  },
  {
    id: 'catalogo',
    // chart line icon
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    value: '94,1',
    unit: '%',
    label: 'Disponibilidade de catálogo',
    delta: { text: '23 baixos', variant: 'warn' },
  },
  {
    id: 'entrega',
    // truck icon
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>`,
    value: '1,8',
    unit: 'dias',
    label: 'Tempo médio de entrega',
    delta: { text: '−0,4 dia', variant: 'up' },
  },
  {
    id: 'prazo',
    // monitor icon
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    value: '99,2',
    unit: '%',
    label: 'Pedidos expedidos no prazo',
    delta: { text: '−1,1%', variant: 'down' },
  },
];

// Six sub-areas — each maps to a SectorShellV2 sub-tab by id.
const subareas = [
  {
    id: 'estoque',
    name: 'Estoque',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'Cobertura média', val: '31 dias' },
      { key: 'Acuracidade', val: '98,6%' },
      { key: 'Ruptura ativa', val: '0 SKU' },
    ],
  },
  {
    id: 'reposicao',
    name: 'Reposição',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
    status: 'warn',
    statusLabel: 'Atenção',
    rows: [
      { key: 'Ordens abertas', val: '17' },
      { key: 'Abaixo do mínimo', val: '23 SKU' },
      { key: 'Lead time fornecedor', val: '6,2 dias' },
    ],
  },
  {
    id: 'logistica',
    name: 'Logística',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="6.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>`,
    status: 'ok',
    statusLabel: 'No prazo',
    rows: [
      { key: 'Rotas ativas', val: '12' },
      { key: 'Custo por entrega', val: 'R$ 9,40' },
      { key: 'Ocorrências', val: '2' },
    ],
  },
  {
    id: 'organizacao',
    name: 'Organização',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'Ocupação do CD', val: '72%' },
      { key: 'Endereços livres', val: '418' },
      { key: 'Inventário cíclico', val: 'em dia' },
    ],
  },
  {
    id: 'entrega',
    name: 'Entrega',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>`,
    status: 'ok',
    statusLabel: '99,2%',
    rows: [
      { key: 'Entregues hoje', val: '341' },
      { key: 'Em trânsito', val: '88' },
      { key: 'Devoluções', val: '3' },
    ],
  },
  {
    id: 'expedicao',
    name: 'Expedição',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 16h6M19 13v6"/><path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4"/><path d="M2 13h10M2 17h7"/><path d="M2 9h20"/></svg>`,
    status: 'risk',
    statusLabel: 'Gargalo',
    rows: [
      { key: 'Fila de separação', val: '54 pedidos' },
      { key: 'Capacidade usada', val: '96%' },
      { key: 'Atraso médio', val: '38 min' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <!-- editorial header -->
    <div class="alg-overview-head">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">{{
            t('ALGORYTHMO_ADMIN.SECTORS.CRUMB_ROOT')
          }}</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span
            class="alg-overview-crumb__item alg-overview-crumb__item--current"
            >{{ t('ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.NAME') }}</span
          >
        </div>
        <h2 class="alg-overview-title">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.TITLE') }}
        </h2>
        <p class="alg-overview-subtitle">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.SUBTITLE') }}
        </p>
      </div>
    </div>

    <!-- KPI tiles -->
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

    <!-- sub-areas section -->
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
