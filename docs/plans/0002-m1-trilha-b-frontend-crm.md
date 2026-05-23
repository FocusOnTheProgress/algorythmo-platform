# Plano 0002 — M1 Trilha B (Frontend CRM) — refinado pós-A+D

**Status:** READY_TO_DISPATCH (eng-review). Single contract para o `engineer` agent que vai implementar.
**Data:** 2026-05-23
**Owner:** Gustavo (founder/CEO Algorythmo)
**Linhagem:** refina `docs/plans/0001-mvp-algorythmo-os.md` §10 Trilha B, integrando o que foi entregue em A (commit `f5dc553f7`) e D (PR #37 `algorythmo/m1-d-design-system`).

> **Boundary:** este documento é contrato. Qualquer ambiguidade que o engineer encontrar volta pro `planner`, não pro founder. Decisões de produto pendentes estão isoladas em §10 Open questions — só essas viram pergunta humana.

---

## 1. Contexto

### 1.1 Estado pós-Trilha A (MERGED em `algorythmo/main`)

API CRM completa, gated por `algorythmo_crm` no `BaseController`. Endpoints disponíveis (todos prefixados por `/algorythmo/api/v1/accounts/:account_id`):

| Verb   | Path                              | Função                                                        |
|--------|-----------------------------------|---------------------------------------------------------------|
| GET    | `/leads?stage_id=X&cursor=&limit=`| Lista por stage. **Cursor-paginada** (P2). `{leads, next_cursor}`. |
| GET    | `/leads/:id`                      | Detalhe.                                                      |
| POST   | `/leads`                          | Cria. Body: `{ lead: { contact_id, stage_id, previous_lead_id?, channel_origin?, channel_metadata?, custom_fields? } }`. IDOR guards. |
| PATCH  | `/leads/:id`                      | Atualiza (sem `stage_id`, `contact_id`, `previous_lead_id`).  |
| DELETE | `/leads/:id`                      | Soft delete — admin only (`check_admin_authorization?`).      |
| PATCH  | `/leads/:id/move`                 | Body: `{ stage_id }`. Reseta `stage_entered_at`. Move com `move_to_stage`. |
| POST   | `/leads/:id/reopen`               | Só executável em Lead `won`/`lost`. Cria novo Lead com `previous_lead_id`. |
| PATCH  | `/stages/:id`                     | Body: `{ stage: { aging_coefficient } }`. Admin only.         |
| PATCH  | `/stages/:id/rename`              | Body: `{ name }`. Admin only.                                 |

**Listener `Algorythmo::CrmListener`** já está montado via `Algorythmo::AsyncDispatcher` (engine boot). Auto-create por canal funcionando. Frontend NÃO chama `POST /leads` no fluxo normal — Lead nasce server-side. POST existe pra casos extremos (re-vincular, debug).

**JSON shape do Lead retornado** (de `LeadsController#lead_json`):

```json
{
  "id": 1, "account_id": 1, "contact_id": 42, "stage_id": 7,
  "position": 1.0, "previous_lead_id": null,
  "channel_origin": "whatsapp",
  "channel_metadata": { "name": "Maria Santos", "handle": "+5511...", "photo_url": "..." },
  "custom_fields": {},
  "stage_entered_at": "2026-05-23T10:00:00Z",
  "closed_at": null, "last_message_at": "2026-05-23T11:30:00Z",
  "deleted": false,
  "created_at": "...", "updated_at": "..."
}
```

**Limitações conhecidas da API entregue:**

1. **Lista de Leads é por stage_id obrigatório.** Não há endpoint "todos os Leads do account" — Kanban tem que fazer N requests paralelos (1 por stage). Eng-decision T-B5 abaixo trata isso.
2. **Não há endpoint para listar pipelines/stages.** Cliente precisa de uma rota nova `GET /pipelines/default` retornando o pipeline + stages embutidos, OU listener bootstrap via cache do Vuex já hidratado por um endpoint diferente. **Recommendation: Trilha B abre PR backend mínimo (~30 linhas) adicionando `GET /algorythmo/api/v1/accounts/:account_id/pipelines/default` que retorna `{ pipeline: {id, name}, stages: [{id, name, position, kind, aging_coefficient}] }`. Sem isso o Kanban não consegue se montar.** Documentar como B.0 (precondição obrigatória).
3. **Contact não vem embutido no LeadJSON.** `lead.contact` está incluído no `.includes(:contact, :stage)` da query mas não no JSON serializado. Frontend vai precisar dele pra mostrar nome/foto. **Recommendation: adicionar bloco `contact: { id, name, email, phone_number, thumbnail }` no `lead_json` — backend patch ~10 linhas, parte do B.0**.
4. **Stage não vem embutida no LeadJSON.** Só `stage_id`. Frontend mantém um lookup local; aceito.
5. **`deleted` field exposto no JSON mas escopo `.active`** sempre filtra — campo é vestigial pra o cliente. Sem ação.
6. **Sem realtime/ActionCable.** A é stateless HTTP. Frontend não recebe push quando listener cria Lead. T-B7 trata.

### 1.2 Estado pós-Trilha D (PR #37, aguardando founder validar logos)

Design system entregue em `engines/algorythmo/app/assets/stylesheets/`:

- **`_tokens.scss`** — 9 neutrals OKLCH dark-first, semantic colors, aging tokens (green/yellow/red/neutral + glyphs `●`/`◐`/`○`/`—`), fluid typography com `clamp()`, spacing base-4, radii, shadow stack dark-tuned, motion (5 durations + 5 easings), layout (sidebar 260px, drawer 420px).
- **`_components.scss`** — classes `.alg-btn`, `.alg-input`, `.alg-card` (+ `__header`, `__title`, `__meta`, `__footer`, `--interactive`, `--raised`, `--flush`), `.alg-chip` (+ `--aging` com `data-state`), `.alg-modal`, `.alg-skeleton`.
- **`DESIGN.md`** — referência viva. Trilha B atualiza esta nas seções 3 (componentes novos) e 4 (LeadAgingChip refinado).

**Componentes NÃO entregues por D** (gaps — Trilha B precisa criar — listados em DESIGN.md §7.4): `.alg-toast`, `.alg-tooltip`, `.alg-dropdown` / `.alg-menu`, `.alg-drawer`, `.alg-avatar`, `.alg-tabs`, e form fundamentals (`.alg-label`, `.alg-select`, `.alg-checkbox`, `.alg-radio`, `.alg-switch`). **Trilha B vai precisar de pelo menos: `.alg-drawer`, `.alg-menu`, `.alg-toast`, `.alg-avatar`. Trilha B implementa e adiciona ao `_components.scss` + documenta no DESIGN.md (mantendo o doc vivo conforme §7.5).**

**Hook do Vite — explicitamente passado pra B (DESIGN.md §6.2):**

- Adicionar alias `@algorythmo/styles` em `vite.config.mjs` apontando pra `engines/algorythmo/app/assets/stylesheets/algorythmo.scss`.
- No entry SCSS do dashboard (`app/javascript/dashboard/assets/scss/_woot.scss`), `@import '@algorythmo/styles';` **antes** de `@import 'base'`.
- Tag `// algorythmo: design-system-import` em ambos os pontos.

**Dependência de PR #37 merge:** B só pode integrar o hook do Vite depois de D estar em `algorythmo/main`. Se D ainda não mergeou quando B começar, engineer levanta o tema com founder no início da Trilha — não tenta merge local "experimental".

### 1.3 O que mudou desde o spec original §10 Trilha B

| ID | Spec original | Mudança | Razão |
|---|---|---|---|
| Δ1 | B começa direto em CrmKanban.vue | Adicionado **B.0 — backend patch ~40 LOC** (rota `pipelines/default` + `contact` embutido no LeadJSON) | A não entrega essas duas peças; sem elas, B não funciona |
| Δ2 | B.2 menciona `Sidebar.vue` na pasta `components/layout/` | Caminho real é `app/javascript/dashboard/components-next/Sidebar/Sidebar.vue` | Codebase mudou pós-spec; já tem precedente do bloco Captain com tagged comment |
| Δ3 | Spec sugere `vuedraggable-next` | Usar `vuedraggable@4.1.0` (já em deps, é a versão Vue3) | `vuedraggable-next` foi renomeada pra `vuedraggable@4.x` — não adicionar dep nova |
| Δ4 | Drag de Lead direto pra coluna | **Cursor pagination obrigatória + virtual scroll por coluna** | A já é cursor-paginada (P2); offset banida. Coluna com 500+ Leads precisa de virtualização (Chatwoot já usa `virtua/vue` em ConversationList — reusar) |
| Δ5 | B.7 só "vincular conversa a Lead" | Adicionado **chip de contexto CRM no header da conversa** (mostra qual Lead, qual stage) | Mitigação registrada em §7 do plano 0001 (ADR-0004) |
| Δ6 | Auto-create acontece, frontend vê depois | **Estratégia de refresh explícita: polling 8s por coluna ativa + invalidação após drag** | T-B7 abaixo. Sem ActionCable no MVP |
| Δ7 | i18n strings ad-hoc | **Todas as strings novas via overlay** (`engines/algorythmo/app/javascript/i18n/overrides/{en,pt_BR}.json`) | Padrão M0.5 já estabelecido |
| Δ8 | Spec não fala de SCSS bridge | **Vite alias + import do `algorythmo.scss` no woot entry** é precondição | DESIGN.md §6.2 passou pra B |
| Δ9 | Soft-fork zone check é manual | **`engines/algorythmo/bin/check-soft-fork-zone.sh` ganha 2 entradas novas** (Sidebar.vue + ConversationHeader.vue + vite.config + _woot.scss) | Check existente precisa cobrir os novos touches |
| Δ10 | Sem definição de e2e | **Playwright `e2e/crm.spec.ts` novo + extensões em `e2e/smoke.spec.ts`** (rota CRM visível quando flag on, ausente quando off) | T1/T2 do plano 0001 |
| Δ11 | Cobertura "≥75%" generic | **≥75% Vue interaction COM E2E gate. Composables ≥90%. Story-test snapshot pro LeadAgingChip nos 4 estados.** | T2 revisado no plano 0001 |
| Δ12 | Não menciona telemetria de erro | **Erro de drag faz rollback otimista + toast retry**, log estruturado em `console.error` (no MVP placeholder pra telemetria) | F8 + tabela telemetria existe vazia (M0.5) |

---

## 2. Objetivo

**One-liner:** Painel Kanban dark-first do CRM com drag-drop entre 5 colunas, gated por `algorythmo_crm`, consumindo a API da Trilha A e o design system da Trilha D, sem furar a zona soft-fork upstream.

**Critério de aceite binário pós-B:**

1. Founder loga, flag `algorythmo_crm` enabled → item "CRM" aparece no sidebar; flag off → some.
2. Click em "CRM" abre `/app/accounts/:id/crm` com 5 colunas (Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido).
3. Mensagem nova entra pelo widget → em ≤10s, Lead aparece em "Novo" no Kanban (polling) com nome do widget, ícone do canal, chip de aging verde, tempo "agora" / "<1min".
4. Founder arrasta card de "Novo" pra "Qualificado" → optimistic move, `aria-live` anuncia "Lead Maria movida para Qualificado", refresh do browser preserva posição. Em falha de rede, card volta com toast "Falha ao mover — tentar novamente".
5. Click no card abre drawer lateral com dados completos (nome, contato, canal, histórico, conversa vinculada). Esc fecha. Tab loop é trap dentro do drawer.
6. "Configurar pipeline" abre tela com 5 stages, rename inline, input numérico de `aging_coefficient` por stage + preview da escala.
7. Header da conversa do Lead mostra chip "Lead em Qualificado" + link "Mudar Lead vinculado" (Δ5).
8. Lead em `won`/`lost` mostra botão "Reabrir como novo Lead". Click → POST reopen → novo card em "Novo".
9. Playwright `e2e/crm.spec.ts` passa todos os cenários (§7). axe-core retorna zero violations critical/serious WCAG AA em `/app/accounts/:id/crm`.
10. `bash engines/algorythmo/bin/check-soft-fork-zone.sh` continua verde. `grep -rn "// algorythmo:" app/javascript/dashboard/components-next/Sidebar/Sidebar.vue` retorna pelo menos 2 blocos tagged.

**Boundary do MVP B (NÃO entra):**

- Filtros avançados ("Leads de WhatsApp da última semana"). Pós-MVP.
- Múltiplos pipelines. Pós-MVP (§7 plano 0001).
- Drag-by-keyboard. Cortado em D11 + F4 (plano 0001). Fallback: menu ⋮ "Mover para…" → modal de stage select.
- Bulk operations (multi-select, mover N). Pós-MVP.
- Inline edit de campos do Lead direto no card. Tudo via drawer.
- Realtime push. Polling 8s + invalidação pós-drag é suficiente pro MVP. ActionCable é roadmap pós-M2.
- Drag entre pipelines (não existe múltiplo pipeline ainda).
- Mobile responsivo profundo. Funciona em desktop ≥1024px; tablet 768px desgraçado mas funcional; mobile 375px **fora do escopo** — Kanban não foi feito pra touch. Roadmap pós-MVP transforma em lista vertical em <768px.

---

## 3. Decisões T-issues (eng-review)

Cada decisão fixa **Recommendation** + 1 linha de razão. Não há perguntas pro founder aqui — são decisões técnicas.

### T-B1 — Rota da Kanban

- **Recommendation:** **Sub-rota dedicada** `/app/accounts/:accountId/crm` (Kanban index) + `/app/accounts/:accountId/crm/pipeline` (config). Não substitui `/conversations`, não é overlay; é uma seção própria como `/contacts` ou `/campaigns`.
- **Razão:** D6 (auto-create) torna Conversations e CRM duas lentes do mesmo dado. Forçar overlay deturpa a navegação. Founder pediu "seção própria ao lado de Conversas" no plano 0001 §3.
- **Implementação:** novo arquivo `app/javascript/dashboard/routes/dashboard/crm/crm.routes.js`. Wire-up em `dashboard.routes.js` com **tagged comment** `// algorythmo: feature-gate algorythmo_crm` antes do spread.

### T-B2 — Store de Leads

- **Recommendation:** **Composable + `ref`/`shallowRef` puro Vue3, NÃO Vuex**. Módulo `useLeadStore` em `app/javascript/dashboard/composables/algorythmo/useLeadStore.js`. Vive isolado do Vuex global do Chatwoot.
- **Razão:** Vuex do upstream é monolito que polui o sync mensal. Composable isolado em pasta `algorythmo/` ZERO toca o módulo Vuex upstream — todo o estado do CRM fica em arquivo novo, sem tagged comment. Pinia seria ok mas adiciona dep nova; Vue3 reativo cobre o caso.
- **Estrutura:**
  - `state`: `Map<stageId, { leads: Lead[], cursor: string|null, isLoading: bool, hasMore: bool, error: string|null }>`.
  - `actions`: `fetchStage(stageId)`, `fetchNextPage(stageId)`, `moveLeadOptimistic({leadId, fromStageId, toStageId})`, `commitMove({leadId, toStageId})`, `rollbackMove({leadId, fromStageId})`, `upsertLead(lead)` (chamado pelo polling), `reopenLead(leadId)`.
  - `getters`: `leadsByStage(stageId)`, `findLeadById(id)`, `pipelineLoaded` (boolean).

### T-B3 — Drag-drop lib

- **Recommendation:** **`vuedraggable@4.1.0`** (já em deps, Vue3-compat, baseado em SortableJS).
- **Razão:** Adicionar lib nova (vue-draggable-plus, dnd-kit) custa bytes e re-aprendizado. O `vuedraggable` já é usado em 4+ pontos do Chatwoot — reusar mantém o bundle limpo e o sync mensal trivial.
- **Limitação aceita:** drag-by-keyboard não funciona confiável. D11 escopo reduzido (cortado do MVP).

### T-B4 — Optimistic update vs server-confirmed

- **Recommendation:** **Optimistic com rollback explícito.** UI move o card antes da resposta. Em falha (4xx/5xx/timeout 5s), rollback + toast "Falha ao mover — tentar de novo" com botão retry.
- **Razão:** Latência local <30ms; em deploy futuro 100-300ms. Operador profissional não tolera "spinner em cada drag". Rollback é simples (store registra `fromStageId` no início do drag). Race com listener auto-create não acontece — listener cria em "Novo", drag entra depois.
- **Edge case:** drag durante polling. Resolução: polling tick que recebe Lead com `stage_id` diferente do estado local **ignora** se o Lead está com flag `_optimisticMove=true` na store (clear flag no commit/rollback).

### T-B5 — Cursor pagination UX

- **Recommendation:** **Virtual scroll com `virtua/vue` + auto-load infinito.** Quando o scroll de uma coluna atinge 80% do fim, dispara `fetchNextPage(stageId)`. Sem botão "Load more" — UX premium é continuum, não interrupção.
- **Razão:** Chatwoot já usa `virtua/vue` em `ConversationList.vue`. Reusar a primitiva mantém bundle e técnica consistentes. Coluna típica tem 20-100 cards mas extremos (Novo após retomada de inbox antigo) podem ter 5000+ — virtualizar evita DOM blow-up.
- **Limite operacional:** API `limit` máximo 200. Default da UI: 50 por página.

### T-B6 — LeadAgingChip implementação

- **Recommendation:** **Componente Vue puro** `LeadAgingChip.vue` consumindo as classes `.alg-chip alg-chip--aging` + `data-state` da Trilha D. Sem web component.
- **Razão:** Vue componente é mais simples, integra com props/computed, é mais fácil de testar. Web component traria boundary de styling desnecessário. As classes CSS já estão prontas no `_components.scss`.
- **Estrutura (matches DESIGN.md §4):**
  - Props: `secondsInStage: number`, `agingCoefficient: number`.
  - Computed `state`: aplica guarda F6 (`if (agingCoefficient === 0 || agingCoefficient == null) return 'neutral'`), depois calcula `ratio = secondsInStage / (12 * 3600 * agingCoefficient)`; <1 = green, <2 = yellow, ≥2 = red.
  - Renderiza `<span class="alg-chip alg-chip--aging" :data-state="state" :aria-label="..."><span class="alg-chip__glyph" aria-hidden="true">{glyph}</span>{label}</span>`.
  - `label` = `formatTimeHuman(secondsInStage)` (utility novo, ver T-B11).

### T-B7 — Refresh strategy

- **Recommendation:** **Polling 8 segundos por stage visível**, pausado quando aba não está em foco (`document.visibilityState !== 'visible'`). Invalidação imediata após drag (refetch das duas colunas afetadas). Sem ActionCable no MVP.
- **Razão:** ActionCable do Chatwoot existe mas (a) requer broadcast server-side novo no engine (não está em A), (b) adiciona complexidade pro deploy laptop (Sidekiq + Redis pubsub), (c) 8s é "instantâneo" o suficiente pra observação humana (founder testando), (d) pause-on-blur evita queimar bateria. Roadmap pós-M2: trocar polling por ActionCable quando deploy multi-tenant entrar.
- **Implementação:** composable `usePolling(fetchFn, intervalMs, isActiveRef)` reusável.

### T-B8 — Error boundaries

- **Recommendation:** **3 níveis de fallback explícitos.**
  1. **API down / 5xx no fetch inicial:** página inteira mostra `ErrorState.vue` com copy "Não conseguimos carregar o CRM agora. Tentar de novo →" + botão. Não tela em branco.
  2. **Drag falha:** rollback + `Toast.vue` "Falha ao mover" + retry button.
  3. **Polling falha:** silencioso (não interrompe o operador). Log estruturado em `console.error('algorythmo:polling-failed', ...)` + exponential backoff (8s → 16s → 32s, cap 32s). Recupera no primeiro success.
- **Razão:** Estados de erro são designed, não toleradas (DESIGN.md §8 princípio 4). Cada cenário tem UX dedicado.

### T-B9 — Drawer (LeadDetailDrawer) primitive

- **Recommendation:** **Criar `.alg-drawer` em `_components.scss`** (gap conhecido da Trilha D §7.4). Side-drawer 420px (`--alg-drawer-width`), slide-in `--alg-duration-slow` + `--alg-ease-out`, scrim `--alg-bg-overlay` com `backdrop-filter: blur(8px)`, `role="dialog"` + `aria-modal="true"` + focus trap + Esc to close. Mobile: full-screen drawer (`@media (max-width: 768px) { width: 100vw }`).
- **Razão:** B.5 do plano original menciona "drawer lateral". Trilha D delegou explicitamente. Implementar como primitive CSS no engine + componente Vue wrapper `AlgDrawer.vue` no dashboard que aciona `<teleport to="body">`. Documentar no DESIGN.md §3.

### T-B10 — Menu (⋮ dropdown) primitive

- **Recommendation:** **Criar `.alg-menu` em `_components.scss`** + componente `AlgMenu.vue` usando `@vueuse/core useFloating` (já em deps — usado em outros menus do upstream). Trigger por click (não hover, pra acessibilidade). Posicionamento auto-flip. Esc fecha. Setas ↑↓ navegam items.
- **Razão:** B.4 precisa do menu ⋮ do card. Gap da Trilha D §7.4.

### T-B11 — Time humanization

- **Recommendation:** **Função `formatTimeHuman(seconds)`** em `app/javascript/dashboard/helper/algorythmo/timeFormat.js`. Output formato (i18n via overlay):
  - `< 60s` → "agora"
  - `< 60min` → "12 min"
  - `< 24h` → "4h 12m"
  - `< 7d` → "3d 4h"
  - `< 30d` → "2 sem"
  - `≥ 30d` → "1 mês 2d"
- **Razão:** D5 anatomia do card pede "tempo na etapa" humanizado. Reusar `date-fns` (já em deps) — `formatDistance` é genérico demais ("about 3 hours"); precisamos compacto e operacional.
- **Cobertura:** Vitest 100% (função pura, fácil — 12 cases dos boundaries).

### T-B12 — i18n strategy

- **Recommendation:** **Todas as strings novas via overlay**, nunca direto no upstream. Chaves novas em `engines/algorythmo/app/javascript/i18n/overrides/{en,pt_BR}.json` sob namespace `ALGORYTHMO_CRM.*`:
  ```json
  {
    "ALGORYTHMO_CRM": {
      "SIDEBAR_LABEL": "CRM",
      "KANBAN": { "TITLE": "CRM", "SEARCH_PLACEHOLDER": "Buscar leads", ... },
      "STAGE_DEFAULTS": { "NOVO": "Novo", "QUALIFICADO": "Qualificado", ... },
      "AGING": { "GREEN_LABEL": "Em dia", "YELLOW_LABEL": "Atenção", "RED_LABEL": "Atrasado" },
      "EMPTY_STATE": { "TITLE": "Os Leads aparecem aqui...", "CTA": "Conecte um canal agora" },
      "ERRORS": { "MOVE_FAILED": "Falha ao mover lead", "RETRY": "Tentar de novo" }
    }
  }
  ```
- **Razão:** Engine i18n loader (`engines/algorythmo/app/javascript/i18n/index.js`) já lê estes arquivos via `deepMerge`. Padrão M0.5. Sem tagged comment porque é arquivo do engine.
- **Cobertura:** smoke spec em `app/javascript/dashboard/i18n/i18n_overlay.spec.js` recebe um teste novo "chaves CRM carregadas em ambos os locales".

### T-B13 — Sidebar item insertion

- **Recommendation:** **Bloco condicional novo dentro do array `menuItems` de `Sidebar.vue`**, gateado por `useAlgorythmoFeatureGate('algorythmo_crm')`, tagged `// algorythmo: feature-gate algorythmo_crm`. Posição: ANTES do Captain bloco existente (CRM é primeira função PME, Captain é interno). Ícone `i-lucide-trello` (já no iconify set do Chatwoot) ou `i-lucide-kanban-square`.
- **Razão:** Patriarca de pattern: o bloco Captain já está tagged exatamente assim. Mantém consistency. Engineer copia o padrão.

### T-B14 — ConversationHeader chip de contexto CRM

- **Recommendation:** **Componente novo `ConversationCrmContext.vue`** montado no `ConversationHeader.vue` upstream com bloco condicional tagged `// algorythmo: feature-gate algorythmo_crm`. Faz fetch leve `GET /algorythmo/api/v1/accounts/:id/leads?contact_id=X` (precisa estender API — ver Δ Note abaixo) ou consulta cache da store. Mostra chip `.alg-chip` com nome do stage + link "Ver no CRM" + menu "Vincular a outro Lead".
- **Razão:** ADR-0004 mitigation. Mantém Conversations e CRM como "duas lentes do mesmo dado". Sem chip, founder esquece que o card no Kanban tem timeline ao lado.
- **Δ Note:** API atual não tem `GET /leads?contact_id=X`. **B.0 estende:** aceitar `contact_id` como filtro alternativo a `stage_id` no `LeadsController#index` (uma única `where(contact_id: X)` retornando `open` Leads — sem cursor pagination, max 1 resultado esperado por idempotência D6).

### T-B15 — Soft-fork zone updates

- **Recommendation:** **Estender `engines/algorythmo/bin/check-soft-fork-zone.sh`** + **`engines/algorythmo/README.md` Soft-fork zone table** com 4 novos arquivos tocados pela B:

| Path | Expected tag |
|---|---|
| `app/javascript/dashboard/components-next/Sidebar/Sidebar.vue` | `feature-gate algorythmo_crm` |
| `app/javascript/dashboard/routes/dashboard/dashboard.routes.js` | `feature-gate algorythmo_crm` |
| `app/javascript/dashboard/modules/conversation/components/ConversationHeader.vue` (caminho real a confirmar; B.0 inventariou) | `feature-gate algorythmo_crm` |
| `vite.config.mjs` | `design-system-import` |
| `app/javascript/dashboard/assets/scss/_woot.scss` | `design-system-import` |

- **Razão:** o script existente regex aceita `rebrand-m0|soft-fork|widget-i18n-overlay|survey-i18n-overlay`. Adicionar `feature-gate|design-system-import` ao regex em `check_file()`. Sem isso, CI verde mente.

### T-B16 — Empty states

- **Recommendation:** **2 níveis dedicados** (DESIGN.md §8 princípio 4 + plano 0001 §3 critério 7):
  1. **Kanban global vazio** (zero Leads em qualquer stage, primeira sessão): card grande no centro com copy fixa "Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais. **Conecte um canal agora →**" linkando pra `/app/accounts/:id/settings/inboxes/new`. Foco entra no link via Tab (P3).
  2. **Coluna vazia individual** (outras colunas têm Leads): texto sutil "Nenhum Lead em [stage]" centralizado, baixa opacidade.

### T-B17 — Avatar component

- **Recommendation:** **Criar `.alg-avatar` em `_components.scss` + `AlgAvatar.vue`**. Props: `src?: string`, `name: string`, `size: 'sm'|'md'|'lg'`. Fallback: gradient determinístico (hash do nome) + iniciais. Sizes 24/32/48px. `border-radius: var(--alg-radius-pill)`.
- **Razão:** Trilha D §7.4 gap. Chatwoot tem `Thumbnail.vue` upstream, mas estilo não bate com tokens Algorythmo. Avatar próprio mantém visual coeso. Documentar no DESIGN.md.

### T-B18 — Toast component

- **Recommendation:** **Criar `.alg-toast` + `AlgToastContainer.vue`** (singleton com `<teleport to="body">` + composable `useToast()` que expõe `success(msg)`, `error(msg, { retry?: () => void })`, `info(msg)`). Posição: bottom-right. Auto-dismiss 4s (success/info), persiste até clicked (error). Empilha (queue).
- **Razão:** T-B8 erro de drag precisa de toast com retry. Trilha D §7.4 gap.

### T-B19 — Drag-by-keyboard fallback ("Mover para...")

- **Recommendation:** **Implementar fallback no MVP** (não cortado): no menu ⋮ do card, opção "Mover para…" abre modal com lista de stages clicáveis (radio + botão Mover). Acessível por teclado. Cobertura: Playwright valida que keyboard-only consegue mover.
- **Razão:** D11 acessibilidade não corta o fallback, só o drag-by-keyboard. Sem fallback, keyboard-only fica sem operação primária. Custo: ~80 LOC + 1 spec.

---

## 4. Arquitetura

### 4.1 Diagrama (componentes + fluxo)

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Vue 3 dashboard)                                      │
│                                                                 │
│  ┌──────────────────┐                                           │
│  │  Sidebar.vue     │  algorythmo: feature-gate algorythmo_crm  │
│  │  (upstream)      │──► useAlgorythmoFeatureGate               │
│  └────────┬─────────┘                                           │
│           │ click "CRM"                                         │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Vue Router  /app/accounts/:id/crm                       │   │
│  │  crm.routes.js (novo, engine zone)                       │   │
│  └────────┬─────────────────────────────────────────────────┘   │
│           ▼                                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CrmKanbanView.vue  (route component)                    │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  KanbanHeader.vue  (title, search, "Configurar")   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────┬──────────┬──────────┬──────────┬──────────┐  │   │
│  │  │ Stage  │ Stage    │ Stage    │ Stage    │ Stage    │  │   │
│  │  │ Column │ Column   │ Column   │ Column   │ Column   │  │   │
│  │  │ Novo   │ Qualific │ Proposta │ Ganho    │ Perdido  │  │   │
│  │  │        │          │          │          │          │  │   │
│  │  │ [Card] │ [Card]   │ [Card]   │ [Card]   │ [Card]   │  │   │
│  │  │ [Card] │ [Card]   │          │          │          │  │   │
│  │  │ [Card] │          │          │          │          │  │   │
│  │  │  ...   │  ...     │  ...     │  ...     │  ...     │  │   │
│  │  │ (virt) │ (virt)   │ (virt)   │ (virt)   │ (virt)   │  │   │
│  │  └────────┴──────────┴──────────┴──────────┴──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Composables:                                                   │
│   useLeadStore       (state per stage)                          │
│   usePipelineStore   (pipeline + stages cache)                  │
│   usePolling         (8s tick, pause on blur)                   │
│   useKanbanDragDrop  (vuedraggable wrapper)                     │
│   useToast           (singleton)                                │
│   useAlgorythmoFeatureGate (já existe)                          │
└──────────────┬──────────────────────────────────────────────────┘
               │ HTTP (axios)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Engine Algorythmo API (Trilha A, MERGED)                       │
