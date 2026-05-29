<script setup>
// algorythmo: plan 0009 — Commercial Overview, premium cinematic pass (D6).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'receita',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    value: 'R$ 427',
    unit: 'mil',
    label: 'Receita fechada (30d)',
    delta: { text: '+11,4%', variant: 'up' },
  },
  {
    id: 'conversao',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    value: '18,2',
    unit: '%',
    label: 'Conversão lead → fechado',
    delta: { text: '+2,1pp', variant: 'up' },
  },
  {
    id: 'ticket',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    value: 'R$ 8.400',
    unit: '',
    label: 'Ticket médio',
    delta: { text: '+R$ 620', variant: 'up' },
  },
  {
    id: 'ciclo',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    value: '24',
    unit: 'dias',
    label: 'Ciclo médio de vendas',
    delta: { text: '−3 dias', variant: 'up' },
  },
];

const subareas = [
  {
    id: 'pipeline',
    name: 'Pipeline',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'Leads em pipeline', val: '84' },
      { key: 'Valor potencial', val: 'R$ 1,2M' },
      { key: 'Taxa de avanço', val: '62%' },
    ],
  },
  {
    id: 'conversas',
    name: 'Conversas',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    status: 'ok',
    statusLabel: 'Atendidas',
    rows: [
      { key: 'Conversas no mês', val: '1.847' },
      { key: 'Tempo médio resposta', val: '2,3 min' },
      { key: 'CSAT médio', val: '4,6/5' },
    ],
  },
  {
    id: 'sla',
    name: 'SLA',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    status: 'ok',
    statusLabel: 'No alvo',
    rows: [
      { key: 'Cumprimento de SLA', val: '94,8%' },
      { key: 'Violações no mês', val: '12' },
      { key: 'Meta', val: '≥ 92%' },
    ],
  },
  {
    id: 'csat',
    name: 'CSAT',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    status: 'ok',
    statusLabel: 'Excelente',
    rows: [
      { key: 'Pontuação média', val: '4,6/5' },
      { key: 'Respostas coletadas', val: '824' },
      { key: 'Detratores', val: '3,2%' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.ARIA')"
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
            >{{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.NAME') }}</span
          >
        </div>
        <h2 class="alg-overview-title">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TITLE') }}
        </h2>
        <p class="alg-overview-subtitle">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.SUBTITLE') }}
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
