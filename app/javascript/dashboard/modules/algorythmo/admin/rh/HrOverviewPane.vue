<script setup>
// algorythmo: plan 0009 — HR Overview, premium cinematic pass (S-HR).
// Layout: editorial header + glass KPI tiles + sub-area drill-down grid.
// Agent chat via SectorShellV2 footer. All data is demo (D12 watermark).
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const kpis = [
  {
    id: 'headcount',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    value: '142',
    unit: 'pessoas',
    label: 'Headcount ativo',
    delta: { text: '+4 este mês', variant: 'up' },
  },
  {
    id: 'enps',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    value: '+42',
    unit: 'pts',
    label: 'eNPS da empresa',
    delta: { text: '+8 MoM', variant: 'up' },
  },
  {
    id: 'turnover',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
    value: '4,2',
    unit: '%',
    label: 'Turnover anualizado',
    delta: { text: '−0,8pp', variant: 'up' },
  },
  {
    id: 'vagas',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    value: '7',
    unit: 'vagas',
    label: 'Posições abertas',
    delta: { text: '3 urgentes', variant: 'warn' },
  },
];

const subareas = [
  {
    id: 'contratacao',
    name: 'Contratação',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>`,
    status: 'warn',
    statusLabel: 'Urgente',
    rows: [
      { key: 'Vagas abertas', val: '7' },
      { key: 'Candidatos em processo', val: '23' },
      { key: 'Tempo médio de contratação', val: '18 dias' },
    ],
  },
  {
    id: 'treinamento',
    name: 'Treinamento',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
    status: 'ok',
    statusLabel: 'Em dia',
    rows: [
      { key: 'Conclusão no mês', val: '94%' },
      { key: 'Horas por colaborador', val: '8,3 h' },
      { key: 'NPS de treinamento', val: '76' },
    ],
  },
  {
    id: 'cultura',
    name: 'Cultura',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
    status: 'ok',
    statusLabel: 'Saudável',
    rows: [
      { key: 'eNPS', val: '+42' },
      { key: 'Participação na pesquisa', val: '89%' },
      { key: 'Satisfação geral', val: '8,1/10' },
    ],
  },
  {
    id: 'produtividade',
    name: 'Produtividade',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
    status: 'ok',
    statusLabel: 'Acima da meta',
    rows: [
      { key: 'Índice de produtividade', val: '87 pts' },
      { key: 'Meta trimestral', val: '82 pts' },
      { key: 'Absenteísmo', val: '1,8%' },
    ],
  },
];
</script>

<template>
  <div
    class="alg-overview-pane"
    style="position: relative"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.ARIA')"
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
            >HR</span>
        </div>
        <h2 class="alg-overview-title">Recursos Humanos</h2>
        <p class="alg-overview-subtitle">
          Contratação, treinamento, cultura e produtividade — o capital humano
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
