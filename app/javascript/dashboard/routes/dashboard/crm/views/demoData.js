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

// A near-future timestamp for the synthetic "follow-up due" pill.
function inFuture(ms) {
  return new Date(Date.now() + ms).toISOString();
}

function owner(id, name) {
  return { id, name, thumbnail: '' };
}

// Build a stage-history-shaped timeline so the drawer's ATIVIDADE block has
// real-looking nodes without a network call. `steps` is oldest→newest; the
// first step (from null) is the system "created" node, the rest are moves.
// Each step: [toStageName, daysAgo, actorName|null]. actorName null = system
// (Algorythmo) actor — rendered with the brand monogram.
function buildTimeline(leadKey, steps) {
  let prevName = null;
  let prevKind = null;
  return steps.map(([toName, daysAgo, actorName], i) => {
    const fromStageId = i === 0 ? null : i;
    const actor_summary = actorName
      ? { id: `demo-a-${leadKey}-${i}`, name: actorName, thumbnail: '' }
      : null;
    const entry = {
      id: `demo-h-${leadKey}-${i}`,
      from_stage_id: fromStageId,
      from_stage_name: prevName,
      from_stage_kind: prevKind,
      to_stage_id: i + 1,
      to_stage_name: toName,
      to_stage_kind: 'open',
      actor_type: actorName ? 'user' : 'system',
      actor_id: actor_summary?.id ?? null,
      actor_summary,
      changed_at: ago(daysAgo * DAY),
    };
    prevName = toName;
    prevKind = 'open';
    return entry;
  });
}

