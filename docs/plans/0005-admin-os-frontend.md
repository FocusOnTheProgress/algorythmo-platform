# Plano 0005 — Algorythmo OS: Tela do Administrador (frontend-only)

**Status:** APPROVED — `/plan-design-review` + `/plan-eng-review` rodaram em 2026-05-27, correções incorporadas, 2 inputs do founder fechados (números de Operação + glifo C-Level opção A). Pronto pra disparar M5.
**Data:** 2026-05-27 (review)
**Owner:** Gustavo (founder/CEO Algorythmo)
**Linhagem:** consolida ADRs 0001-0011 + plano 0001 (MVP) já trancado. Sucede M0-M4 (já mergeados).
**Escopo:** **frontend somente.** Backend dos novos blocos vira plano dedicado depois que UI estabilizar e mocks estiverem trancados.

> **Por que esse plano existe:** Algorythmo OS é um sistema operacional empresarial modular baseado em permissões, onde diferentes usuários acessam diferentes camadas da operação dentro do mesmo ecossistema enquanto agentes de IA atuam sobre os processos. Este plano materializa a **tela do administrador da empresa** (role `Administrator` do Chatwoot, reaproveitada — ver D2) com 4 grandes blocos de navegação: operacional / Gestão / Estratégia / Inteligência. Frontend-only por enquanto pra o founder validar a forma do produto antes de gastar backend.

---

## 1. Visão da entrega

Quando o administrador da empresa loga em Algorythmo OS, ele vê:

- **Topo (operacional):** CRM, Contacts, Conversations (visualização read-only).
- **GESTÃO:** Relatórios Comerciais, Operação, Compras, Administração, Financeiro, RH, Marketing — cada uma com dashboards de métricas (mock realista no frontend-only) + chat com agente do setor (UI placeholder).
- **ESTRATÉGIA:** C-Levels — placeholder visual com aviso "Em construção" no centro da tela.
- **INTELIGÊNCIA:** Brain (aquário + upload de documentos), Marketplace (placeholder na sidebar).

UI inteira em **português como default** (seletor de idioma mantido). Reports rebatizado pra "Relatórios Comerciais", aba "Bot" sumida (já cut-flagged), Campaigns movida pra dentro do setor Marketing.

**Critério de pronto do plano:** founder consegue navegar a sidebar inteira, abrir cada setor, ver dashboards com dados realistas mockados, abrir chat dummy com agente de cada setor, abrir aquário do Brain, fazer upload simulado de documento. Tudo sem chamar backend novo.

---

## 2. Decisões trancadas (sessão 2026-05-27)

| ID | Decisão | Impacto |
|---|---|---|
| **D1** | **Brain aparece em UM lugar só — Inteligência.** | Entry de Brain existe HOJE em `Sidebar.vue:462-472` no topo da sidebar. M5 **move** o entry pra dentro do bloco INTELIGÊNCIA (não adiciona um novo — risco de duplo-render). Razão: evita duplicação de entry point e reforça Brain como camada de conhecimento. |
| **D2** | **Reusar role `Administrator` do Chatwoot.** | Não criamos role novo "Owner/CEO". A experiência do `Administrator` é reescrita pra ser a tela do dono PME. Custo: agente humano com role `Administrator` no Chatwoot upstream passa a ver esta tela — sem problema pra o MVP (cada cliente PME tem 1-2 admins, todos donos). Razão: 4 níveis de permissão sem ganho real. |
| **D3** | **Métricas setoriais com mock realista.** | Cada dashboard de setor (Operação, Compras, Admin, Fin, RH, Mkt) renderiza gráficos com dados fixos no frontend que parecem reais (não "lorem ipsum visual"). Razão: tela vazia mata demonstração; mock realista vende a visão do produto. Backend conecta depois de UI trancada. |
| **D4** | **Conversations read-only pro admin.** | `ReplyBox` (composer) escondido quando `useAdmin().isAdmin` é true. Admin observa em tempo real mas nunca responde. Canal único do admin com o time é a Inbox interna (não tocada neste plano). |
| **D5** | **Português default, seletor mantido.** | Locale padrão troca de `en` → `pt_BR` (lib/i18n setup). Seletor de idioma em `routes/dashboard/settings/account/Index.vue` permanece. Razão: cliente PME brasileiro abre em português sem clicar nada; cliente raro que precisa de inglês não é bloqueado. |
| **D6** | **C-Level no MVP = placeholder.** | Item "C-Levels" entra na sidebar (bloco ESTRATÉGIA) mas a tela é um placeholder centralizado "Mesa Executiva — em construção". UX completa (mesa executiva com agentes deliberando, CEO dirigindo) entra em `/office-hours` dedicado pós-deploy. |

