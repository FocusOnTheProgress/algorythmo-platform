<script setup>
// algorythmo: plan 0009 — Customer Support (D6) inside Commercial.
// Spec (founder 2026-05-29): requisições que chegam ao setor, taxa de conversão
// de resolução, painel Reclame Aqui (status + contagem), visibilidade de problemas.
//
// All data is demo. No backend calls — frontend-only until real ingestion ships.
// The old Help Center reader (portals/articles store calls) is replaced by this
// demo-data spec view that matches the founder's brief exactly.
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

// Four top-level KPIs.
const kpis = [
  {
    id: 'requisicoes',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    value: '284',
    unit: 'req.',
    label: 'Requisições no mês',
    delta: { text: '+12%', variant: 'down' },
  },
  {
    id: 'resolucao',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    value: '91,2',
    unit: '%',
    label: 'Taxa de resolução',
    delta: { text: '+3,1pp', variant: 'up' },
  },
  {
    id: 'tempo',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    value: '4,2',
    unit: 'h',
    label: 'Tempo médio de resolução',
    delta: { text: '−0,8 h', variant: 'up' },
  },
  {
    id: 'reclame_aqui',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    value: '3',
    unit: 'abertas',
    label: 'Reclamações Reclame Aqui',
    delta: { text: '2 resolvidas', variant: 'up' },
  },
];

// Reclame Aqui complaint tracking (demo).
const reclamacoesRA = [
  {
    id: 'ra-001',
    titulo: 'Produto entregue com avaria',
    status: 'closed',
    statusLabel: 'Resolvida',
    dias: '3 dias',
    nota: '8/10',
  },
  {
    id: 'ra-002',
    titulo: 'Atraso na entrega — pedido #48291',
    status: 'closed',
    statusLabel: 'Resolvida',
    dias: '7 dias',
    nota: '7/10',
  },
  {
    id: 'ra-003',
    titulo: 'Cobrança indevida na fatura',
    status: 'review',
    statusLabel: 'Em análise',
    dias: '2 dias',
    nota: null,
  },
  {
    id: 'ra-004',
    titulo: 'Atendimento não retornou contato',
    status: 'open',
    statusLabel: 'Aberta',
    dias: '1 dia',
    nota: null,
  },
  {
    id: 'ra-005',
    titulo: 'Troca recusada indevidamente',
    status: 'open',
    statusLabel: 'Aberta',
    dias: 'Hoje',
    nota: null,
  },
];

// Internal problem visibility.
const problemasAbertos = [
  {
    id: 'p-001',
    titulo: 'Fluxo de devolução com bug em mobile',
    status: 'open',
    prioridade: 'Alta',
    area: 'Produto',
  },
  {
    id: 'p-002',
    titulo: 'Demora no retorno do suporte N2',
    status: 'review',
    prioridade: 'Média',
    area: 'Operações',
  },
  {
    id: 'p-003',
    titulo: 'Transportadora retornando status incorreto',
    status: 'open',
    prioridade: 'Alta',
    area: 'Tech',
  },
];
</script>

<template>
  <div
    class="alg-cust-support"
    style="position: relative; display: flex; flex-direction: column; gap: 0"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.ARIA')"
  >
    <span class="alg-sector__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.WATERMARK') }}
    </span>

    <!-- editorial header -->
    <div class="alg-overview-head" style="margin-top: var(--alg-space-2)">
      <div class="alg-overview-head__left">
        <div class="alg-overview-crumb">
          <span class="alg-overview-crumb__item">Commercial</span>
          <span class="alg-overview-crumb__sep">/</span>
          <span class="alg-overview-crumb__item" style="color: rgba(255,255,255,0.72)">Atendimento</span>
        </div>
        <h2 class="alg-overview-title">Atendimento ao Cliente</h2>
        <p class="alg-overview-subtitle">
          Requisições, taxa de resolução, Reclame Aqui e visibilidade de problemas
          — o pós-venda em uma leitura.
        </p>
      </div>
    </div>

    <!-- KPI tiles -->
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

    <!-- Reclame Aqui -->
    <div class="alg-section-head" aria-hidden="true">
      <h3 class="alg-section-head__title">Reclame Aqui</h3>
      <span class="alg-section-head__count">{{ reclamacoesRA.length }} reclamações</span>
      <span class="alg-section-head__line" />
    </div>

    <div
      class="alg-reclame-card"
      role="list"
      aria-label="Reclamações no Reclame Aqui"
    >
      <div
        v-for="rec in reclamacoesRA"
        :key="rec.id"
        class="alg-issue-row"
        role="listitem"
        :aria-label="`${rec.titulo} — ${rec.statusLabel}`"
      >
        <span
          class="alg-issue-row__dot"
          :class="`alg-issue-row__dot--${rec.status}`"
          aria-hidden="true"
        />
        <span class="alg-issue-row__title">{{ rec.titulo }}</span>
        <span class="alg-issue-row__meta">{{ rec.statusLabel }} · {{ rec.dias }}</span>
        <span
          v-if="rec.nota"
          class="alg-subarea-card__chip alg-subarea-card__chip--ok"
          style="margin-left: var(--alg-space-2); flex-shrink: 0"
        >{{ rec.nota }}</span>
      </div>
    </div>

    <!-- Problemas em aberto -->
    <div
      class="alg-section-head"
      style="margin-top: var(--alg-space-4)"
      aria-hidden="true"
    >
      <h3 class="alg-section-head__title">Problemas em aberto</h3>
      <span class="alg-section-head__count">{{ problemasAbertos.length }} issues</span>
      <span class="alg-section-head__line" />
    </div>

    <div class="alg-subarea-grid">
      <div
        v-for="prob in problemasAbertos"
        :key="prob.id"
        class="alg-subarea-card"
        tabindex="0"
        role="region"
        :aria-label="prob.titulo"
      >
        <div class="alg-subarea-card__head">
          <span class="alg-subarea-card__icon-wrap" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <h4 class="alg-subarea-card__name" style="font-size: 13px; line-height: 1.35">{{ prob.titulo }}</h4>
          <span class="alg-subarea-card__status">
            <span
              class="alg-subarea-card__dot"
              :class="prob.status === 'open' ? 'alg-subarea-card__dot--risk' : 'alg-subarea-card__dot--warn'"
              aria-hidden="true"
            />
          </span>
        </div>
        <div class="alg-subarea-card__row">
          <span class="alg-subarea-card__key">Prioridade</span>
          <span class="alg-subarea-card__val">{{ prob.prioridade }}</span>
        </div>
        <div class="alg-subarea-card__row">
          <span class="alg-subarea-card__key">Área responsável</span>
          <span class="alg-subarea-card__val">{{ prob.area }}</span>
        </div>
        <div class="alg-subarea-card__row">
          <span class="alg-subarea-card__key">Status</span>
          <span
            class="alg-subarea-card__chip"
            :class="prob.status === 'open' ? 'alg-subarea-card__chip--risk' : 'alg-subarea-card__chip--warn'"
          >{{ prob.status === 'open' ? 'Aberto' : 'Em análise' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