// 16 leads across 4 stages. Names, channels and times are illustrative.
//
// Each lead carries a rich profile so the LeadDetailDrawer reads like a real
// CRM record (company / role / channels / social / summary / qualification /
// timeline) without any backend. The fields below are pure demo content:
//   - company, role            → header identity in the drawer
//   - channels[]               → {origin, handle} reachable channels
//   - social[]                 → {platform, handle, url} profile links
//   - summary                  → one-paragraph qualification narrative
//   - qualification[]          → {label, value} structured signals (BANT-ish)
//   - timeline                 → stage-history-shaped activity (buildTimeline)
//   - conversation_id          → synthetic id powering the "Ver conversa" CTA
//   - date_label / due_label / due_tone → foot-row chips on the card
export const DEMO_LEADS = Object.freeze([
  // Novo Lead (coef 1d): mix of fresh and aging
  {
    id: 'demo-l-01',
    stage_id: 'demo-novo',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(2 * HOUR),
    channel_metadata: { name: 'Camila Ribeiro' },
    contact: {
      name: 'Camila Ribeiro',
      email: 'camila.ribeiro@gmail.com',
      phone_number: '+55 11 98877-2310',
    },
    owner: null,
    company: 'Autônoma',
    role: 'Compradora pessoa física',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 98877-2310' },
      { origin: 'email', handle: 'camila.ribeiro@gmail.com' },
    ],
    social: [
      {
        platform: 'instagram',
        handle: '@camila.ribeiro',
        url: 'https://instagram.com/camila.ribeiro',
      },
    ],
    summary:
      'Entrou pelo WhatsApp pedindo orçamento para o kit completo. Demonstra urgência: quer fechar antes do fim do mês.',
    qualification: [
      { label: 'Interesse', value: 'Kit completo' },
      { label: 'Orçamento', value: 'Até R$ 3.000' },
      { label: 'Prazo', value: 'Este mês' },
    ],
    conversation_id: 90101,
    date_label: 'amanhã',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY),
    timeline: buildTimeline('01', [['Novo Lead', 0.08, null]]),
  },
  {
    id: 'demo-l-02',
    stage_id: 'demo-novo',
    channel_origin: 'instagram',
    stage_entered_at: ago(9 * HOUR),
    channel_metadata: { name: 'Bruno Tavares' },
    contact: {
      name: 'Bruno Tavares',
      email: 'bruno@tavares.design',
      phone_number: '+55 21 99645-8820',
    },
    owner: null,
    company: 'Tavares Design',
    role: 'Diretor criativo',
    channels: [
      { origin: 'instagram', handle: '@brunotavares' },
      { origin: 'email', handle: 'bruno@tavares.design' },
    ],
    social: [
      {
        platform: 'instagram',
        handle: '@brunotavares',
        url: 'https://instagram.com/brunotavares',
      },
      {
        platform: 'linkedin',
        handle: 'in/bruno-tavares',
        url: 'https://linkedin.com/in/bruno-tavares',
      },
    ],
    summary:
      'Veio de um anúncio no Instagram. Estúdio pequeno, busca um fornecedor recorrente para projetos de clientes.',
    qualification: [
      { label: 'Segmento', value: 'Agência / estúdio' },
      { label: 'Volume', value: 'Recorrente, baixo' },
      { label: 'Decisor', value: 'Sim' },
    ],
    conversation_id: 90102,
    date_label: '27 de jan',
    due_label: null,
    timeline: buildTimeline('02', [['Novo Lead', 0.38, null]]),
  },
  {
    id: 'demo-l-03',
    stage_id: 'demo-novo',
    channel_origin: 'email',
    stage_entered_at: ago(18 * HOUR),
    channel_metadata: { name: 'Lojas Verano' },
    contact: {
      name: 'Lojas Verano',
      email: 'compras@lojasverano.com.br',
      phone_number: '+55 31 3344-1200',
    },
    owner: owner('demo-o-1', 'Ana Prado'),
    company: 'Lojas Verano',
    role: 'Departamento de compras',
    channels: [{ origin: 'email', handle: 'compras@lojasverano.com.br' }],
    social: [
      {
        platform: 'linkedin',
        handle: 'company/lojas-verano',
        url: 'https://linkedin.com/company/lojas-verano',
      },
    ],
    summary:
      'Rede de varejo com 8 lojas. Pediu cotação por e-mail para reposição trimestral. Potencial de conta-chave.',
    qualification: [
      { label: 'Porte', value: '8 lojas' },
      { label: 'Necessidade', value: 'Reposição trimestral' },
      { label: 'Ticket estimado', value: 'R$ 40k+' },
    ],
    conversation_id: 90103,
    date_label: '26 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(5 * HOUR),
    timeline: buildTimeline('03', [['Novo Lead', 0.75, null]]),
  },
  {
    id: 'demo-l-04',
    stage_id: 'demo-novo',
    channel_origin: 'tiktok',
    stage_entered_at: ago(30 * HOUR),
    channel_metadata: { name: 'Diego Fontes' },
    contact: {
      name: 'Diego Fontes',
      email: 'diego.fontes@outlook.com',
      phone_number: null,
    },
    owner: null,
    company: 'Autônomo',
    role: 'Criador de conteúdo',
    channels: [{ origin: 'tiktok', handle: '@diegofontes' }],
    social: [
      {
        platform: 'tiktok',
        handle: '@diegofontes',
        url: 'https://tiktok.com/@diegofontes',
      },
    ],
    summary:
      'Chegou por um vídeo no TikTok. Ainda explorando — fez perguntas gerais sobre preço e prazo de entrega.',
    qualification: [
      { label: 'Estágio', value: 'Descoberta' },
      { label: 'Interesse', value: 'A definir' },
    ],
    conversation_id: 90104,
    date_label: '26 de jan',
    due_label: null,
    timeline: buildTimeline('04', [['Novo Lead', 1.25, null]]),
  },
  {
    id: 'demo-l-05',
    stage_id: 'demo-novo',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(4 * HOUR),
    channel_metadata: { name: 'Renata Lima' },
    contact: {
      name: 'Renata Lima',
      email: 'renata.lima@nimbus.co',
      phone_number: '+55 11 96620-7744',
    },
    owner: owner('demo-o-2', 'Carlos Nunes'),
    company: 'Nimbus Co.',
    role: 'Gerente de operações',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 96620-7744' },
      { origin: 'email', handle: 'renata.lima@nimbus.co' },
    ],
    social: [
      {
        platform: 'linkedin',
        handle: 'in/renata-lima',
        url: 'https://linkedin.com/in/renata-lima',
      },
    ],
    summary:
      'Indicada por cliente atual. Já conhece o produto e quer condições para um piloto na operação dela.',
    qualification: [
      { label: 'Origem', value: 'Indicação' },
      { label: 'Interesse', value: 'Piloto' },
      { label: 'Decisor', value: 'Influenciadora' },
    ],
    conversation_id: 90105,
    date_label: 'amanhã',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY + 2 * HOUR),
    timeline: buildTimeline('05', [['Novo Lead', 0.17, null]]),
  },
  {
    id: 'demo-l-06',
    stage_id: 'demo-novo',
    channel_origin: 'email',
    stage_entered_at: ago(50 * HOUR),
    channel_metadata: { name: 'Mercado Sul' },
    contact: {
      name: 'Mercado Sul',
      email: 'contato@mercadosul.com',
      phone_number: '+55 51 3025-9090',
    },
    owner: null,
    company: 'Mercado Sul',
    role: 'Suprimentos',
    channels: [{ origin: 'email', handle: 'contato@mercadosul.com' }],
    social: [],
    summary:
      'Distribuidora regional. Mandou um e-mail genérico de contato; ainda sem qualificação clara de necessidade.',
    qualification: [
      { label: 'Segmento', value: 'Distribuição' },
      { label: 'Qualificação', value: 'Pendente' },
    ],
    conversation_id: 90106,
    date_label: '25 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(3 * HOUR),
    timeline: buildTimeline('06', [['Novo Lead', 2.08, null]]),
  },

  // Qualificado (coef 3d)
  {
    id: 'demo-l-07',
    stage_id: 'demo-qualificado',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(1 * DAY),
    channel_metadata: { name: 'Fernanda Couto' },
    contact: {
      name: 'Fernanda Couto',
      email: 'fernanda@coutoefilhos.com.br',
      phone_number: '+55 11 99812-4456',
    },
    owner: owner('demo-o-1', 'Ana Prado'),
    company: 'Couto & Filhos',
    role: 'Sócia-proprietária',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 99812-4456' },
      { origin: 'email', handle: 'fernanda@coutoefilhos.com.br' },
    ],
    social: [
      {
        platform: 'linkedin',
        handle: 'in/fernanda-couto',
        url: 'https://linkedin.com/in/fernanda-couto',
      },
    ],
    summary:
      'Negócio familiar consolidado. Qualificada: tem orçamento aprovado e quer começar no próximo ciclo.',
    qualification: [
      { label: 'Orçamento', value: 'Aprovado' },
      { label: 'Autoridade', value: 'Decisora' },
      { label: 'Necessidade', value: 'Clara' },
      { label: 'Prazo', value: 'Próximo ciclo' },
    ],
    conversation_id: 90107,
    date_label: '27 de jan',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY),
    timeline: buildTimeline('07', [
      ['Novo Lead', 3, null],
      ['Qualificado', 1, 'Ana Prado'],
    ]),
  },
  {
    id: 'demo-l-08',
    stage_id: 'demo-qualificado',
    channel_origin: 'instagram',
    stage_entered_at: ago(2 * DAY + 6 * HOUR),
    channel_metadata: { name: 'Atelier Norte' },
    contact: {
      name: 'Atelier Norte',
      email: 'ola@ateliernorte.com',
      phone_number: '+55 85 99110-3322',
    },
    owner: owner('demo-o-2', 'Carlos Nunes'),
    company: 'Atelier Norte',
    role: 'Fundador',
    channels: [
      { origin: 'instagram', handle: '@ateliernorte' },
      { origin: 'email', handle: 'ola@ateliernorte.com' },
    ],
    social: [
      {
        platform: 'instagram',
        handle: '@ateliernorte',
        url: 'https://instagram.com/ateliernorte',
      },
    ],
    summary:
      'Marca de decoração com forte presença no Instagram. Qualificou-se em volume; negocia exclusividade regional.',
    qualification: [
      { label: 'Volume', value: 'Médio-alto' },
      { label: 'Pedido especial', value: 'Exclusividade regional' },
      { label: 'Autoridade', value: 'Decisor' },
    ],
    conversation_id: 90108,
    date_label: '24 de jan',
    due_label: null,
    timeline: buildTimeline('08', [
      ['Novo Lead', 5, null],
      ['Qualificado', 2.25, 'Carlos Nunes'],
    ]),
  },
  {
    id: 'demo-l-09',
    stage_id: 'demo-qualificado',
    channel_origin: 'email',
    stage_entered_at: ago(4 * DAY),
    channel_metadata: { name: 'Gustavo Aragão' },
    contact: {
      name: 'Gustavo Aragão',
      email: 'g.aragao@vortex.io',
      phone_number: '+55 11 95540-1188',
    },
    owner: null,
    company: 'Vortex',
    role: 'Head de growth',
    channels: [{ origin: 'email', handle: 'g.aragao@vortex.io' }],
    social: [
      {
        platform: 'linkedin',
        handle: 'in/gustavo-aragao',
        url: 'https://linkedin.com/in/gustavo-aragao',
      },
    ],
    summary:
      'Startup em escala. Avaliou a solução tecnicamente e qualificou; aguardando definição de quem assina o contrato.',
    qualification: [
      { label: 'Fit técnico', value: 'Validado' },
      { label: 'Autoridade', value: 'A confirmar' },
      { label: 'Urgência', value: 'Média' },
    ],
    conversation_id: 90109,
    date_label: '23 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(6 * HOUR),
    timeline: buildTimeline('09', [
      ['Novo Lead', 8, null],
      ['Qualificado', 4, 'Ana Prado'],
    ]),
  },
  {
    id: 'demo-l-10',
    stage_id: 'demo-qualificado',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(7 * DAY),
    channel_metadata: { name: 'Construtora Élan' },
    contact: {
      name: 'Construtora Élan',
      email: 'projetos@construtoraelan.com.br',
      phone_number: '+55 11 3550-7000',
    },
    owner: owner('demo-o-3', 'Marina Reis'),
    company: 'Construtora Élan',
    role: 'Gerente de projetos',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 3550-7000' },
      { origin: 'email', handle: 'projetos@construtoraelan.com.br' },
    ],
    social: [
      {
        platform: 'linkedin',
        handle: 'company/construtora-elan',
        url: 'https://linkedin.com/company/construtora-elan',
      },
    ],
    summary:
      'Conta corporativa grande. Qualificada há uma semana, parada aguardando aprovação interna de orçamento.',
    qualification: [
      { label: 'Porte', value: 'Corporativo' },
      { label: 'Ticket estimado', value: 'R$ 120k+' },
      { label: 'Bloqueio', value: 'Aprovação interna' },
    ],
    conversation_id: 90110,
    date_label: '20 de jan',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY + 4 * HOUR),
    timeline: buildTimeline('10', [
      ['Novo Lead', 12, null],
      ['Qualificado', 7, 'Marina Reis'],
    ]),
  },
  {
    id: 'demo-l-11',
    stage_id: 'demo-qualificado',
    channel_origin: 'tiktok',
    stage_entered_at: ago(12 * HOUR),
    channel_metadata: { name: 'Paula Vasconcelos' },
    contact: {
      name: 'Paula Vasconcelos',
      email: 'paula.v@gmail.com',
      phone_number: '+55 41 99233-7766',
    },
    owner: null,
    company: 'Autônoma',
    role: 'Revendedora',
    channels: [{ origin: 'tiktok', handle: '@paulavasc' }],
    social: [
      {
        platform: 'tiktok',
        handle: '@paulavasc',
        url: 'https://tiktok.com/@paulavasc',
      },
    ],
    summary:
      'Microinfluenciadora que quer revender. Qualificou-se por intenção; falta validar capacidade de compra.',
    qualification: [
      { label: 'Modelo', value: 'Revenda' },
      { label: 'Alcance', value: '~30k seguidores' },
      { label: 'Capacidade', value: 'A validar' },
    ],
    conversation_id: 90111,
    date_label: '27 de jan',
    due_label: null,
    timeline: buildTimeline('11', [
      ['Novo Lead', 2, null],
      ['Qualificado', 0.5, 'Carlos Nunes'],
    ]),
  },

  // Proposta Enviada (coef 5d)
  {
    id: 'demo-l-12',
    stage_id: 'demo-proposta',
    channel_origin: 'email',
    stage_entered_at: ago(2 * DAY),
    channel_metadata: { name: 'Grupo Andradas' },
    contact: {
      name: 'Grupo Andradas',
      email: 'compras@grupoandradas.com',
      phone_number: '+55 11 4002-8922',
    },
    owner: owner('demo-o-1', 'Ana Prado'),
    company: 'Grupo Andradas',
    role: 'Diretoria de compras',
    channels: [{ origin: 'email', handle: 'compras@grupoandradas.com' }],
    social: [
      {
        platform: 'linkedin',
        handle: 'company/grupo-andradas',
        url: 'https://linkedin.com/company/grupo-andradas',
      },
    ],
    summary:
      'Proposta enviada para o pacote anual. Resposta esperada após reunião de diretoria desta semana.',
    qualification: [
      { label: 'Proposta', value: 'Pacote anual' },
      { label: 'Valor', value: 'R$ 85k' },
      { label: 'Status', value: 'Em análise' },
    ],
    conversation_id: 90112,
    date_label: '27 de jan',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY),
    timeline: buildTimeline('12', [
      ['Novo Lead', 9, null],
      ['Qualificado', 5, 'Ana Prado'],
      ['Proposta Enviada', 2, 'Ana Prado'],
    ]),
  },
  {
    id: 'demo-l-13',
    stage_id: 'demo-proposta',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(6 * DAY),
    channel_metadata: { name: 'Ricardo Salles' },
    contact: {
      name: 'Ricardo Salles',
      email: 'ricardo@sallesadv.com.br',
      phone_number: '+55 11 98123-5566',
    },
    owner: owner('demo-o-2', 'Carlos Nunes'),
    company: 'Salles Advogados',
    role: 'Sócio',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 98123-5566' },
      { origin: 'email', handle: 'ricardo@sallesadv.com.br' },
    ],
    social: [
      {
        platform: 'linkedin',
        handle: 'in/ricardo-salles',
        url: 'https://linkedin.com/in/ricardo-salles',
      },
    ],
    summary:
      'Proposta enviada há seis dias. Pediu pequenos ajustes contratuais; aguardando nova versão do documento.',
    qualification: [
      { label: 'Proposta', value: 'Plano premium' },
      { label: 'Objeção', value: 'Cláusulas contratuais' },
      { label: 'Temperatura', value: 'Quente' },
    ],
    conversation_id: 90113,
    date_label: '23 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(2 * HOUR),
    timeline: buildTimeline('13', [
      ['Novo Lead', 18, null],
      ['Qualificado', 11, 'Carlos Nunes'],
      ['Proposta Enviada', 6, 'Carlos Nunes'],
    ]),
  },
  {
    id: 'demo-l-14',
    stage_id: 'demo-proposta',
    channel_origin: 'instagram',
    stage_entered_at: ago(11 * DAY),
    channel_metadata: { name: 'Studio Marés' },
    contact: {
      name: 'Studio Marés',
      email: 'contato@studiomares.com',
      phone_number: '+55 48 99876-1020',
    },
    owner: owner('demo-o-3', 'Marina Reis'),
    company: 'Studio Marés',
    role: 'Co-fundadora',
    channels: [
      { origin: 'instagram', handle: '@studiomares' },
      { origin: 'email', handle: 'contato@studiomares.com' },
    ],
    social: [
      {
        platform: 'instagram',
        handle: '@studiomares',
        url: 'https://instagram.com/studiomares',
      },
    ],
    summary:
      'Proposta parada há 11 dias — passou do tempo médio da etapa. Reengajar antes de esfriar de vez.',
    qualification: [
      { label: 'Proposta', value: 'Coleção sazonal' },
      { label: 'Risco', value: 'Esfriando' },
      { label: 'Próximo passo', value: 'Reengajar' },
    ],
    conversation_id: 90114,
    date_label: '18 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(1 * HOUR),
    timeline: buildTimeline('14', [
      ['Novo Lead', 24, null],
      ['Qualificado', 17, 'Marina Reis'],
      ['Proposta Enviada', 11, 'Marina Reis'],
    ]),
  },

  // Negociação (coef 7d)
  {
    id: 'demo-l-15',
    stage_id: 'demo-negociacao',
    channel_origin: 'whatsapp',
    stage_entered_at: ago(4 * DAY),
    channel_metadata: { name: 'Transportadora Vega' },
    contact: {
      name: 'Transportadora Vega',
      email: 'comercial@vega.log.br',
      phone_number: '+55 11 3777-4500',
    },
    owner: owner('demo-o-1', 'Ana Prado'),
    company: 'Transportadora Vega',
    role: 'Diretor comercial',
    channels: [
      { origin: 'whatsapp', handle: '+55 11 3777-4500' },
      { origin: 'email', handle: 'comercial@vega.log.br' },
    ],
    social: [
      {
        platform: 'linkedin',
        handle: 'company/transportadora-vega',
        url: 'https://linkedin.com/company/transportadora-vega',
      },
    ],
    summary:
      'Em negociação final. Discutindo desconto por volume e prazo de pagamento; fechamento provável esta semana.',
    qualification: [
      { label: 'Valor', value: 'R$ 210k/ano' },
      { label: 'Negociação', value: 'Desconto por volume' },
      { label: 'Probabilidade', value: 'Alta' },
    ],
    conversation_id: 90115,
    date_label: '23 de jan',
    due_label: 'Amanhã',
    due_tone: 'soon',
    due_at: inFuture(1 * DAY + 3 * HOUR),
    timeline: buildTimeline('15', [
      ['Novo Lead', 16, null],
      ['Qualificado', 10, 'Ana Prado'],
      ['Proposta Enviada', 7, 'Ana Prado'],
      ['Negociação', 4, 'Ana Prado'],
    ]),
  },
  {
    id: 'demo-l-16',
    stage_id: 'demo-negociacao',
    channel_origin: 'email',
    stage_entered_at: ago(16 * DAY),
    channel_metadata: { name: 'Holding Aurora' },
    contact: {
      name: 'Holding Aurora',
      email: 'novos.negocios@holdingaurora.com',
      phone_number: '+55 11 3030-8000',
    },
    owner: owner('demo-o-2', 'Carlos Nunes'),
    company: 'Holding Aurora',
    role: 'VP de novos negócios',
    channels: [{ origin: 'email', handle: 'novos.negocios@holdingaurora.com' }],
    social: [
      {
        platform: 'linkedin',
        handle: 'company/holding-aurora',
        url: 'https://linkedin.com/company/holding-aurora',
      },
    ],
    summary:
      'Negociação longa (16 dias) com conta enterprise. Aguardando aprovação do board para o contrato master.',
    qualification: [
      { label: 'Conta', value: 'Enterprise' },
      { label: 'Contrato', value: 'Master, multi-unidade' },
      { label: 'Bloqueio', value: 'Aprovação do board' },
    ],
    conversation_id: 90116,
    date_label: '11 de jan',
    due_label: 'Hoje',
    due_tone: 'today',
    due_at: inFuture(4 * HOUR),
    timeline: buildTimeline('16', [
      ['Novo Lead', 34, null],
      ['Qualificado', 26, 'Carlos Nunes'],
      ['Proposta Enviada', 19, 'Carlos Nunes'],
      ['Negociação', 16, 'Carlos Nunes'],
    ]),
  },
]);

export function buildDemoLeads() {
  // Fresh array of fresh objects so the board can mutate (drag-move) demo
  // state without ever touching the frozen source of truth above.
  return DEMO_LEADS.map(lead => ({ ...lead }));
}
