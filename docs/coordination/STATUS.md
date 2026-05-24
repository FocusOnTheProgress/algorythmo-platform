# STATUS — quadro vivo das sessões

> **Mantenedor:** Sessão A (orquestradora). Atualizado em tempo real conforme PRs abrem, CI fecha, adversarial revisa, merge acontece.

**Última atualização:** 2026-05-24 (sessão A continua) — PR #49 (C.2) **adversarial pass 4 DONE** em `49cbdab41` (5 carry-over: menu coalesce tuple, reflow helper, toast singleton cleanup, dead-guard removido, swallow-silencioso spec — 77/77 verde, adversarial LGTM). PR #50 (D) commit `fda1e7013` endereçou 5 CRITICAL + 6 HIGH (1ª rodada). PR #49 aguarda PR #50 ficar pronto antes do merge conjunto.

---

## Sessões ativas

| Agente | Worktree | Branch | Tarefa atual | Status | PR |
|---|---|---|---|---|---|
| **A** (orquestradora) | `Fork Chatwoot/` (main) | `algorythmo/main` | Monitora C.2 + D, despacha adversarial pós-PR | 🟢 em execução | — |
| **C.2** (engineer agent) | `algorythmo-c-onda2/` | `algorythmo/m1b-kanban` | KanbanBoard + StageColumn + rota `/crm` + sidebar + i18n + drag composable + MoveLeadModal | 🟡 em construção | — |
| **D** (engineer agent) | `algorythmo-d/` | `algorythmo/m1b-playwright-suite` | 9 specs Playwright contra CONTRACT v1.0.0, com `.skip()` até C.2 mergear | 🟡 em construção | — |

**Contrato compartilhado C↔D:** [`docs/coordination/CONTRACT_M1B.md`](CONTRACT_M1B.md) v1.0.0. Single source of truth pros selectors/aria.

---

## 🟢 Próxima sessão — leia isto primeiro

**O que está no ar agora:**
- ✅ PR #47 mergeado em `8d81b789e` (2026-05-24 15:09Z) — 13 sidebar gates + route guards.
- ✅ PR #48 mergeado em `8b74e0516` (2026-05-24 15:10Z) — B.4: timeFormat + LeadAgingChip + LeadCard.
- 🟡 C.2 e D despachados em worktrees independentes via engineer agent (paralelo).

**Workflow ativo:**
1. Aguardar engineer C.2 abrir PR. Spawn adversarial-reviewer + codex (segunda opinião). Endereçar HIGH.
2. Aguardar engineer D abrir PR. Spawn adversarial-reviewer + codex. Mergear após C.2 (D depende do contrato, mas independente de código).
3. Pós-merge C.2: PR follow-up removendo `.skip()` da suite D.

**Histórico do dispatch:**

**Passo 2 — PR C.2 (Kanban + rota):**
- Worktree: reaproveitar `C:/Users/gusta/dev/algorythmo-c-onda2` OU criar `algorythmo-c-onda3`. Sincronizar com `algorythmo/main` após merges:
  ```bash
  cd "C:/Users/gusta/dev/algorythmo-c-onda2"
  git checkout algorythmo/main && git pull
  git checkout -b algorythmo/m1b-kanban
  ```