---

## 3. Restrições operacionais

- **Frontend somente.** Nada de migration, controller novo, job, service. Se aparecer necessidade de backend mid-plano, marca `BACKEND_DEPS` e segue com mock.
- **Reusar superfícies existentes do Chatwoot** sempre que possível (sidebar, roles, reports, campaigns, contacts, i18n, composer). Toda mudança em arquivo upstream marcada inline `// algorythmo:` (A2-front).
- **Sistema de flags `algorythmo_cut_*` + `algorythmo_*`** continua sendo o mecanismo único de gate (Q2).
- **Sync mensal com upstream** continua ativo — escolhas conservadoras em arquivos upstream.

---

## 4. Mapa de superfícies existentes (do `/explore` 2026-05-27)

Referência rápida pra os reviewers — todos os arquivos que vamos tocar/reusar:

| Superfície | Arquivo:linha | Estado |
|---|---|---|
| Sidebar principal | `Sidebar.vue:327-916` | Existe. `menuItems` computed dirige tudo. Sem section headers nativos — vamos adicionar. |
| Composable de role | `useAdmin.js:1-17` | Existe. `isAdmin` boolean pronto pra v-if. |
| Cut flags registry | `algorythmoCutFlags.js:9-23` | Existe. Adicionar novas conforme necessário. |
| Reports route | `reports.routes.js:127-178` | Existe. Bot tab já cut-flagged `algorythmo_cut_reports_bot`. |
| Campaigns route | `campaigns.routes.js:19-73` | Existe + cut-flag `algorythmo_cut_campaigns`. Vamos manter rota, só mudar entry da sidebar. |
| Contacts | `ContactsIndex.vue` + `BulkActionsAPI.js` | CSV import **EXISTE nativamente** em `components-next/Contacts/ContactsForm/ContactImportDialog.vue`. Reusar — não construir. (Correção do eng-review 2026-05-27.) |
| i18n setup | `i18n/index.js:1-93` | Existe com deep-merge Algorythmo overrides. 47 arquivos pt_BR já presentes. |
| Locale selector | `settings/account/Index.vue:44,71-76` | Existe. Default `locale: 'en'` no form — trocar pra `pt_BR`. |
| ReplyBox composer | `ReplyBox.vue:1-100+` | Existe. Sem role-gate hoje. Adicionar `v-if="!isAdmin"`. |
| CRM Kanban (M1) | `crm/views/KanbanBoard.vue` + `crm.routes.js` | Existe. Sidebar entry já presente. Não tocar. |
| Brain (M3) | `modules/algorythmo/brain/BrainViewer.vue` + `algorythmo/brain.routes.js` | Existe. Entry de sidebar **existe** em `Sidebar.vue:462-472` (gated `algorythmo_brain`). M5 **move** esse entry pra INTELIGÊNCIA. |

---

## 5. Milestones

### M5 — Foundation (sidebar + i18n default)

**Objetivo:** Estrutura da sidebar trancada + Português como default. Tudo daqui pra frente encosta nessa fundação.

