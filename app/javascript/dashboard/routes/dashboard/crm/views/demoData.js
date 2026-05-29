// algorythmo: feature-gate algorythmo_crm
// Demonstration pipeline for the CRM Kanban.
//
// Why this exists: the Kanban renders from the live backend (usePipelineStore /
// useLeadStore). On a fresh account — and in every founder demo — the backend
// returns an empty pipeline, so the board paints nothing and the screen reads
// as broken. This module provides a realistic, clearly-labelled demonstration
// board so the surface always shows the product, never a void.
//
// The data is intentionally static and self-contained. It never touches the
// API: demo moves mutate local reactive state only (see KanbanBoard.vue). The
// "DADOS DE DEMONSTRAÇÃO" watermark on the board makes the nature explicit —
// same honesty convention as the sector dashboards (plan 0005 §9 / D12).
//
// Stage hues are the exact OKLCH values locked in DESIGN-DELTA-0009 — applied
// as a 2px column top-bar and a ~12% tint on the count pill ONLY. Never as a
// saturated header, never the Aurora magenta (sacred to the orb/avatars).

// Aging coefficient = days-per-stage; the board derives green/yellow/red from
// elapsed / (coef * 1 day). Values picked so the demo shows all three states.
export const DEMO_STAGES = Object.freeze([
  {
    id: 'demo-novo',
    name: 'Novo Lead',
    kind: 'open',
    position: 1,
    aging_coefficient: 1,
    accent: 'oklch(0.55 0.10 235)', // info — azul cinematic
  },
  {
    id: 'demo-qualificado',
    name: 'Qualificado',
    kind: 'open',
    position: 2,
    aging_coefficient: 3,
    accent: 'oklch(0.62 0.11 85)', // warning — âmbar quieto
  },
  {
    id: 'demo-proposta',
    name: 'Proposta Enviada',
    kind: 'open',
    position: 3,
    aging_coefficient: 5,
    accent: 'oklch(0.55 0.12 295)', // accent-violet — semântico de estágio
  },
  {
    id: 'demo-negociacao',
    name: 'Negociação',
    kind: 'open',
    position: 4,
    aging_coefficient: 7,
    accent: 'oklch(0.55 0.11 35)', // danger-adjacent — laranja-marrom
  },
]);

// Funnel summary shown in the header. Mirrors a healthy mid-market pipeline:
// the per-column visible cards are a sampled window; these are the totals.
export const DEMO_SUMMARY = Object.freeze({
  open_leads: 199,
  avg_funnel_hours: 62,
  conversion_rate: 0.31,
});

// Per-stage funnel counts (84 / 52 / 42 / 21 style) feed the column header
// count + the metrics chip. The board renders a sampled subset of cards per
// column (DEMO_LEADS) but reports the full stage count so the funnel reads true.
export const DEMO_STAGE_COUNTS = Object.freeze({
  'demo-novo': 84,
  'demo-qualificado': 52,
  'demo-proposta': 42,
  'demo-negociacao': 21,
});