│                                                                 │
│  GET    /algorythmo/api/v1/accounts/:id/pipelines/default  [B.0]│
│  GET    /algorythmo/api/v1/accounts/:id/leads?...               │
│  PATCH  /algorythmo/api/v1/accounts/:id/leads/:lid/move         │
│  POST   /algorythmo/api/v1/accounts/:id/leads/:lid/reopen       │
│  PATCH  /algorythmo/api/v1/accounts/:id/stages/:sid/rename      │
│  PATCH  /algorythmo/api/v1/accounts/:id/stages/:sid             │
│                                                                 │
│  BaseController → ensure_algorythmo_crm_enabled! (FAIL CLOSED)  │
└──────────────┬──────────────────────────────────────────────────┘
               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Postgres (Algorythmo::Lead, Pipeline, Stage tables)            │
│                                                                 │
│  Listener Algorythmo::CrmListener (subscribe MessageCreated)    │
│    → auto-create Lead em "Novo" (D6)                            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Estrutura de arquivos (todos NOVOS exceto soft-fork edits)

```
app/javascript/dashboard/
├── routes/dashboard/crm/                          [novo, engine zone]
│   ├── crm.routes.js
│   └── views/
│       ├── CrmKanbanView.vue
│       ├── PipelineConfigView.vue
│       └── components/
│           ├── KanbanHeader.vue
│           ├── KanbanBoard.vue              (orquestra colunas)
│           ├── StageColumn.vue              (1 coluna, virtualizada)
│           ├── LeadCard.vue
│           ├── LeadDetailDrawer.vue
│           ├── LeadAgingChip.vue
│           ├── LeadEmptyState.vue
│           ├── StageEmptyState.vue
│           ├── MoveLeadModal.vue            (T-B19 fallback)
│           ├── ConversationCrmContext.vue   (T-B14)
│           └── PipelineConfigForm.vue
├── composables/algorythmo/                        [novo]
│   ├── useLeadStore.js
│   ├── usePipelineStore.js
│   ├── usePolling.js
│   ├── useKanbanDragDrop.js
│   ├── useToast.js                          (singleton)
│   ├── useAlgDrawer.js                      (focus trap helper)
│   └── specs/
│       ├── useLeadStore.spec.js
│       ├── usePipelineStore.spec.js
│       ├── usePolling.spec.js
│       └── useKanbanDragDrop.spec.js
├── helper/algorythmo/                             [novo]
│   ├── timeFormat.js
│   ├── leadApi.js                           (axios wrappers /algorythmo/...)
│   └── specs/
│       ├── timeFormat.spec.js
│       └── leadApi.spec.js
└── components-next/algorythmo/                    [novo, shared primitives]
    ├── AlgDrawer.vue
    ├── AlgMenu.vue
    ├── AlgToast.vue
    ├── AlgToastContainer.vue
    ├── AlgAvatar.vue
    └── specs/
        ├── AlgDrawer.spec.js
        ├── AlgMenu.spec.js
        ├── AlgToast.spec.js
        ├── AlgAvatar.spec.js
        └── LeadAgingChip.spec.js

engines/algorythmo/
├── app/assets/stylesheets/_components.scss        [edit, adicionar .alg-drawer, .alg-menu, .alg-toast, .alg-avatar]
├── app/javascript/i18n/overrides/en.json          [edit, add ALGORYTHMO_CRM.*]
├── app/javascript/i18n/overrides/pt_BR.json       [edit, add ALGORYTHMO_CRM.*]
├── app/controllers/algorythmo/api/v1/             [edit/add B.0]
│   ├── leads_controller.rb                  (estender contact_id filter + embed contact no JSON)
│   └── pipelines_controller.rb              [novo, ~30 linhas]
├── config/routes.rb                               [edit, add pipelines GET]
├── DESIGN.md                                      [edit, documentar componentes novos]
├── README.md                                      [edit, expandir soft-fork zone table]
└── bin/check-soft-fork-zone.sh                    [edit, expandir regex + entries]

e2e/
├── smoke.spec.ts                                  [edit, add testes flag on/off]
└── crm.spec.ts                                    [novo, suite completa]

Soft-fork zone (UPSTREAM com tagged comments — total: 5 arquivos):
├── app/javascript/dashboard/components-next/Sidebar/Sidebar.vue
├── app/javascript/dashboard/routes/dashboard/dashboard.routes.js
├── app/javascript/dashboard/modules/conversation/components/ConversationHeader.vue
├── vite.config.mjs
└── app/javascript/dashboard/assets/scss/_woot.scss
```