**Escopo:**
1. **Locale default — JS-side fallback chain.** `entrypoints/dashboard.js:38` (bootstrap `createI18n`) + `App.vue:85` (`window.chatwootConfig.selectedLocale`) ganham fallback `|| 'pt_BR'`. `settings/account/Index.vue:44` muda de `'en'` pra `'pt_BR'` (cosmético). Mudança canonical do Ruby `chatwootConfig.selectedLocale` fica marcada **`BACKEND_DEPS`** — vira PR separado quando founder autorizar toque no backend.
2. **Sidebar — 4 blocos via discriminator `type: 'section'` no `menuItems`.** (Não wrapper component — quebraria upstream merges.) Renderer aprende a emitir `<SidebarSectionHeader>` quando vê `type:'section'`. Estrutura final:
   - Bloco operacional (sem header, topo): CRM, Contacts, Conversations.
   - **Header "GESTÃO"** → Relatórios Comerciais (rename de Reports), Operação, Compras, Administração, Financeiro, RH, Marketing (Campaigns vira filha de Marketing).
   - **Header "ESTRATÉGIA"** → C-Levels.
   - **Header "INTELIGÊNCIA"** → Brain (entry **movido** de `Sidebar.vue:462-472`), Marketplace.
3. **`SidebarSectionHeader.vue` — spec trancada no design-review:**
   - `font-family: InterDisplay` (já no tailwind)
   - `font-size: 10px` / `font-weight: 560` / `letter-spacing: 0.08em` / `text-transform: uppercase`
   - `color: rgb(var(--slate-9) / 0.55)`
   - `padding: 16px 12px 6px` (primeiro header colapsa top → `8px`)
   - **Sem divider line.** Whitespace É o divider.
   - Precedente: Linear sidebar + reusa tokens já presentes em `BrainViewer.vue:395-402` (`alg-brain-timeline__heading`).
4. **Rename Reports:** override `SIDEBAR.REPORTS` → "Relatórios Comerciais" **apenas em `engines/algorythmo/.../overrides/pt_BR.json`** (deep-merge), preservando upstream locale files intactos.
5. **Bot tab:** já cut-flagged `algorythmo_cut_reports_bot`. M5 PR adiciona spec que assert: admin@account-1 tem flag enabled-cut (lendo a seed rake task `engines/algorythmo/lib/tasks/algorythmo/seed.rake`).
6. **Routes placeholder:** Operação, Compras, Administração, Financeiro, RH, Marketing, C-Levels, Marketplace. Views vazias "Em construção" estilizadas no padrão de M7 (ver §M7 abaixo).

**Não-objetivo M5:** conteúdo dos dashboards (M6). Tela do C-Level formal (M7). Aquário (M8). **Toque canonical no Ruby para `selectedLocale`** — `BACKEND_DEPS`.

**Reusa do Chatwoot:** `Sidebar.vue` (extensão por type-discriminator), sistema de feature flags, i18n deep-merge, tokens do `BrainViewer.vue`.

**Estimativa de PRs:** se total ≤ 600 LOC, 1 PR. Acima disso, **split:** PR-5a (i18n fallback) + PR-5b (sidebar restructure + placeholders + rename).

---

### M6 — Dashboards setoriais (Gestão) com mock realista

**Objetivo:** Cada um dos 7 itens de GESTÃO renderiza um dashboard com gráficos plausíveis + chat com agente do setor. Vendedor abre, mostra pro PME, PME entende o produto.

**M6.0 — Operação como setor canônico (PR de referência).** Sem isso, os outros 6 viram 7 dashboards em 7 estilos. Ordem: M6 base → **M6.0 Operação trancado pelo designer** → M6.1-6.6 derivações.

**Escopo do M6 base (split em 2 PRs):**

**PR-6a — Charts foundation:** adicionar `PieChart.vue` + `LineChart.vue` em `app/javascript/shared/components/charts/` reusando `chart.js@~4.4.4` + `vue-chartjs@5.3.1` (JÁ presentes em `package.json:66,104`). Registrar `ArcElement`/`PointElement`/`LineElement`. **NÃO tocar no BarChart upstream.**

**PR-6b — Skeleton + mock contract:**
- `SectorDashboard.vue` — layout magazine, **não grid uniforme**:
  - Header com nome do setor + 1 linha de contexto.
  - **2 anchor KPIs grandes** (50/50) topo: número anchor em InterDisplay 32px / weight 460 / `font-variant-numeric: tabular-nums` + label slate-10. Delta como texto + glifo ▲/▼ slate-11 (**sem chip colorido** — semantic color reservado pra alertas reais).
  - **4 KPIs secundários** (grid 4-col) abaixo.
  - **1 chart full-width** (área ou linha — pizza só onde share de categoria É a história, ex.: Marketing channels). **Rejeitar pizza em 4 dos 7 setores.**
  - Watermark "DADOS DE DEMONSTRAÇÃO" em todo card até backend conectar (mitigação de risco — mocks viram source-of-truth em demo).
