# Plano 0006 — Algorythmo OS: Relatórios Comerciais overlay (M6.1)

**Status:** DRAFT — pronto pra `/plan-design-review` + `/plan-eng-review` formais. 2 inputs do founder pendentes (D8 lista de KPIs, D11 divisão Marketing↔Comercial). Frontend-only com exceção documentada abaixo.
**Data:** 2026-05-27
**Owner:** Gustavo (founder/CEO Algorythmo)
**Linhagem:** sucede plano 0005 (M5-M9 mergeados). Consome decisões D1-D6 + adiciona D7-D13 trancadas em `docs/algorythmo/M6-1-reports-overlay/office-hours.md`.
**Escopo:** **frontend somente** — com exceção deliberada: o mirror Ruby do cut-flag (`feature_flag_bits.rb`) entra em M6.1-a (PR #77). Razão: D13 é estruturalmente quebrada sem o Ruby mirror porque `algorythmoCutFlagCoverage.spec.js` e o concern server-side ficam dessincronizados, causando UX drift silencioso. Todos os demais milestones (M6.1-b/c/d) são frontend-only. Sem migration, sem controller.

> **Por que esse plano existe:** M5 renomeou "Reports" → "Relatórios Comerciais" mas a tela continuou sendo a Reports crua do Chatwoot (overview de SLA / response time / agents). O nome promete uma coisa, a tela entrega outra. M6.1 fecha esse gap entregando uma **primeira aba default "Visão Comercial"** que reusa 100% do shell `SectorDashboard` (designer-locked em M6.0) com mock realista comercial e o painel `SectorAgentChat`. As abas legadas Chatwoot continuam acessíveis 1 clique abaixo, sem perda.

---

## 1. Visão da entrega

Quando o admin abre **Relatórios Comerciais** na sidebar (bloco GESTÃO), ele cai por **default** numa rota nova `account_overview_commercial` que renderiza:

- **Header editorial** com título "Visão Comercial" + 1 linha de contexto ("últimos 30 dias").
- **2 anchor KPIs** (50/50) topo: Receita fechada (30d) + Taxa de conversão lead→fechado.
- **4 secondary KPIs** (4-col): Leads novos / Ciclo médio / Ticket médio / Canal top1 (% share).
- **1 chart full-width** área 12 semanas — Receita fechada por semana (mock realista).
- **Painel direito 360px** com `SectorAgentChat` rotulado "Comercial · agente" (placeholder).
- **Watermark "DADOS DE DEMONSTRAÇÃO"** em todo card.

Logo abaixo do header da página, **chips/tabs nativas** da Reports continuam visíveis (Operacional / Conversa / Agentes / Inboxes / Labels / Equipes / SLA / CSAT). Clicar leva pras abas Chatwoot upstream intactas. **Visão Comercial é a primeira aba e o default** — admin cai nela sem clicar.

**Critério de pronto do plano:** founder loga como admin, clica em "Relatórios Comerciais" na sidebar, cai direto na Visão Comercial, vê 2 anchor + 4 secondary + chart + agente placeholder. Clica em qualquer aba legada e vê a tela Chatwoot intacta. Watermark visível em cada card.

---

## 2. Decisões trancadas (sessão office-hours 2026-05-27)

| ID | Decisão | Impacto |
|---|---|---|
| **D7** | **Overlay vive como rota filha de `ReportsWrapper`**, não rota separada `/reports/commercial`. Path `overview` permanece (alias upstream), nova path `commercial` adicionada como **primeira filha** e o redirect `path: ''` aponta pra `commercial_reports`. | Reusa shell de scroll/max-width já existente. Reusa permissions `['administrator', 'report_manage']`. Zero conflict com upstream — só adicionamos uma rota a mais. |
| **D8** | **KPIs canônicos do overlay** *(pendente confirmação founder antes de M6.1-c)*. Proposta: anchors = (Receita fechada 30d, Taxa conv. lead→fechado); secondaries = (Leads novos 30d, Ciclo médio dias, Ticket médio, Canal top1 share). | Foco em meio/fundo de funil. Se founder quiser mexer, troca em `mocks/sectors/commercial.js`. |
| **D9** | **Período fixo "últimos 30 dias"** no v0. Sem date-picker. | Date-picker entra em M6.1-extras pós-v0. Reduz LOC e área de teste. |
| **D10** | **Reusa `SectorAgentChat` como-é**, label "Comercial · agente". Sem variante nova. | Consistência visual com 7 setores já entregues (D3, memory `feedback_architecture_defer_upstream.md`). |
| **D11** | **Divisão Marketing↔Comercial** *(pendente confirmação founder antes de M6.1-c)*. Proposta: Marketing = topo de funil (CAC, ROAS, CTR, MQLs, CPL — já implementado em `mocks/sectors/marketing.js`); Comercial = meio/fundo (pipeline, conversão, receita, ciclo, ticket, canal de fechamento). Sem KPI duplicado entre as duas telas. | Define fronteira de leitura. Se founder quiser sobreposição intencional, ajusta o mock antes do PR de conteúdo (M6.1-c). |
| **D12** | **Watermark "DADOS DE DEMONSTRAÇÃO"** mantida (mesma string i18n de M6.0). | Mitigação do risco 4 de plano 0005 (mock vira source-of-truth em demo). |
| **D13** | **Cut-flag `algorythmo_admin_reports_commercial`** (default ON pra admin). Reversível por cliente. | Padrão `algorythmoCutFlags.js`. Se algum cliente PME não quiser ver no MVP, esconde sem deploy. |

---

## 3. Restrições operacionais

- **Frontend somente.** Nada de migration / controller / job / service. Se aparecer necessidade, marca `BACKEND_DEPS` no plano e segue com mock.
- **Reusar superfícies existentes** sempre: `ReportsWrapper` (router-view), `SectorDashboard.vue`, `SectorAgentChat.vue`, `mocks/sectors/contract.js`, watermark string já presente em pt_BR override.
- **Marcação inline `// algorythmo:`** em qualquer linha que tocar arquivo upstream (`reports.routes.js`).
- **Sistema de flags `algorythmo_*`** continua sendo gate único.
- **Sync mensal com upstream** — toda mudança em `reports.routes.js` é mínima (adição de 1 rota nova + edição do `path:'' redirect`).

---

## 4. Mapa de superfícies (verificado 2026-05-27)

| Superfície | Arquivo:linha | Estado | Ação M6.1 |
|---|---|---|---|
| Reports route registry | `app/javascript/dashboard/routes/dashboard/settings/reports/reports.routes.js:127-178` | Existe. `ReportsWrapper` é root. Redirect default `path:''` → `account_overview_reports`. | **Adicionar nova route `commercial`** como primeira filha + **trocar redirect default** pra `commercial_reports`. Marcar `// algorythmo:`. |
| Reports shell | `app/javascript/dashboard/routes/dashboard/settings/reports/components/ReportsWrapper.vue:1-8` | Existe. Só `<router-view />` dentro de `max-w-5xl`. | **Nenhuma mudança.** Nossa rota nova vira filha — herda shell. |
| Sidebar Reports children | `app/javascript/dashboard/components-next/sidebar/Sidebar.vue:561-597` | Existe. Lista filha `Reports` com Overview / Conversation / etc. | **Adicionar entry "Visão Comercial"** como PRIMEIRA filha de Reports. Marcar `// algorythmo:`. |
| Sector shell | `app/javascript/dashboard/modules/algorythmo/admin/sectors/SectorDashboard.vue:1-341` | Existe + designer-locked em M6.0. | **Reuso 100%.** Sem fork. |
| Sector agent chat | `app/javascript/dashboard/modules/algorythmo/admin/sectors/SectorAgentChat.vue:1-373` | Existe. | **Reuso 100%.** Prop `sectorNameKey` recebe `SECTORS.COMMERCIAL.HEADING`. |
| Mock contract | `app/javascript/dashboard/modules/algorythmo/admin/mocks/sectors/contract.js:1-46` | Existe. Define typedef `SectorMock` (2 anchors, 4 secondaries, optional chart). | **Reuso 100%.** Novo `commercial.js` segue typedef. |
| Mock realismo de referência | `app/javascript/dashboard/modules/algorythmo/admin/mocks/sectors/operacao.js` + `marketing.js` | Existem. Operação é canônico, Marketing extrapolado. | Padrão a seguir pra `commercial.js`. |
| i18n override Algorythmo | `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json:3` (já tem `RELATORIOS_COMERCIAIS`) | Existe. Deep-merge sobre Chatwoot. | **Adicionar bloco `ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.*`** + entry `SIDEBAR.RELATORIOS_COMERCIAIS_VISAO`. |
| Cut flags registry | `app/javascript/dashboard/store/modules/algorythmoCutFlags.js` (e mirror server) | Existe. | **Adicionar `reports_commercial`** ao registry (default ON pra admin). Mirror server fica `BACKEND_DEPS` se não houver mirror cliente puro. |
| Modules dir convention | `app/javascript/dashboard/modules/algorythmo/admin/<setor>/` com `routes.js` + `<Setor>Dashboard.vue` | Existe (operacao, compras, etc.). | **Criar `admin/reports-commercial/`** com `routes.js` + `ReportsCommercialOverlay.vue`. |

---

## 5. Arquitetura

```
┌─ Sidebar (admin, GESTÃO block) ────────────────────────────────────┐
│                                                                    │
│  Relatórios Comerciais ▾                                           │
│    ├─ Visão Comercial      ◄── NEW (M6.1, default redirect)        │
│    ├─ Operacional          (Chatwoot live overview)                │
│    ├─ Conversa             (Chatwoot)                              │
│    ├─ Agentes / Inboxes / Labels / Equipes  (Chatwoot)             │
│    ├─ CSAT / SLA           (Chatwoot)                              │
│    └─ [Bot — cut-flagged]                                          │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
         ┌─ /accounts/:id/reports/commercial ──────────────────────┐
         │                                                         │
         │  ReportsWrapper (upstream, max-w-5xl + scroll)          │
         │  └─ <router-view/>                                      │
         │     │                                                   │
         │     ▼                                                   │
         │  ReportsCommercialOverlay.vue   (M6.1 component)        │
         │  └─ <SectorDashboard :mock="commercialMock" />          │
         │  └─ <SectorAgentChat :sector-name-key="…HEADING" />     │
         │                                                         │
         │  data flow:                                             │
         │    mocks/sectors/commercial.js  ◄── frontend-only       │
         │                                  (no fetch, no store)   │
         │                                                         │
         │  cut-flag gate:                                         │
         │    algorythmoCutHidden.value.reports_commercial         │
         │    └─ if true → fallthrough to old default              │
         └─────────────────────────────────────────────────────────┘
```

**Decisão arquitetural chave:** o overlay **NÃO** é um SPA novo. É uma rota filha de `ReportsWrapper`. Logo herda automaticamente:
- Permissões (`['administrator', 'report_manage']`)
- Sidebar de filhos de Reports (já mostra todas as abas)
- Shell de scroll/max-width
- Breadcrumb upstream

Custo: **uma rota nova + um redirect editado + um componente novo + um mock novo + um entry de sidebar + cut-flag + i18n.** Nada mais.

---

## 6. Milestones

> Cada milestone = 1 PR. Granulares pra cada um caber em ≤ 400 LOC e ter critério de aceite independente. Cota total: **4 PRs**. Sequenciais (todos tocam `reports.routes.js` ou state compartilhado).

### M6.1-a — Cut-flag + i18n strings + Ruby mirror (foundation)

**Objetivo:** preparar o terreno antes de qualquer rota. Não muda comportamento visível.

**Escopo:**
1. Adicionar `reports_commercial` em `algorythmoCutFlags.js` (default visible, i.e. NOT cut).
2. **Mirror Ruby obrigatório:** adicionar `reports_commercial` em `Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES` posição 16 (`app/models/concerns/algorythmo/feature_flag_bits.rb`). Obrigatório porque a spec `algorythmoCutFlagCoverage.spec.js` e o concern server-side devem sempre ser co-atualizados — divergência causa UX drift silencioso (documentado na restrição do plano). Specs Ruby em `spec/models/concerns/algorythmo/feature_flag_bits_spec.rb` atualizadas: count 15→16, 3 specs novos para `reports_commercial`.
3. **Stub de rota obrigatório em `reports.routes.js`:** a spec `algorythmoCutFlagCoverage.spec.js:68-75` (orphan check) exige que todo flag no registry esteja referenciado em pelo menos uma rota. Como o componente real só chega em M6.1-b, M6.1-a adiciona um stub `{ path: 'commercial', name: 'commercial_reports', component: { template: '<div />' } }` com o `algorythmoCutFlag` meta declarado. O componente placeholder é substituído pelo overlay real em M6.1-b. Este é um requisito estrutural, não scope creep.
4. Adicionar bloco `ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.*` em `engines/algorythmo/.../overrides/pt_BR.json`:
   - `HEADING`, `CONTEXT`
   - `ANCHOR.RECEITA_LABEL`, `ANCHOR.CONVERSAO_LABEL`
   - `SECONDARY.LEADS_LABEL`, `SECONDARY.CICLO_LABEL (dias)`, `SECONDARY.TICKET_LABEL (R$)`, `SECONDARY.CANAL_LABEL`
   - `CHART_TITLE`
5. Espelhar em `en.json` (D5: PT é primário, EN não é bloqueado).
6. Adicionar `SIDEBAR.RELATORIOS_COMERCIAIS_VISAO` em pt_BR override = "Visão Comercial" + mirror EN.
7. **Spec mínima:** `m6-1-a-foundation.spec.js` (28 testes): flag no registry, i18n keys resolvem em PT e EN, guard PT≠EN pra 7 chaves críticas.

**Não-objetivo:** componente real, sidebar entry, mock, redirect condicional (todos em M6.1-b/c).

**LOC estimate:** ~130 (original ~80 + Ruby mirror ~30 + stub rota ~10 + spec fixes ~10).

**Critério de aceite:** CI verde. i18n keys carregam. Cut-flag aparece em `useAlgorythmoCutFlags`. Ruby concern retorna `reports_commercial` em `all_algorythmo_cut_flags`.

---

### M6.1-b — Sidebar entry + rota nova (placeholder vazio)

**Objetivo:** entry visível na sidebar, rota navegável, mas componente é placeholder de 1 linha. Valida wiring antes do conteúdo real.

**Escopo:**
1. **`app/javascript/dashboard/modules/algorythmo/admin/reports-commercial/`** novo:
   - `ReportsCommercialOverlay.vue` — componente esqueleto com `<p>Visão Comercial — placeholder</p>` apenas. (Conteúdo real entra em M6.1-c.)
2. **`reports.routes.js`** (`// algorythmo:` marcado):
   - Importar `ReportsCommercialOverlay` (lazy via `defineAsyncComponent`).
   - Adicionar route filha PRIMEIRA:
     ```js
     {
       path: 'commercial',
       name: 'commercial_reports',
       meta: { permissions: ['administrator', 'report_manage'],
               algorythmoCutFlag: 'algorythmo_cut_reports_commercial' /* inverso: hide-when-cut, padrão do projeto */ },
       component: ReportsCommercialOverlay,
     }
     ```
   - **Trocar `path: ''` redirect**:
     ```js
     // algorythmo: default to commercial overlay for admins;
     // upstream behavior (account_overview_reports) preserved as 1-click below.
     path: '',
     redirect: to => {
       const isCut = useStore().getters['algorythmoCutFlags/isCut']('reports_commercial');
       const targetName = isCut ? 'account_overview_reports' : 'commercial_reports';
       return { name: targetName, params: to.params };
     }
     ```
3. **`Sidebar.vue:561-597`** (`// algorythmo:` marcado): inserir como PRIMEIRA filha de Reports:
   ```js
   ...(algorythmoCutHidden.value.reports_commercial
     ? []
     : [{
         name: 'Commercial Reports',
         label: t('SIDEBAR.RELATORIOS_COMERCIAIS_VISAO'),
         to: accountScopedRoute('commercial_reports'),
       }]),
   ```
4. **Spec mínima:**
   - Component test: `ReportsCommercialOverlay.vue` monta sem erro.
   - Routes spec: navegação direta a `/accounts/1/reports` redireciona pra `/accounts/1/reports/commercial` quando cut-flag está OFF.
   - Routes spec: com cut-flag ON, redireciona pra `/accounts/1/reports/overview` (preserva comportamento upstream).

**Não-objetivo:** conteúdo do dashboard, mock real, agente chat.

**LOC estimate:** ~150.

**Critério de aceite:**
- Sidebar mostra "Visão Comercial" como primeira filha de Reports.
- Default de `/accounts/:id/reports` cai em `/reports/commercial`.
- Toggle cut-flag preserva fallback upstream.
- Spec verde.

---

### M6.1-c — Mock realista + composição final do overlay

**Objetivo:** entregar a tela como o founder vai mostrar pra cliente. Conteúdo real, watermark, agente placeholder, layout magazine completo.

**Pré-requisito de input:** D8 e D11 confirmadas pelo founder. Se não confirmadas, o engineer **NÃO começa** este PR — volta pro planner.

**Escopo:**
1. **`mocks/sectors/commercial.js`** novo, seguindo typedef em `contract.js`:
   - Valores plausíveis pra PME brasileira de varejo/distribuição (R$ 500K-5M faturamento anual):

   | KPI | Valor proposto | Delta |
   |---|---|---|
   | **Anchor 1 — Receita fechada (30d)** | R$ 184.720 | ▲ R$ 12.400 (+7,2%) |
   | **Anchor 2 — Conversão lead→fechado** | 18,4% | ▲ 1,1pp |
   | Secondary — Leads novos (30d) | 412 | ▲ 38 |
   | Secondary — Ciclo médio | 11,2 dias | ▼ 0,8 dia |
   | Secondary — Ticket médio | R$ 484,90 | ▲ R$ 28,30 |
   | Secondary — Canal top1 | WhatsApp · 48% | ▲ 3pp |

   - Chart de Receita fechada por semana, 12 semanas:
     - Labels: `S1` ... `S12`
     - Data (R$ mil): `[38, 42, 45, 41, 48, 52, 49, 54, 51, 56, 58, 62]`
     - Tendência: crescimento gradual com volatilidade plausível (38→62, +63% trimestre — agressivo mas crível pra PME em rampa). Designer pode ajustar magnitude se quiser amaciar.
2. **`ReportsCommercialOverlay.vue`** ganha composição real:
   ```vue
   <script setup>
   import SectorDashboard from '../sectors/SectorDashboard.vue';
   import SectorAgentChat from '../sectors/SectorAgentChat.vue';
   import commercialMock from '../mocks/sectors/commercial';
   </script>
   <template>
     <main class="alg-sector-layout">
       <SectorDashboard :mock="commercialMock" />
       <SectorAgentChat :sector-name-key="commercialMock.headingKey" />
     </main>
   </template>
   <style scoped lang="scss">
   .alg-sector-layout { display:flex; flex-direction:row; flex:1; min-height:0; width:100%; overflow:hidden; }
   </style>
   ```
   (Cópia 1:1 do padrão `MarketingDashboard.vue`.)
3. **Spec:**
   - Snapshot test do overlay com mock injetado.
   - Asserts: watermark visível, 2 anchor cards renderizados, 4 secondary cards renderizados, chart container existe, agente panel existe.

**Não-objetivo:** drill-down, date-picker, dado real.

**LOC estimate:** ~100 (mock + 25-linha de Vue + spec).

**Critério de aceite:**
- Tela renderiza idêntica ao M6.0 Operação em forma (designer-locked).
- Watermark "DADOS DE DEMONSTRAÇÃO" visível.
- Painel chat 360px à direita com "Visão Comercial · agente" e empty state.
- Spec verde.

---

### M6.1-d — QA pass + ajustes pós-demo

**Objetivo:** rodar `/qa-only` no browser real, varrer regressões, ajustar microcopy e magnitude do mock se necessário.

**Escopo:**
1. **`/qa-only`** em browser real:
   - Login como admin@account-1.
   - Caminho 1: clique em "Relatórios Comerciais" na sidebar → cai em Visão Comercial.
   - Caminho 2: clique em "Operacional" filha → tela Chatwoot upstream intacta.
   - Caminho 3: toggle cut-flag `reports_commercial` em devtools → default volta pra `account_overview_reports`.
   - Caminho 4: troca locale pra `en` → assert: keys têm fallback decente (ou aceitar PT-only no v0 e marcar follow-up).
2. **`/design-review`**: designer verifica vertical rhythm, watermark posição, spacing dos cards, hover states.
3. Ajustes pequenos identificados (microcopy / magnitude de mock / spacing) entram nesse PR.

**Não-objetivo:** novas features.

**LOC estimate:** ~30-60 (ajustes cosméticos).

**Critério de aceite:**
- 4 caminhos QA passam.
- Designer aprova.
- Founder valida em demo interna antes do `/ship`.

---

## 7. Sequência e paralelismo

```
M6.1-a (cut-flag + i18n) ─ sequential
   ↓ MERGE
M6.1-b (sidebar + rota placeholder) ─ sequential (depende de cut-flag existir)
   ↓ MERGE
   ↓ [Founder confirma D8 + D11 antes deste ponto]
M6.1-c (mock + composição) ─ sequential (depende de rota existir)
   ↓ MERGE
M6.1-d (QA + polish) ─ sequential
   ↓ /review + /cso + /ship
```

**Por que tudo sequencial:** cada milestone toca `reports.routes.js` OU `Sidebar.vue` OU compartilha state com o anterior. Tentar paralelizar gera conflict de merge garantido. Custo de sequência ≈ 1 dia extra; valor de evitar conflict = preserva worktree limpo.

**Conflict matrix:**
| Par | Paralelo? | Razão |
|---|---|---|
| M6.1-a ↔ M6.1-b | NO | M6.1-b consome flag criada em M6.1-a |
| M6.1-b ↔ M6.1-c | NO | M6.1-c preenche componente criado vazio em M6.1-b |
| M6.1-c ↔ M6.1-d | NO | M6.1-d testa o que -c entregou |
| Qualquer M6.1-* ↔ trabalho fora | YES | Outros worktrees em arquivos disjoint (Brain, CRM, C-Levels) podem rodar em paralelo |

---

## 8. Edge cases (eng-review interno)

| # | Caso | Tratamento |
|---|---|---|
| 1 | **Admin com cut-flag `reports_commercial` ligada** abre `/reports` direto | Redirect default cai em `account_overview_reports` (comportamento upstream). Sidebar não mostra "Visão Comercial". Spec coberto em M6.1-b. |
| 2 | **Agente humano (não admin)** abre `/reports` | `meta.permissions: ['administrator', 'report_manage']` continua valendo. Agente com `report_manage` cai em `commercial_reports` (se não cut), o que é OK porque o overlay é só visual e read-only. |
| 3 | **Deep link** `/reports/conversation` salvo nos favoritos do user | Rota nomeada inalterada. Continua resolvendo igual. Risco zero. |
| 4 | **Cut-flag toggle em runtime** (devtools, plugin) | Redirect é avaliado a cada navegação (`redirect: to => …`). Toggle reflete imediato na próxima navegação. Spec em M6.1-d. |
| 5 | **i18n key faltando** (regression) | `vue-i18n` mostra a key crua. UX feio, não quebra. Mitigação: spec em M6.1-a assert que keys resolvem. |
| 6 | **Chart chunk async fail** (CSP, network blip) | Já tratado em `SectorDashboard.vue:21-44` com `ChartLoading` + `ChartError` fallback. Zero novo trabalho. |
| 7 | **Mobile width** (< 768px) | M6.0 não foi testado em mobile (admin é desktop-first). Documentar como follow-up no risco 5 abaixo. **Não bloquear M6.1.** |
| 8 | **Reports menu collapsed na sidebar** | Sidebar `Reports` parent já é dropdown nativo. "Visão Comercial" aparece quando expandido. Sem trabalho extra. |
| 9 | **Account sem dados reais** (cliente novo) | Mock é hardcoded — sempre renderiza. Cliente novo vê números mockados. Watermark "DADOS DE DEMONSTRAÇÃO" honesta sobre isso. |
| 10 | **Hover/click em KPI ou chart** | No-op visual no v0 (D9, office-hours Q8). Pointer cursor default. Sem affordance enganosa. |

---

## 9. Design review interno (planner doing designer's eye)

> **Status:** review consolidado pelo planner. Designer agent pode reabrir em `/plan-design-review` se quiser fechar pontos finos. **Bar:** dark-first, Apple/Linear/Stripe. Se parece template, reprovou.

**Verdict:** APROVADO com 2 ressalvas marcadas.

| # | Crítica | Veredito |
|---|---|---|
| 1 | **Reusar `SectorDashboard` 1:1 é o caminho certo.** Designer já trancou shell em M6.0; qualquer fork desestabilizaria a linguagem visual de 7 setores entregues. | Trancado. |
| 2 | **Label "Visão Comercial"** ou "Comercial" só? | Trancado em **"Visão Comercial"**. Razão: a sidebar tem o pai "Relatórios Comerciais" e a filha precisa diferenciar — "Visão" comunica "panorama high-level"; "Comercial" sozinho seria redundante com o pai. |
| 3 | **Watermark "DADOS DE DEMONSTRAÇÃO"** em tela que o founder vai usar pra fechar venda é ousado. Não ofusca? | Mantido. Designer reviewer (M6 anterior) já trancou posição/opacidade discreta. Watermark é **honestidade radical** — vendendo a forma sem mentir sobre o conteúdo. Linear faz isso em demos. |
| 4 | **Painel direito `SectorAgentChat` 360px** numa tela default da Reports vai estranhar o user Chatwoot legado? | Aceitável. O painel é a marca visual do Algorythmo dentro de cada setor — consistência com 7 setores entregues vale mais do que conforto do user upstream. |
| 5 | **Magnitude do mock** (R$ 184K em 30d, 18,4% conversão) parece "feel sintético" demais? | RESSALVA. Designer deve ajustar números na fase M6.1-c se ressoar como "round demais". Sugestão: trocar `184.720` → `186.430` etc. Trivial em PR. |
| 6 | **Chart Receita por semana** — área (atual de Operação) ou pizza? | Trancado em **área** (line chart). Pizza só onde share é a história (Marketing channels). Receita ao longo do tempo é temporal, não compositional. |
| 7 | **Tabs nativas Chatwoot logo abaixo do header** vão parecer "duas barras"? | RESSALVA. Investigar em M6.1-d (QA visual). Mitigação se feio: o `ReportsWrapper` não desenha tabs; as abas são puro item de sidebar. Logo não há "duas barras" — a sidebar filha já mostra as abas. Risco resolvido por design da arquitetura. |
| 8 | **Hierarquia** — tela tem 2 anchor + 4 secondary + chart + agente. Cabe sem scroll? | Em viewport 1440x900 com sidebar aberta, `SectorDashboard` mais agente cabe (M6.0 já provado). Em laptop 1280x800, scroll vertical aparece — aceitável (M6.0 idem). |

---

## 10. Eng review interno (planner doing eng manager mode)

> **Status:** review consolidado pelo planner. Eng manager agent pode reabrir em `/plan-eng-review` se quiser stress test.

**Verdict:** APROVADO. Nada bloqueante.

| # | Crítica | Veredito |
|---|---|---|
| 1 | **Mudar o redirect default de `/reports`** é tocar comportamento upstream — risco de quebrar usuário Chatwoot puro. | Mitigado: cut-flag `reports_commercial` permite voltar comportamento anterior sem deploy. Spec em M6.1-b cobre os dois caminhos. |
| 2 | **Permissions `report_manage`** — agente com `report_manage` mas sem `administrator` pode cair em Visão Comercial? | Sim, e tudo bem — overlay é read-only de mock. Sem leak de dado. Documentar no PR description. |
| 3 | **Lazy import** de `ReportsCommercialOverlay` via `defineAsyncComponent`? | Sim. Padrão já estabelecido em M6.0 (`SectorDashboard.vue:38-51`). Reuso direto. |
| 4 | **Cut-flag mirror server-side** (`algorythmo_cut_*` registry) — adicionar `reports_commercial` lá quebra Ruby? | RESSALVA. Mirror server pode ou não existir pra cut-flags adicionais. Engineer verifica em M6.1-a; se mirror existir e exigir Ruby, marca `BACKEND_DEPS` e segue com client-only flag. Plan original (0005) tem precedente disso (`algorythmo_marketplace` foi `BACKEND_DEPS`). |
| 5 | **Mock comercial** deve viver em `mocks/sectors/commercial.js` ao lado dos outros 6 (`operacao`, `marketing`, etc.) — mesmo padrão. Ou em pasta separada porque é "tipo diferente" (overlay vs setor)? | Mesma pasta. Razão: contract.js define o shape; `commercial` é um SectorMock como qualquer outro. Pasta separada introduziria divergência sem ganho. |
| 6 | **Naming da rota** `commercial_reports` vs `reports_commercial_overview` vs `commercial_overview`? | `commercial_reports` — consistente com sufixo `_reports` das outras (`agent_reports`, `inbox_reports`, `bot_reports`, `sla_reports`, etc.). |
| 7 | **Pasta do módulo** — `modules/algorythmo/admin/reports-commercial/` (kebab) ou `reportsCommercial/` (camel) ou `commercial/`? | `reports-commercial/` — kebab é o padrão do projeto (ver `c-levels/`). Razão: o overlay vive sob a guarda-chuva "Reports"; o nome reflete isso. |
| 8 | **Spec test runner** — Vitest? Jest? | Vitest (já no GStack default + provavelmente no Chatwoot). Engineer confirma no PR de M6.1-a com snapshot mínimo. |
| 9 | **Watermark string** já existe em pt_BR override (`ALGORYTHMO_ADMIN.SECTORS.WATERMARK`)? | Sim — `SectorDashboard.vue:98` referencia. Reuso direto. Nada novo. |
| 10 | **Bundle weight** — overlay adiciona ~ quanto KB? | Mock é puro JS plain (~2KB). Componente novo é shell de 25 linhas (~1KB). Chart components já são async e compartilhados com 6 setores. Total < 5KB. Insignificante. |

---

## 11. Risk register

Ranked, highest first.

1. **Redirect default mudado afeta usuário Chatwoot puro** — admin que tinha bookmark de `/reports` (sem aba) e contava com landing em Overview agora cai em Visão Comercial. Mitigação: cut-flag `reports_commercial` reversível por cliente. Comunicar em release note.
2. **Mock vira source-of-truth em demo de venda** — herança do risco 4 de plano 0005. Mitigação: watermark "DADOS DE DEMONSTRAÇÃO" em cada card (M6.0 design pattern). Honestidade radical.
3. **D8 (KPIs) e D11 (divisão mkt↔comercial) pendentes do founder** — se engineer começar M6.1-c sem confirmação e founder discordar, retrabalho de 1 dia. Mitigação: M6.1-c **bloqueado** até confirmação explícita. Documentado no critério de aceite.
4. **Cut-flag server mirror não existe / requer Ruby** — adicionar `reports_commercial` em registry server exige toque backend. Mitigação: marcar `BACKEND_DEPS` se mirror exigir; flag client-side suficiente pro MVP.
5. **Mobile não testado** — admin é desktop-first, mas se cliente PME abrir do celular, layout 360px agente quebra. Mitigação: follow-up consciente. NÃO bloquear M6.1. Documentar em handoff.
6. **`Sidebar.vue` é ponto único de contenção** — qualquer outro trabalho que toque sidebar conflita com M6.1-b. Mitigação: M6.1-b ship rápido (1 dia), libera contenção.
7. **Magnitude do mock parece sintético** — número muito redondo (R$ 184.720) sente fake. Mitigação: designer ajusta em M6.1-c ou M6.1-d. Trivial.
8. **Permissions `report_manage`** — agente humano cai em overlay. Aceitável (read-only mock). Sem mitigação.
9. **Locale `en` sem tradução** — admin que troca pra inglês vê keys cruas. Mitigação: aceitar PT-only no v0; criar issue "i18n EN passes" como follow-up explícito. Memory `feedback_communication_style.md` deixa claro que PME é PT-BR-first.
10. **Esquecimento de `// algorythmo:` marker** em `reports.routes.js` quebra sync mensal com upstream. Mitigação: review checklist; `/review` agent pega.

---

## 12. Critério de pronto do plano

✓ Office-hours rodadas (6 perguntas + 2 extras). ✓ D7-D13 decisões propostas. ✓ Design review interno feito. ✓ Eng review interno feito. ✓ Edge cases enumerados. ✓ Risk register ranked.

**Para virar APPROVED:**
- [ ] Founder carimba D8 (KPIs canônicos).
- [ ] Founder carimba D11 (divisão Marketing↔Comercial).
- [ ] Designer agent `/plan-design-review` opcional (planner já fez pass interno).
- [ ] Eng manager agent `/plan-eng-review` opcional (planner já fez pass interno).

Quando os 4 itens fecharem, status muda pra APPROVED e engineer agent dispara M6.1-a.

---

## 13. Linhagem

- Plano 0005 (M5-M9): sidebar restructure, rename "Reports" → "Relatórios Comerciais", `SectorDashboard` + `SectorAgentChat` designer-locked.
- Decisões D1-D6 (memory `project_admin_os_frontend_d1_d6.md`): role gate, mock realista, read-only admin.
- Office-hours 2026-05-27 (`docs/algorythmo/M6-1-reports-overlay/office-hours.md`): D7-D13 trancadas.
- Memory `feedback_architecture_defer_upstream.md`: reusar `SectorDashboard` 1:1, não inventar variante.
- Memory `project_algorythmo_os_product_vision.md`: vocabulário comercial canonicalizado (nome / canal / tempo-na-etapa).
- Memory `project_brain_m3.md`: dogfooding Algorythmo Day-1 (founder é N=1 da observação inicial).