### 4.3 Data flow — drag de Lead entre stages

```
User drags LeadCard from Stage "Novo" → Stage "Qualificado"
   │
   ▼
useKanbanDragDrop.onEnd({lead, fromStageId, toStageId})
   │
   ├──► useLeadStore.moveLeadOptimistic({leadId, fromStageId, toStageId})
   │        Map operations:
   │          state[fromStageId].leads = [...].filter(l => l.id !== leadId)
   │          state[toStageId].leads.unshift({...lead, _optimisticMove: true})
   │        UI updates immediately
   │
   ├──► leadApi.move(leadId, toStageId)
   │     PATCH /algorythmo/api/v1/accounts/:id/leads/:leadId/move
   │       body: { stage_id: toStageId }
   │
   ├──► SUCCESS (200): {lead JSON with new stage_id, position, stage_entered_at}
   │    └──► useLeadStore.commitMove({leadId, updatedLead})
   │            clears _optimisticMove flag
   │            replaces with server-truthy data
   │            aria-live announces "Lead Maria movido para Qualificado"
   │
   └──► FAILURE (4xx/5xx/timeout 5s):
        └──► useLeadStore.rollbackMove({leadId, fromStageId})
                restores card to fromStageId
                useToast.error(t('ALGORYTHMO_CRM.ERRORS.MOVE_FAILED'),
                              { retry: () => retryMove(...) })
                console.error('algorythmo:drag-failed', {leadId, ...})
```