- `SectorAgentChat.vue` — **componente distinto do `ReplyBox`** (não reusar). 360px painel direito sticky:
  - Avatar com monograma geométrico (não foto). Nome "Operação · agente". Status dot slate-9 "offline" lowercase.
  - Bolhas do agente com **borda 1px slate-7** (não fill) — inverte contrato visual de Chatwoot pra sinalizar voz de máquina.
  - Input com hint chip `cmd+enter` à direita.
  - Empty state: "Em breve este agente vai operar com dados reais da sua empresa."
- Async-import dos chart components per route (padrão `defineAsyncComponent` já no codebase) — controle de bundle weight.
- Mock contract em `app/javascript/dashboard/modules/algorythmo/admin/mocks/sectors/*.js` (plain JS, **não i18n**).

**Setor por setor (PRs M6.0-M6.6):**
- **M6.0 Operação (canônico)** — estoque, reposição, logística, expedição. KPIs definidos pelo founder. Designer fecha visual antes dos próximos.
- **M6.1 Relatórios Comerciais** — Overview ganha 2 anchor + 4 secondary + 1 area chart + chat agente comercial. Tabs nativas Conversations/Agents/Labels/Inbox/Team/CSAT/SLA permanecem. Bot escondida (cut-flag já existe).
- **M6.2 Compras** — fornecedores, reposição, custo de mercadoria, giro.
- **M6.3 Administração** — estratégia, metas, indicadores, decisão, expansão.
- **M6.4 Financeiro** — contas a pagar, contas a receber, fluxo de caixa, margem, lucro, planejamento.
- **M6.5 RH** — contratação, treinamento, cultura, produtividade, organização interna.
- **M6.6 Marketing** — branding, campanhas, redes sociais, tráfego, retenção. **Campanhas do Chatwoot vira sub-item.**

**Não-objetivo M6:** integração real (ERP, Brain) → plano backend futuro. LLM agente setorial.

**Estimativa de PRs honesta:** PR-6a (charts) + PR-6b (skeleton) + 7 setores = **9 PRs total**. Práticos batched: ~5-6 PRs. Plan estimate original (4) era otimista.

---

### M7 — Estratégia (C-Levels placeholder)

**Objetivo:** Entry point da Estratégia visível + tela em construção **atmosférica** (D6, refinada no design-review).

**Escopo:**
1. Rota `/accounts/:accountId/c-levels` → componente `CLevelsPlaceholder.vue`.
2. Tela atmosférica (spec do design-review):
   - **Glifo SVG custom** centralizado a ~64px (não Lucide — `users` icon é template-death). Founder escolhe direção: (a) marca geométrica abstrata (mesa horizontal com 4 pontos representando executivos) ou (b) monograma tipográfico "CL".
   - **Hairline radial gradient** atrás do glifo: slate-1 → transparent, max 8% alpha.
   - **Título em Georgia** (mantém continuidade com BrainViewer): "Mesa Executiva".
   - **Body**: 1 parágrafo, max 60ch, slate-10. "Em construção — sessão de design dedicada virá em breve."
   - **Uma sutileza de movimento**: glifo faz fade-in no mount (300ms ease-out + 8px translateY). **Nenhum looping** — looping em placeholder = tique nervoso, não antecipação.
   - **Sem Lottie, sem animação contínua.**
3. Sidebar entry "C-Levels" no bloco ESTRATÉGIA (já adicionado em M5).

**Não-objetivo M7:** UX da mesa executiva — entra em `/office-hours` dedicado depois.

**Estimativa de PRs:** 1 PR pequeno.

---

### M8 — Inteligência (split em 3 PRs por superfície)

**Objetivo:** três superfícies distintas com concerns diferentes — split obrigatório.