- Scope (manter sob ~700 LOC; se passar, dividir em C.2a/C.2b):
  - `routes/dashboard/crm/views/KanbanBoard.vue` (`data-testid="crm-kanban-view"` + `kanban-header` + `kanban-board`)
  - `routes/dashboard/crm/views/components/StageColumn.vue` (`data-stage-id`, `data-stage-kind`, header/list, empty per-coluna)
  - `routes/dashboard/crm/views/components/KanbanEmptyState.vue` (global)
  - `routes/dashboard/crm/views/components/MoveLeadModal.vue` (`role="dialog"` + radio por stage)
  - `composables/algorythmo/useDragLead.js` (HTML5 drag + aria-live announce)
  - `routes/dashboard/crm/crm.routes.js` + entrada em `dashboard.routes.js` (gated por `algorythmo_crm` enable flag, **não cut**)
  - Sidebar entry em `components-next/sidebar/Sidebar.vue` (vai conflitar com #47; rebase primeiro)
  - `i18n/locale/pt_BR/algorythmoCrm.json` + chave `ALGORYTHMO_CRM.*`
  - Specs vitest pra StageColumn, KanbanBoard, MoveLeadModal, useDragLead
- Quality gates: vitest, eslint (`./node_modules/.bin/eslint --fix <files>`), `bash engines/algorythmo/bin/check-soft-fork-zone.sh`.
- Workaround conhecido: o worktree precisa de `pnpm add -D postcss-import` (transitivo missing) — **NÃO commit** o diff de `package.json`/`pnpm-lock.yaml`, revertê-los antes do `git add` (mesmo procedimento usado em C.1).
- Abrir PR contra `algorythmo/main`. Spawn `adversarial-reviewer`. Endereçar HIGH antes do merge.

**Passo 3 — PR D (Playwright suite):**
- Pode começar **em paralelo** com C.2 (não depende do código, só do contrato).
- Worktree: `C:/Users/gusta/dev/algorythmo-d` ou novo. Branch `algorythmo/m1b-playwright-suite` a partir de `algorythmo/main` após #47/#48 mergearem.
- Reescrever os 9 specs em `spec/system/algorythmo/crm/` contra CONTRACT v1.0.0. Manter `test.describe.skip(...)` em todos enquanto C.2 não merge — depois remover skip em PR follow-up.
- Cobertura mínima: kanban load + empty state global + drag drop + keyboard fallback (MoveLeadModal) + aging chip dual-coding + drawer open/close + reabrir-lead + paginação de conversas + aria-live announce.

**Workflow padrão (não esquecer):**
1. Cada PR passa por `adversarial-reviewer` antes de mergear (memória: founder não revisa código).
2. Endereçar todos HIGH; MEDIUMs decidir caso a caso.
3. Commit usar HEREDOC + `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.
4. PR criado com `--repo FocusOnTheProgress/algorythmo-platform` explícito.

## Fase 1 — encerrada

- ✅ PR #44 (D) mergeado em 80f4d9e3 (2026-05-23 22:45) — M1-B test harness + docs.
- ✅ PR #45 (C) mergeado em e8b65089 (2026-05-24 00:46) — M1-B base (SCSS bridge, composables, primitives).
- ✅ PR #43 (B) mergeado em 74ff54b0 (2026-05-24 03:02) — M2 foundation (15-flag bitmask em coluna isolada, painel super-admin, migração de Captain/CRM, frontend delegation).

### Follow-ups pós-merge

- Tracking issue **#46** — 11 itens não-bloqueantes de adversarial (M2-FLW-001 a M2-FLW-011): with_lock concorrência, spec coverage extra, hygiene de fixture/migration, audit log futuro.

---

## Pipeline de tarefas

### Fase 1 — Disparo simultâneo (agora)
- [ ] **B** → M2 foundation (PR 1) — pré-requisito de M2 Onda 2
- [ ] **C** → M1-B base (PR 2) — pré-requisito de M1-B componentes
- [ ] **D** → M1-B test harness + docs (PR 3) — paralelo a C, independente

### Fase 2 — Em execução (Sessão A reassumiu sequencial 2026-05-24)
- [x] **B** → PR #47 aberto, READY_FOR_MERGE. M2 Onda 2 sidebar gates (13 cuts) + route guards + dev-warn + coverage spec.
- [x] **C.1** → PR #48 aberto, READY_FOR_MERGE. B.4 isolado: `timeFormat` helper, `LeadAgingChip`, `LeadCard`. 42 vitest specs verdes. Adversarial H1+H2+H3 resolvidos em `d3353af1d`.
- [ ] **C.2** → KanbanBoard + StageColumn + rota `/crm` + sidebar entry + i18n pt_BR + drag composable + MoveLeadModal + empty states. **Aguarda #48 mergear** pra rebasar branch nova `algorythmo/m1b-kanban`.
- [ ] **D** → 9 specs Playwright contra CONTRACT v1.0.0, com `.skip()` no topo até C.2 mergear. Pode começar paralelo a C.2 (lê só o contrato, não o código).

### Fase 3 — Convergência final
- [ ] **B** → M2 batch 1 Playwright assertions — valida toggle de cada flag
- [ ] **D** → remove `.skip()` da suite Playwright após C.2 mergear
- [ ] **A** → fechar tracking issue #46 (follow-ups M2-FLW-001..011) conforme cada um for endereçado

---

## Domínios de arquivos (quem pode tocar o quê)

### Sessão B (M2 cortes)
**Permitido:**
- `config/features.yml` (adicionar 13 flags `algorythmo_*`)
- `lib/algorythmo/feature_gate.rb` (NOVO — helper Ruby)
- `app/javascript/dashboard/helper/algorythmoFeatureFlags.js` (NOVO — helper JS)
- `spec/system/algorythmo/cuts/_fixture.ts` (NOVO — Playwright fixture)
- `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (APENAS na Fase 2 — Onda 2)
- Route files listados em `docs/plans/cuts.md` (APENAS na Fase 2 — Onda 2)

**Proibido:**
- Qualquer arquivo em `app/javascript/dashboard/routes/dashboard/crm/` (domínio de C)
- Qualquer arquivo em `app/javascript/dashboard/components-next/crm/` (domínio de C)
- Qualquer spec em `spec/system/algorythmo/crm/` (domínio de D)

### Sessão C (M1-B base + componentes CRM)
**Permitido:**
- `app/javascript/dashboard/store/modules/algorythmo/` (NOVO)
- `app/javascript/dashboard/api/algorythmo/` (NOVO)
- `app/javascript/dashboard/composables/algorythmo/` (NOVO)
- `app/javascript/dashboard/components-next/algorythmo/primitives/` (NOVO)
- `app/javascript/dashboard/components-next/algorythmo/crm/` (NOVO)
- `app/javascript/dashboard/routes/dashboard/algorythmo/crm/` (NOVO)
- `app/javascript/dashboard/assets/scss/algorythmo-bridge.scss` (NOVO)
- `vite.config.ts` (SOFT-FORK — apenas alias `@algorythmo`)

**Proibido:**
- `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (B na Fase 2)
- `config/features.yml` (B)
- `app/javascript/dashboard/helper/algorythmoFeatureFlags.js` (B)
- `spec/system/algorythmo/cuts/` (B)

### Sessão D (M1-B test harness + docs)
**Permitido:**
- `spec/system/algorythmo/crm/` (NOVO — Playwright scaffolds)
- `spec/javascript/algorythmo/crm/` (NOVO — Vitest scaffolds)
- `docs/algorythmo/crm/README.md` (NOVO ou edição em arquivo próprio)
- `docs/algorythmo/crm/DESIGN.md` (NOVO)
- `playwright.config.ts` (SOFT-FORK — apenas adicionar project `algorythmo-crm` se necessário)
- `vitest.config.ts` (SOFT-FORK — apenas adicionar include se necessário)

**Proibido:**
- Qualquer código de produção (`app/javascript/dashboard/**/*.vue`, `app/javascript/dashboard/**/*.js`)
- `spec/system/algorythmo/cuts/` (B)
- Componentes CRM em si (C)

---

## Decisões pendentes

Nenhuma no momento. Qualquer dúvida levantada em PR `[BLOCKED]` por B/C/D aparece aqui.

---

## Histórico de merges (Algorythmo)

| PR | Título | Mergeado em | Sessão |
|---|---|---|---|
| #34 | M0+M0.5 foundation + rebrand | 2026-05-23 13:11 | (pré-coordenação) |
| #36 | M1-A CRM backend | 2026-05-23 14:19 | (pré-coordenação) |
| #37 | M1-D design system | 2026-05-23 20:14 | (pré-coordenação) |
| #42 | M1-B.0 backend patch | 2026-05-23 15:30 | (pré-coordenação) |
| #35 | M2-C.1 cuts inventory | 2026-05-23 20:21 | (pré-coordenação) |
| #44 | M1-B test harness + docs (B.13+B.14+B.16) | 2026-05-23 22:45 | D |
| #45 | M1-B base — SCSS bridge + composables + primitives | 2026-05-24 00:46 | C |
| #43 | M2-C.2 foundation de feature gates | 2026-05-24 03:02 | B |

| #47 | M2-C.3 Onda 2 — 13 sidebar gates + route guards | 2026-05-24 15:09Z | A (executou B) |
| #48 | M1-B/B.4 — LeadAgingChip + LeadCard + timeFormat | 2026-05-24 15:10Z | A (executou C.1) |

### Em construção (Fase 2 final)

| Branch | Worktree | Sessão | Escopo |
|---|---|---|---|
| `algorythmo/m1b-kanban` | `algorythmo-c-onda2` | C.2 (engineer agent) | KanbanBoard + StageColumn + MoveLeadModal + rota /crm + sidebar entry + i18n + drag composable |
| `algorythmo/m1b-playwright-suite` | `algorythmo-d` | D (engineer agent) | 9 specs Playwright contra CONTRACT v1.0.0 (`.skip()` até C.2 mergear) |