### 4.4 Polling tick

```
usePolling(pollFn, 8000, isActiveRef)
   │
   ▼  every 8s (when document.visibilityState === 'visible')
   │
   pollFn() = for each visible stageId:
              GET /algorythmo/api/v1/accounts/:id/leads?stage_id=X&limit=50
              merge into useLeadStore.upsertLeads(stageId, leads)
   │
   ▼
   upsertLeads logic:
     for each incoming lead:
       existing = state.leads.find(l => l.id === incoming.id)
       if existing?._optimisticMove === true: skip (don't clobber)
       else if existing: replace
       else: prepend (new auto-created Lead)
     remove any local lead whose id is not in incoming set (server source of truth)
       — EXCEPT _optimisticMove (handled in commit/rollback)
```

---

## 5. Tasks (PR-sized chunks)

Cada task tem path, mudança, razão, e DoD. Tudo numerado pra rastreio.

### B.0 — Backend patch (precondição)

**Path:** `engines/algorythmo/app/controllers/algorythmo/api/v1/leads_controller.rb`, `pipelines_controller.rb` (novo), `config/routes.rb`.

**Mudanças:**
1. **`pipelines_controller.rb`** (novo): `GET /algorythmo/api/v1/accounts/:account_id/pipelines/default` retorna `{ pipeline: {id, name}, stages: [...] }`. Usa `Algorythmo::Pipeline.cached_default_for(current_account)`. Sem auth extra além do BaseController.
2. **`leads_controller.rb`**: aceitar `contact_id` como filtro alternativo a `stage_id` em `#index` (retorna max 1 Lead aberto — D6 idempotência). Adicionar bloco `contact: { id, name, email, phone_number, thumbnail }` no `lead_json`. Stage_id continua obrigatório quando contact_id ausente.
3. **`config/routes.rb`**: `resources :pipelines, only: [] do collection do get :default end end`.