**M8a — Brain Aquário (extensão do `BrainViewer.vue`):**
   - Tab existente "Viewer" vira "Aquário".
   - **Metáfora trancada:** "aquário" = **transparência + profundidade organizada**, não água literal. Tradução visual:
     - **Densidade em camadas:** foreground (cards anchor) denso; background com gridded slate-2↔slate-1 gradient a ~3% opacidade sugerindo volume.
     - **Estrutura de colunas verticais** tipo vitrine de museu: cada categoria é coluna header (uppercase pequeno, mesmo token do SidebarSectionHeader); cards são "specimens" abaixo.
     - **Hairline vertical slate-7** entre colunas em baixa opacidade — feels arquival, não dashboard.
     - **Sem animação no load.** Aquários são imóveis.
     - **Dados como sentenças reais**, não chips: "Lead Maria movida pra Qualificado por João às 14:32". Sentenças = densidade legível.
   - **Hierarquia por importância** (não grid uniforme): 2 anchor cards no topo (Conversas processadas + Fatos da empresa) em 50/50; 4 cards secundários abaixo em 4-col (leads, ajustes, documentos, etc.).
   - Reusa tokens já presentes em `BrainViewer.vue:395-402`.

**M8b — Brain Document Upload (componente novo):**
   - `BrainDocumentUpload.vue` — zona de drop com tratamento Linear-style:
     - **Dashed 1px slate-7 border** (sem gradient, sem cloud icon, sem ilustração).
     - **Microcopy única:** "Arraste documentos da sua empresa aqui — políticas, manuais, regras, design system."
     - **Lista de arquivos abaixo:** 32px de altura por linha, font-size monospace, tipo de arquivo como tiny chip slate-9. **Sem icon-per-filetype.**
   - Frontend-only: upload simulado, doc fica no estado local da página, sem POST.
   - Categorias como filtros de chip no topo (políticas, manuais, regras, design system, outros), não como abas.

**M8c — Marketplace placeholder:**
   - Rota `/accounts/:accountId/marketplace` → `MarketplacePlaceholder.vue`.
   - Grid mockado de "agentes disponíveis em breve" — cards uniformes (Marketplace é o ÚNICO lugar onde uniformidade é OK, porque comunica catálogo).
   - **Flag strategy:** Marketplace é additive, não cut. Usar padrão `algorythmo_brain` / `algorythmo_crm` (default visible pro admin). Adicionar flag `algorythmo_marketplace` na posição 17 de `FeatureFlagBits` fica **`BACKEND_DEPS`** — frontend-only: hardcode visível, plug flag depois.

**Não-objetivo M8:** ingestion real de docs, embedding, busca semântica.

**Estimativa de PRs:** **3 PRs** (M8a, M8b, M8c). Plan original (2) era otimista.

---

### M9 — Admin Read-Only Mode + acabamentos

**Renomeado de "Touch-ups" no design-review** — Conversations read-only é decisão visual importante demais pra ficar como touch-up.

**Objetivo:** gates de role do admin + tradução + microcopy de contatos.

**Escopo:**
1. **Conversations read-only — spec do design-review:**
   - `ReplyBox.vue` (Options API, `app/javascript/dashboard/components/widgets/conversation/ReplyBox.vue`) ganha `mapGetters({ currentRole: 'getCurrentRole' })` + computed `isAdmin` + `v-if="!isAdmin"`. Diff menor que adicionar `<script setup>` (recomendação eng-review).
   - **Substituir** a área do ReplyBox por barra de 56px:
     - background slate-1
     - 1 linha de texto slate-10 centralizada/esquerda: "Você está visualizando como administrador. Para falar com o time, use a Inbox interna."
     - hairline 1px slate-7 no topo
     - sem botões
   - Quieto, intencional, não banner.
   - **Override de emergência:** keyboard shortcut `Ctrl+Shift+R` que toggle hide, atrás de dev flag (mitigação caso admin precise responder em situação rara).
2. **Tradução pass:** percorrer telas do admin (sidebar, M6 dashboards, M7/M8 placeholders), identificar strings ainda em inglês, popular nos overrides Algorythmo em `engines/algorythmo/.../overrides/pt_BR.json`.
3. **Contacts microcopy:** `ContactImportDialog.vue` JÁ existe (descoberta do eng-review). M9 NÃO constrói import — só adiciona linha de microcopy explicando "Contatos importados ficam disponíveis na aba Contatos. Eles não viram leads do CRM automaticamente — entram no CRM quando começam uma conversa por um canal conectado."