export const DEMO_METRICS_BY_STAGE = Object.freeze({
  'demo-novo': {
    stage_id: 'demo-novo',
    stage_kind: 'open',
    lead_count: 84,
    avg_time_in_stage_seconds: 6 * 3600,
    conversion_rate_to_next: 0.62,
  },
  'demo-qualificado': {
    stage_id: 'demo-qualificado',
    stage_kind: 'open',
    lead_count: 52,
    avg_time_in_stage_seconds: 28 * 3600,
    conversion_rate_to_next: 0.81,
  },
  'demo-proposta': {
    stage_id: 'demo-proposta',
    stage_kind: 'open',
    lead_count: 42,
    avg_time_in_stage_seconds: 52 * 3600,
    conversion_rate_to_next: 0.5,
  },
  'demo-negociacao': {
    stage_id: 'demo-negociacao',
    stage_kind: 'open',
    lead_count: 21,
    avg_time_in_stage_seconds: 96 * 3600,
    conversion_rate_to_next: null,
  },
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// stage_entered_at is computed relative to "now" at build time so aging chips
// land in a spread of green / yellow / red against each stage's coefficient.
function ago(ms) {
  return new Date(Date.now() - ms).toISOString();
}

function owner(id, name) {
  return { id, name, thumbnail: '' };
}

// 16 leads across 4 stages. Names, channels and times are illustrative.
export const DEMO_LEADS = Object.freeze([
  // Novo Lead (coef 1d): mix of fresh and aging
  {
    id: 'demo-l-01',
    stage_id: 'demo-novo',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(2 * HOUR),
    channel_metadata: { name: 'Camila Ribeiro' },
    contact: { name: 'Camila Ribeiro' },
    owner: null,
  },
  {
    id: 'demo-l-02',
    stage_id: 'demo-novo',
    channel_origin: 'instagram',
    stage_entered_at: ago(9 * HOUR),
    channel_metadata: { name: 'Bruno Tavares' },
    contact: { name: 'Bruno Tavares' },
    owner: null,
  },
  {
    id: 'demo-l-03',
    stage_id: 'demo-novo',
    channel_origin: 'email',
    stage_entered_at: ago(18 * HOUR),
    channel_metadata: { name: 'Lojas Verano' },
    contact: { name: 'Lojas Verano' },
    owner: owner('demo-o-1', 'Ana Prado'),
  },
  {
    id: 'demo-l-04',
    stage_id: 'demo-novo',
    channel_origin: 'tiktok',
    stage_entered_at: ago(30 * HOUR),
    channel_metadata: { name: 'Diego Fontes' },
    contact: { name: 'Diego Fontes' },
    owner: null,
  },
  {
    id: 'demo-l-05',
    stage_id: 'demo-novo',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(4 * HOUR),
    channel_metadata: { name: 'Renata Lima' },
    contact: { name: 'Renata Lima' },
    owner: owner('demo-o-2', 'Carlos Nunes'),
  },
  {
    id: 'demo-l-06',
    stage_id: 'demo-novo',
    channel_origin: 'email',
    stage_entered_at: ago(50 * HOUR),
    channel_metadata: { name: 'Mercado Sul' },
    contact: { name: 'Mercado Sul' },
    owner: null,
  },

  // Qualificado (coef 3d)
  {
    id: 'demo-l-07',
    stage_id: 'demo-qualificado',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(1 * DAY),
    channel_metadata: { name: 'Fernanda Couto' },
    contact: { name: 'Fernanda Couto' },
    owner: owner('demo-o-1', 'Ana Prado'),
  },
  {
    id: 'demo-l-08',
    stage_id: 'demo-qualificado',
    channel_origin: 'instagram',
    stage_entered_at: ago(2 * DAY + 6 * HOUR),
    channel_metadata: { name: 'Atelier Norte' },
    contact: { name: 'Atelier Norte' },
    owner: owner('demo-o-2', 'Carlos Nunes'),
  },
  {
    id: 'demo-l-09',
    stage_id: 'demo-qualificado',
    channel_origin: 'email',
    stage_entered_at: ago(4 * DAY),
    channel_metadata: { name: 'Gustavo Aragão' },
    contact: { name: 'Gustavo Aragão' },
    owner: null,
  },
  {
    id: 'demo-l-10',
    stage_id: 'demo-qualificado',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(7 * DAY),
    channel_metadata: { name: 'Construtora Élan' },
    contact: { name: 'Construtora Élan' },
    owner: owner('demo-o-3', 'Marina Reis'),
  },
  {
    id: 'demo-l-11',
    stage_id: 'demo-qualificado',
    channel_origin: 'tiktok',
    stage_entered_at: ago(12 * HOUR),
    channel_metadata: { name: 'Paula Vasconcelos' },
    contact: { name: 'Paula Vasconcelos' },
    owner: null,
  },

  // Proposta Enviada (coef 5d)
  {
    id: 'demo-l-12',
    stage_id: 'demo-proposta',
    channel_origin: 'email',
    stage_entered_at: ago(2 * DAY),
    channel_metadata: { name: 'Grupo Andradas' },
    contact: { name: 'Grupo Andradas' },
    owner: owner('demo-o-1', 'Ana Prado'),
  },
  {
    id: 'demo-l-13',
    stage_id: 'demo-proposta',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(6 * DAY),
    channel_metadata: { name: 'Ricardo Salles' },
    contact: { name: 'Ricardo Salles' },
    owner: owner('demo-o-2', 'Carlos Nunes'),
  },
  {
    id: 'demo-l-14',
    stage_id: 'demo-proposta',
    channel_origin: 'instagram',
    stage_entered_at: ago(11 * DAY),
    channel_metadata: { name: 'Studio Marés' },
    contact: { name: 'Studio Marés' },
    owner: owner('demo-o-3', 'Marina Reis'),
  },

  // Negociação (coef 7d)
  {
    id: 'demo-l-15',
    stage_id: 'demo-negociacao',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(4 * DAY),
    channel_metadata: { name: 'Transportadora Vega' },
    contact: { name: 'Transportadora Vega' },
    owner: owner('demo-o-1', 'Ana Prado'),
  },
  {
    id: 'demo-l-16',
    stage_id: 'demo-negociacao',
    channel_origin: 'email',
    stage_entered_at: ago(16 * DAY),
    channel_metadata: { name: 'Holding Aurora' },
    contact: { name: 'Holding Aurora' },
    owner: owner('demo-o-2', 'Carlos Nunes'),
  },
]);

export function buildDemoLeads() {
  // Fresh array of fresh objects so the board can mutate (drag-move) demo
  // state without ever touching the frozen source of truth above.
  return DEMO_LEADS.map(lead => ({ ...lead }));
}