**Razão:** API atual não entrega o suficiente pro Kanban se montar (stages + contact info). Endpoint novo + extensão.

**DoD:**
- RSpec ≥90% nos 2 controllers (5 cases pra pipelines#default, 4 cases pra leads#index com contact_id filter).
- Sem mudança no behavior `stage_id`-driven.
- IDOR guard mantido (`contact_id` filtrado por `current_account.id` no `Contact.exists?` check).
- PR size estimado: ~80 LOC.

### B.1 — Bridge SCSS (Vite alias + import)

**Paths (soft-fork zone — tagged):**
- `vite.config.mjs` — adicionar alias `@algorythmo/styles → engines/algorythmo/app/assets/stylesheets/algorythmo.scss`. Tag `// algorythmo: design-system-import`.
- `app/javascript/dashboard/assets/scss/_woot.scss` — `@import '@algorythmo/styles';` antes de `@import 'base';`. Tag `// algorythmo: design-system-import`.
- `engines/algorythmo/bin/check-soft-fork-zone.sh` — adicionar regex `design-system-import` + 2 entries.
- `engines/algorythmo/README.md` — soft-fork zone table atualizada.

**Razão:** sem isso as classes `.alg-*` não chegam no bundle Vue.

**DoD:**
- `pnpm build` passa.
- `bash engines/algorythmo/bin/check-soft-fork-zone.sh` continua verde.
- `.alg-btn` aplicado em qualquer Vue file renderiza estilizado (smoke manual).

### B.2 — Composables core (store, api, polling)

**Paths (engine zone):**
- `app/javascript/dashboard/helper/algorythmo/leadApi.js` — axios wrappers tipados em comentário JSDoc, base URL `/algorythmo/api/v1`. **Importante:** não estender `ApiClient.js` upstream porque ele assume `/api/v1`. Wrappers diretos.
- `app/javascript/dashboard/composables/algorythmo/useLeadStore.js`
- `app/javascript/dashboard/composables/algorythmo/usePipelineStore.js`
- `app/javascript/dashboard/composables/algorythmo/usePolling.js`
- Specs Vitest correspondentes (≥90% — composables são puros).

**Razão:** infra antes de UI. Toda a B é movida por estas peças.

**DoD:**
- Vitest passa, cobertura ≥90% por arquivo.
- Não usa Vuex.
- Não importa nada de `app/javascript/dashboard/store/`.

### B.3 — Primitives (Drawer, Menu, Toast, Avatar)

**Paths:**
- `engines/algorythmo/app/assets/stylesheets/_components.scss` — adicionar `.alg-drawer`, `.alg-menu`, `.alg-toast`, `.alg-avatar` (com states).
- `app/javascript/dashboard/components-next/algorythmo/AlgDrawer.vue`
- `app/javascript/dashboard/components-next/algorythmo/AlgMenu.vue`
- `app/javascript/dashboard/components-next/algorythmo/AlgToast.vue` + `AlgToastContainer.vue`
- `app/javascript/dashboard/components-next/algorythmo/AlgAvatar.vue`
- Specs Vitest.
- `engines/algorythmo/DESIGN.md` — adicionar seções 3.7-3.10 documentando os 4 novos.

**Razão:** Componentes B depende. Trilha D §7.4 gaps fechados aqui.

**DoD:**
- Vitest ≥75% (componentes Vue interactive).
- Storybook (`*.story.vue`) opcional mas recomendado pra LeadAgingChip já que ele tem 4 estados — replica padrão `ContactNoteItem.story.vue`.
- WCAG AA: focus visible, contrast ≥4.5, focus trap no Drawer, Esc fecha.

### B.4 — LeadAgingChip + LeadCard

**Paths:**
- `app/javascript/dashboard/components-next/algorythmo/LeadAgingChip.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadCard.vue`
- `app/javascript/dashboard/helper/algorythmo/timeFormat.js` + spec.
- Specs Vitest.

**Razão:** Card é a célula visual do Kanban.

**DoD:**
- Snapshot tests do LeadAgingChip nos 4 states (neutral, green, yellow, red).
- Test explícito do guarda F6 (`agingCoefficient === 0` → state 'neutral' SEM divisão).
- `aria-label` completo: "Lead {name}, {stage}, {timeHuman} nesta etapa, canal {channel}".
- Touch target: card inteiro é clicável, 44px+ tall.

### B.5 — KanbanBoard + StageColumn (virtualizado)

**Paths:**
- `app/javascript/dashboard/routes/dashboard/crm/views/CrmKanbanView.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/KanbanHeader.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/KanbanBoard.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/StageColumn.vue`
- `app/javascript/dashboard/composables/algorythmo/useKanbanDragDrop.js`
- Specs Vitest.

**Razão:** o board.

**DoD:**
- 5 colunas em desktop, scroll horizontal em <1280px.
- Virtual scroll via `virtua/vue` em cada coluna (reusa primitiva do upstream).
- Drag entre colunas funciona com `vuedraggable`.
- Optimistic update + rollback em falha de rede (mock axios reject).
- `aria-live="polite"` na board anuncia transições.
- Polling 8s ativo.

### B.6 — Empty states + Loading

**Paths:**
- `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadEmptyState.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/StageEmptyState.vue`
- Skeleton em StageColumn enquanto `isLoading === true` (usa `.alg-skeleton--card` da Trilha D).

**Razão:** estados são designed (DESIGN.md §8).

**DoD:**
- Empty state global tem link Tab-focável apontando pra `/app/accounts/:id/settings/inboxes/new`.
- Skeleton respeita `prefers-reduced-motion: reduce`.

### B.7 — LeadDetailDrawer

**Path:** `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadDetailDrawer.vue`.

**Razão:** Click no card abre detalhe.

**DoD:**
- Mostra nome, contato (email/phone), canal de origem com ícone, histórico de stages (timestamps), conversa vinculada (link), observações editáveis inline.
- Edit inline → PATCH /leads/:id.
- Botão "Reabrir como novo Lead" quando stage é won/lost.
- Focus trap, Esc fecha, scrim click fecha.

### B.8 — PipelineConfigView

**Paths:**
- `app/javascript/dashboard/routes/dashboard/crm/views/PipelineConfigView.vue`
- `app/javascript/dashboard/routes/dashboard/crm/views/components/PipelineConfigForm.vue`.

**Razão:** A4/D10 — renomear stage + aging coefficient.

**DoD:**
- Inline rename → PATCH /stages/:id/rename.
- Input numérico de `aging_coefficient` por stage, validação client-side (≥0).
- Preview da escala (verde até X horas / amarelo até Y / vermelho após Z) recalculado em tempo real.
- Admin only no client-side (componente esconde para non-admin via store getter).

### B.9 — Routes wiring + Sidebar item

**Paths (engine zone + soft-fork):**
- `app/javascript/dashboard/routes/dashboard/crm/crm.routes.js` (novo, engine zone).
- `app/javascript/dashboard/routes/dashboard/dashboard.routes.js` — import + spread, tagged `// algorythmo: feature-gate algorythmo_crm`.
- `app/javascript/dashboard/components-next/Sidebar/Sidebar.vue` — novo bloco condicional com `useAlgorythmoFeatureGate('algorythmo_crm')`, tagged.
- `engines/algorythmo/bin/check-soft-fork-zone.sh` — entries novos.

**Razão:** sem rota e sem item de menu, nada do que B fez é alcançável.

**DoD:**
- Flag off → sidebar não mostra CRM, rota `/crm` 404 ou redirect (recomendado: redirect pra `/conversations` com toast — não mostrar 404 amador).
- Flag on → item visível, rota acessa.

### B.10 — ConversationCrmContext (mitigação ADR-0004)

**Paths:**
- `app/javascript/dashboard/routes/dashboard/crm/views/components/ConversationCrmContext.vue` (engine zone).
- `app/javascript/dashboard/modules/conversation/components/ConversationHeader.vue` (caminho real: confirmar via grep ou via descoberta no B.0 inventário) — bloco condicional tagged.

**Razão:** Founder não esquece que conversation e CRM são lentes do mesmo Lead.

**DoD:**
- Fetch `GET /leads?contact_id=X` (B.0 estendido) → mostra chip "{Lead nome} em {Stage nome}" + link "Ver no CRM" + menu "Vincular a outro Lead".
- Caso 0 results: mostra "Lead ainda não criado — aguarde a primeira mensagem" (raro mas possível em race).

### B.11 — Move modal (keyboard fallback)

**Path:** `app/javascript/dashboard/routes/dashboard/crm/views/components/MoveLeadModal.vue`.

**Razão:** T-B19 — keyboard-only consegue operar.

**DoD:**
- Aberto via menu ⋮ → "Mover para…".
- Lista de stages como radios, Enter aplica, Esc cancela.
- Mesmo backend call que drag (PATCH /move).
- Playwright spec keyboard-only valida.

### B.12 — i18n strings

**Paths:**
- `engines/algorythmo/app/javascript/i18n/overrides/en.json` — namespace `ALGORYTHMO_CRM.*`.
- `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json` — mesma estrutura, PT.

**DoD:**
- Sem strings hard-coded em componentes Vue (gate: lint rule `no-hardcoded-string` ou grep).
- `app/javascript/dashboard/i18n/i18n_overlay.spec.js` recebe teste validando que `ALGORYTHMO_CRM.KANBAN.TITLE` existe em ambos os locales.

### B.13 — A11y (axe + keyboard + screen reader)

**Paths:**
- Anotações em todos os componentes (`aria-label`, `aria-live`, `role`, `tabindex`).
- Playwright `e2e/crm.spec.ts` integra `@axe-core/playwright` (instalar dep — verificar com founder se já está; spec diz já em CI mas check).

**DoD:**
- axe-core retorna zero violations critical/serious WCAG AA em `/app/accounts/:id/crm` e `/crm/pipeline`.
- Smoke manual VoiceOver/NVDA: cards anunciam corretamente; transições anunciadas.
- Drag-by-keyboard NÃO está no MVP (D11 reduzido).
- Move modal funciona keyboard-only.

### B.14 — Playwright e2e suite

**Path:** `e2e/crm.spec.ts` (novo).

**Cenários (mínimo):**
1. flag `algorythmo_crm` off → CRM sidebar item ausente, navegação direta pra `/crm` redireciona.
2. flag on → CRM aparece. Click leva ao Kanban com 5 colunas vazias.
3. Mensagem nova via API stub → polling reflete em ≤10s.
4. Drag de Lead de "Novo" → "Qualificado" → DOM reflete imediatamente + persiste em refresh.
5. Drag em modo offline (mock 5xx) → rollback + toast.
6. Click no card → drawer abre, Esc fecha.
7. Lead em "Fechado ganho" → "Reabrir" cria novo em "Novo" com previous_lead_id.
8. PipelineConfig → rename "Proposta" → "Orçamento" → cards refletem.
9. Keyboard-only fluxo: Tab até card → Enter abre drawer → Esc fecha → Tab até menu ⋮ → Enter → "Mover para…" → modal → escolhe stage → Enter → card move.
10. axe-core zero violations.
11. Smoke spec: dashboard original ainda funciona com flag on/off (regressão).

**DoD:** todos passam no CI.

### B.15 — Smoke spec expansion

**Path:** `e2e/smoke.spec.ts` (edit).

**Cenário adicional:** `algorythmo_crm` off (default) → sidebar SEM "CRM"; flag on → sidebar COM "CRM". Não testa interno do Kanban — isso vai pra `crm.spec.ts`.

**Razão:** smoke valida M0 inalterado + feature gate funcional.

### B.16 — README + DESIGN.md updates

**Paths:**
- `engines/algorythmo/README.md` — soft-fork zone table com 5 entries novos.
- `engines/algorythmo/DESIGN.md` — seções 3.7-3.10 (Drawer, Menu, Toast, Avatar) e seção 4 já cobre LeadAgingChip (mas confirmar nada conflitar).

**DoD:** docs reflexa realidade. `bash check-soft-fork-zone.sh` continua verde.

---

## 6. Riscos & mitigações

| Risco | Severidade | Mitigação |
|---|---|---|
| **R1 — Vuedraggable não suporta drag-by-keyboard** | Alta | Aceito. Fallback "Mover para…" via menu (T-B19). D11 reduzido. Roadmap pós-MVP: substituir por dnd-kit ou custom. |
| **R2 — Polling 8s consome CPU em laptop modesto** | Baixa | Pause on `visibilityState !== 'visible'`. 5 stages × 1 req/8s = ~38 req/min. Tolerável. |
| **R3 — Race: drag durante polling clobber** | Média | Flag `_optimisticMove` na store; polling ignora Leads com flag. Coberto em spec. |
| **R4 — Cursor pagination com posições float colidindo** | Baixa | A.11 já trata: cursor é `(position, id)` — id é tie-breaker. Reuso de A. |
| **R5 — Vite alias `@algorythmo/styles` quebra build prod** | Média | Build E2E no CI roda `pnpm build` antes de e2e. Se quebrar, falha visível. Bem documentado em DESIGN.md §6.2. |
| **R6 — Sidebar bloco condicional vaza CSS no produto Captain** | Baixa | Padrão Captain já existe (algorythmo_show_captain). Bloco condicional `v-if` ou ternário `...(hasCrm ? [...] : [])` — render-free quando off. |
| **R7 — Soft-fork zone check não pega edits novos** | Alta se ignorada | B.1/B.9 estendem o script. CI gate. Se um arquivo novo entra no soft-fork sem entry no script, PR review pega. |
| **R8 — i18n overlay quebra se chave Algorythmo conflitar com upstream** | Baixa | Namespace dedicado `ALGORYTHMO_CRM.*` evita collision. Spec do overlay valida. |
| **R9 — LeadAgingChip divide por zero em stage com coef=0 (fechado)** | Crítica | Guarda F6 explícita ANTES de qualquer cálculo. Spec dedicada. |
| **R10 — Drawer focus trap quebra em browser velhos** | Baixa | `inert` attribute polyfill ou custom focus trap via `useFocusTrap` do @vueuse/core. Validar Chromium 100+, Firefox 100+. |
| **R11 — Drag em conjunto com `virtua/vue` (virtualizado)** | Média | vuedraggable não joga bem com virtualização — items fora do viewport não existem no DOM. **Mitigação:** virtualizar SÓ quando coluna >100 leads; abaixo disso, render flat. Se experiência ruim em colunas grandes, considerar `vue-virtual-scroll-list` que tem better drag support. |
| **R12 — Endpoint /pipelines/default não cacheia per-request** | Baixa | `Algorythmo::Pipeline.cached_default_for` já usa `cache_key_with_version`. Bem coberto. |
| **R13 — `axe-core/playwright` dep não instalada** | Bloqueante | B.13 inclui `pnpm add -D axe-core @axe-core/playwright`. Verificar precedente — plano 0001 §3 fala "axe-core/playwright em CI" mas pode não estar instalado ainda. |

---

## 7. Acceptance criteria

**Binário, pós-merge da B:**

1. **Soft-fork integrity:** `bash engines/algorythmo/bin/check-soft-fork-zone.sh` retorna 0. Inventário do README sincronizado com realidade.
2. **Backend regression:** `bundle exec rspec engines/algorythmo` passa. Cobertura A inalterada.
3. **Frontend regression:** `pnpm test` passa. Cobertura ≥90% composables/helpers, ≥75% Vue interaction.
4. **E2E:** `pnpm e2e` passa. Inclui `crm.spec.ts` + `smoke.spec.ts` atualizado.
5. **A11y:** axe-core 0 violations critical/serious WCAG AA em `/crm` e `/crm/pipeline`.
6. **Lint+typecheck:** `pnpm lint` + `bundle exec rubocop` verde.
7. **Build:** `pnpm build` produz bundle válido. Tamanho do bundle dashboard sobe ≤15% (sanity — adicionamos Kanban, Drawer, Menu, Toast, Avatar, useLead*; não deve passar disso).
8. **Critério funcional 1-10 da seção 2** todos validados manualmente pelo founder no laptop.

---

## 8. Sequência de PRs (PR-sized chunks ≤400 LOC cada)

Engineer agent abre PRs em ordem; cada um é mergeável independente (atrás dos anteriores).

| PR | Conteúdo | LOC estimado | Depende de |
|---|---|---|---|
| **B-PR1** | B.0 (backend patch: pipelines/default + contact embed + contact_id filter) | ~180 | M1-A merged (já está) |
| **B-PR2** | B.1 (Vite bridge + soft-fork check expansion) | ~80 | Trilha D merged (PR #37) |
| **B-PR3** | B.2 (composables core: store, api, polling) + B.3 (primitives Drawer/Menu/Toast/Avatar) | ~600 → quebrar em 2 sub-PRs se > 400 | B-PR2 |
| **B-PR4** | B.4 (LeadAgingChip + LeadCard + timeFormat) | ~300 | B-PR3 |
| **B-PR5** | B.5 (KanbanBoard + StageColumn + dragDrop) + B.6 (empty states) | ~500 → quebrar | B-PR4 |
| **B-PR6** | B.7 (LeadDetailDrawer) + B.8 (PipelineConfigView) | ~400 | B-PR5 |
| **B-PR7** | B.9 (routes + sidebar) + B.10 (ConversationCrmContext) + B.11 (MoveLeadModal) | ~250 | B-PR6 |
| **B-PR8** | B.12 (i18n) + B.13 (a11y) + B.14 (e2e crm.spec) + B.15 (smoke update) + B.16 (docs) | ~400 | B-PR7 |

**Total estimado:** ~2.7K LOC + ~400 LOC de teste. Trilha B é a maior trilha do MVP.

**Regra de quebra:** se um PR cresce >400 LOC, engineer quebra em sub-PRs por componente (ex: B-PR3a composables, B-PR3b primitives). Founder não precisa autorizar a quebra — é decisão do engineer.

**Adversarial-reviewer obrigatório** em B-PR5 (KanbanBoard — coração da feature) e B-PR8 (a11y + e2e — porta de saída).

---

## 9. Migration path (se aplicável)

**Não há migração de dados.** Trilha A já criou o schema. Trilha B é UI sobre dados existentes.

**Feature flag rollout:** flag `algorythmo_crm` segue default `false`. Founder vira `true` no admin do Chatwoot quando quer testar. Sem big-bang; tudo gated.

**Upstream sync:** após B mergear, próximo sync mensal vai conflitar nos 5 arquivos do soft-fork zone. Tagged comments tornam o conflito trivial de resolver. Não há sem-conflito limpo possível — é o custo aceito de A2-front.

---

## 10. Open questions (pro founder)

Apenas decisões de PRODUTO. Tudo técnico já decidi acima.

1. **Q-B1 — Drag mobile?** B exclui mobile (<768px) do escopo. Confirma que MVP rodando no laptop é suficiente? Roadmap pós-MVP transforma em lista vertical. **Default proposto:** sim, fora do MVP.
2. **Q-B2 — Polling 8 segundos é "instantâneo o suficiente" pro founder operando?** Alternativa é ActionCable (3x mais código, mas push real). **Default proposto:** 8s no MVP, ActionCable é roadmap.
3. **Q-B3 — Drag-and-drop entre Leads na MESMA stage (reordenar)?** Anatomia do card não mostra position visible; é só dado interno. Permitir reorder dentro da stage (drag vertical) adiciona ~50 LOC + 1 spec. **Default proposto:** sim — incluir reorder na mesma stage, sem custo significativo, e melhora UX (operador organiza prioridade).
4. **Q-B4 — Quando flag CRM off, rota `/crm` deve mostrar 404 ou redirect silencioso pra `/conversations`?** **Default proposto:** redirect com toast informativo "CRM não está habilitado para esta conta". 404 é amador.
5. **Q-B5 — `LeadDetailDrawer` mostra histórico de conversas vinculadas. Quantas? Todas? Últimas 10?** **Default proposto:** últimas 10 + link "Ver todas no Conversations". Lista completa fica em Conversations onde o componente já existe.
6. **Q-B6 — Empty state copy fixa em português ou bilingue (en + pt_BR)?** **Default proposto:** ambos via i18n overlay, com pt_BR como tradução primária editorial e en como fallback.

Se founder não responder em 24h, engineer prossegue com defaults acima.

---

## 11. Handoff

O `engineer` agent recebe este doc. Implementa B-PR1 → B-PR8 na ordem. Cada PR roda `/review` + `/cso` + `/qa-only`. B-PR5 e B-PR8 recebem adversarial-reviewer adicional.

Se algo aqui ficar ambíguo durante implementação:
- Pergunta técnica → volta pro `planner`, não pro founder.
- Pergunta de produto fora das §10 acima → volta pro founder.

**Pronto pra dispatch.**