**Não-objetivo M9:** Inbox interna (canal admin↔time) — plano dedicado se virar prioridade. **Construir CSV import** — não precisa, já existe.

**Estimativa de PRs:** 2 (admin read-only mode + tradução pass com contacts microcopy).

---

## 6. Ordem de despacho e paralelismo

**Verdict eng-review:** M5 sequential → M6 + M7 + M8 paralelos após M5 → M9 sequencial após os três. **Crítica chave: M6/M7/M8 partem de M5 já merged**, não de main. Sidebar.vue é único ponto de contenção — sai do caminho no M5.

```
M5 (Foundation) ─ owns Sidebar.vue + i18n
  ├─ engineer worktree
  └─ designer worktree (SidebarSectionHeader visual)
  ↓ MERGE
  ↓
  ├──→ M6 (Gestão dashboards) ─ disjoint files
  │     ├─ PR-6a charts foundation (engineer)
  │     ├─ PR-6b skeleton + mock contract (engineer + designer)
  │     ├─ PR-6.0 Operação canônico (engineer + designer) ◄── DESIGNER LOCK
  │     └─ PRs 6.1-6.6 (derivados, engineer)
  │
  ├──→ M7 (C-Levels) ─ disjoint files
  │     └─ engineer PR único (atmospheric placeholder)
  │
  └──→ M8 (Inteligência) ─ disjoint files
        ├─ M8a Brain Aquário (engineer + designer)
        ├─ M8b Brain Upload (engineer + designer)
        └─ M8c Marketplace (engineer)
  ↓ TODOS MERGEADOS
  ↓
M9 (Admin Read-Only Mode) ─ touches ReplyBox + i18n consolidado
  └─ engineer worktree
```

**Conflict matrix verificado:**
| Par | Paralelo? | Razão |
|---|---|---|
| M5 ↔ M6/7/8 | NO | M5 dona de Sidebar.vue + bootstrap i18n |
| M6 ↔ M7 | YES | Disjoint dirs |
| M6 ↔ M8 | YES | Disjoint dirs |
| M7 ↔ M8 | YES | Disjoint dirs |
| M9 ↔ qualquer | NO | ReplyBox cross-cutting + tradução depende de M6/M7/M8 |

Cada milestone fecha com `/review` + `/cso` + `/qa-only` antes de `/ship`.

---

## 7. Questões dos reviews — fechadas (2026-05-27)

**Design-review:**
1. SidebarSectionHeader → spec trancada no §M5. Referência Linear + tokens reusados de BrainViewer.vue.
2. Mocks → founder escreve Operação (M6.0 canônico); designer extrapola os outros 5 com Operação como anchor de realismo.
3. Aquário → hierarquia por importância (não grid uniforme), 2 anchor + 4 secondary. Spec no §M8a.
4. C-Level → atmospheric (glifo custom + hairline gradient + Georgia + fade-in único). Sem Lottie, sem loop.
5. SectorAgentChat → **distinto** do ReplyBox. 360px painel direito, bolhas com borda (não fill), cmd+enter hint.

**Eng-review:**
1. Chart lib → `chart.js@~4.4.4` + `vue-chartjs@5.3.1` JÁ existem. Adicionar `PieChart.vue` + `LineChart.vue` em M6, não tocar BarChart upstream.
2. Section headers → `type: 'section'` discriminator no `menuItems` (não wrapper).
3. `useAdmin().isAdmin` → safe, mas usar `mapGetters` em ReplyBox (Options API) ao invés de setup() — diff menor.
4. Mock data → plain JS em `mocks/sectors/*.js`, **não i18n**.
5. Locale default → 3 pontos: `entrypoints/dashboard.js:38`, `App.vue:85`, `settings/account/Index.vue:44`. Toque canonical é Ruby (`chatwootConfig.selectedLocale`) → **`BACKEND_DEPS`**. M5 ship: JS-side fallback `|| 'pt_BR'`.
6. Contacts CSV → **EXISTE** em `components-next/Contacts/ContactsForm/ContactImportDialog.vue`. Kill stub branch.
7. Marketplace → additive, padrão `algorythmo_brain` (default visible). Flag `algorythmo_marketplace` é `BACKEND_DEPS` — M8c hardcoded visible.
8. Captain → confirmar em M5 PR via spec lendo `engines/algorythmo/lib/tasks/algorythmo/seed.rake`.

---

## 8. Risk register (eng-review)

Ranked, highest first:

1. **pt_BR canonical exige Ruby** — `chatwootConfig.selectedLocale` server-injected. Mitigação: JS fallback no M5, marcação `BACKEND_DEPS` pra PR Ruby separado.
2. **Sidebar.vue ponto único de contenção M5/6/7/8** — M5 land primeiro, demais worktrees rebasam off M5 merged.
3. **ReplyBox role-gate edge case** — admin que precisa responder não tem fallback. Mitigação: `Ctrl+Shift+R` override atrás de dev flag.
4. **Mock realism trap** — mocks viram source-of-truth em demo de venda. Mitigação: watermark "DADOS DE DEMONSTRAÇÃO" em cada card.
5. **chart.js bundle weight** — 7 dashboards × Pie/Line cresce chunk. Mitigação: `defineAsyncComponent` per rota (padrão já no codebase).
6. **Rename `SIDEBAR.REPORTS`** — referenciada em 30+ locale files. Mitigação: override APENAS em pt_BR override, não tocar upstream.
7. **Section header reordering deep links** — rotas inalteradas, baixo risco. Verificar em QA.
8. **`algorythmoCutFlags.js` mirror drift** — Marketplace fica não-cut, sem drift.
9. **Brain entry duplo-render** — D1 deixa explícito: MOVE, não ADD.
10. **Captain default assumption** — spec de assertion no M5 PR.

---

## 9. Inputs do founder — fechados (2026-05-27)

**1. Operação — números reais (mock de M6.0 canônico).** Founder delegou; valores escolhidos pra refletir realidade de PME brasileira de varejo/distribuição:

**Anchor KPIs:**
| KPI | Valor atual | Delta vs mês passado |
|---|---|---|
| Estoque atual | R$ 487.300 | ▲ R$ 19.100 (+4,1%) |
| Giro médio | 42 dias | ▼ 3 dias (mais rápido) |

**KPIs secundários:**
| KPI | Valor | Delta |
|---|---|---|
| SKUs ativos | 1.247 | ▲ 12 |
| Ruptura | 3,8% | ▼ 0,4pp |
| Tempo médio de expedição | 2,4h | ▼ 0,1h |
| Custo de mercadoria | 62,3% | ▲ 0,8pp |

**Chart de movimentação — últimos 90 dias** (estoque em R$ mil, snapshot semanal):

| Semana | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Estoque (R$ K) | 412 | 398 | 425 | 441 | 423 | 458 | 467 | 449 | 472 | 488 | 475 | 487 |

Tendência: crescimento gradual com volatilidade plausível (412 → 487, +18% no trimestre). Sem padrão regular demais (evita "feel sintético").

Designer extrapola os outros 5 setores usando esse padrão de realismo (ordem de grandeza compatível com PME, deltas pequenos mas significativos, valores que parecem "extraídos de planilha real").

**2. Glifo C-Level — opção (a) trancada.** Marca geométrica abstrata: mesa horizontal + 4 pontos representando executivos. Designer M7 produz o SVG.

---

## 10. Critério de pronto do plano

✓ Reviews rodados. ✓ Correções incorporadas. ✓ Inputs do founder fechados. **APPROVED — disparando M5.**

---

## 11. Linhagem

- ADR-0008: Algorythmo OS standalone.
- ADR-0011: Sequência MVP M0-M4.
- Plano 0001 §2.1 (A2-front, Q2): convenções de marcação inline + sistema de flags.
- Plano 0004: Brain M3 (`BrainViewer.vue` existente).
- Sessão founder 2026-05-27: D1-D6 trancadas.
- `/plan-design-review` 2026-05-27: section-header spec, M6.0 canônico, M8 split, M9 rename, atmospheric C-Level.
- `/plan-eng-review` 2026-05-27: CSV exists, pt_BR backend-dep, M6 base split, dispatch matrix, risk register.
