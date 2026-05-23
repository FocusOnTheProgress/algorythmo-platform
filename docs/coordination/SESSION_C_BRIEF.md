# Briefing — Sessão C (executora)

> **Como usar:** abra uma nova janela de Claude Code no diretório `C:\Users\gusta\dev\Fork Chatwoot`, no branch `algorythmo/main`. Cole TODO este documento (do `---` em diante) como primeira mensagem.

---

Você é a **Sessão C** num esquema de 3 sessões paralelas de Claude Code coordenadas pela Sessão A (orquestradora) no projeto Algorythmo OS (fork de Chatwoot).

## Leia primeiro

1. `docs/coordination/README.md` — topologia geral.
2. `docs/coordination/RULES.md` — regras inegociáveis.
3. `docs/coordination/STATUS.md` — sua linha é "Sessão C", seu domínio de arquivos está listado.
4. `docs/plans/0002-m1-trilha-b-frontend-crm.md` — plano completo de M1-B (CRM frontend). **Você implementa tasks B.1 + B.2 + B.3.**
5. `docs/plans/0001-mvp-algorythmo-os.md` §3 M1 + ADRs 0004 + 0008 — contexto do CRM.

## Setup do worktree (primeira coisa a fazer)

```bash
git fetch origin
git worktree add ../algorythmo-c -b algorythmo/m1b-base origin/algorythmo/main
cd ../algorythmo-c
```

A partir daqui, todo trabalho é em `C:\Users\gusta\dev\algorythmo-c\`.

## Sua tarefa — M1-B Base (PR #2)

**Objetivo:** estabelecer a fundação do frontend CRM (Kanban) — bridge SCSS, composables (store + api + polling), primitives (Drawer, Menu, Toast, Avatar). Esta PR NÃO renderiza Kanban ainda — só constrói os blocos de base.

### Escopo (tasks do plano 0002)

Implemente, na ordem:

1. **B.1 — Bridge SCSS** (`docs/plans/0002-m1-trilha-b-frontend-crm.md` §5 B.1)
   - Vite alias `@algorythmo` apontando pra `app/javascript/dashboard/components-next/algorythmo/`.
   - Arquivo SCSS bridge `app/javascript/dashboard/assets/scss/algorythmo-bridge.scss` reaproveitando tokens do design system (PR #37) sem reimportar SCSS upstream do Chatwoot.

2. **B.2 — Composables core** (§5 B.2)
   - Store Pinia (ou Vuex, conforme padrão do upstream — verifique antes) em `app/javascript/dashboard/store/modules/algorythmo/leads.ts`.
   - API client em `app/javascript/dashboard/api/algorythmo/leadsApi.ts` consumindo os endpoints listados no plano 0002 §1.1.
   - Composable `useLeadsPolling` em `app/javascript/dashboard/composables/algorythmo/useLeadsPolling.ts`.
   - Cursor pagination respeitada (P2 — sem offset).

3. **B.3 — Primitives** (§5 B.3) — todos em `app/javascript/dashboard/components-next/algorythmo/primitives/`:
   - `AlgoDrawer.vue` (LeadDetailDrawer vai consumir)
   - `AlgoMenu.vue` (⋮ dropdown do card)
   - `AlgoToast.vue` (feedback de move/error)
   - `AlgoAvatar.vue` (foto do canal no card)

   Cada primitive: keyboard navigation, `aria-*` apropriados, ≥75% cobertura Vitest com interaction tests.

### Arquivos PROIBIDOS

NÃO toque:
- `config/features.yml` (Sessão B)
- `app/javascript/dashboard/helper/algorythmoFeatureFlags.js` (Sessão B)
- `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (Sessão B na Fase 2)
- Nenhum route file existente (B.9 fica pra Fase 3, depois de M2 mergear)
- `spec/system/algorythmo/cuts/` (Sessão B)
- `spec/system/algorythmo/crm/` (Sessão D)

### Critério de aceite

- [ ] Vite build passa com alias `@algorythmo`.
- [ ] Bridge SCSS importa sem warnings.
- [ ] Store + API + composable: ≥90% Vitest (são puros — não interaction-heavy).
- [ ] Primitives: ≥75% Vitest com cobertura de interação (Tab, Enter, Esc, click outside).
- [ ] `@axe-core/playwright` (se já configurado em #37) reporta zero violations `critical`/`serious` pros primitives renderizados em isolation.
- [ ] CI inteiro verde (lint, RSpec, Vitest, Playwright smoke, soft-fork integrity).
- [ ] Adversarial-reviewer aprovou ou só apontou `low`/`info`.

### Padrão de PR

**Título:** `feat(M1-B): base — SCSS bridge + composables + primitives Drawer/Menu/Toast/Avatar`

**Body:**
```markdown
## Summary
Entrega das tasks B.1 + B.2 + B.3 de `docs/plans/0002-m1-trilha-b-frontend-crm.md`.

Base do frontend CRM (Kanban) — esta PR não renderiza Kanban; estabelece a fundação que B.4 (LeadCard) + B.5 (KanbanBoard) vão consumir.

- B.1: Vite alias `@algorythmo` + SCSS bridge usando design system PR #37
- B.2: Store + API + composable de leads (cursor-paginated, polling)
- B.3: Primitives `AlgoDrawer`, `AlgoMenu`, `AlgoToast`, `AlgoAvatar` (a11y baseline)

## Test plan
- [ ] CI verde
- [ ] Adversarial-reviewer aprovou
- [ ] Vitest interaction cobre Tab/Enter/Esc nos primitives
- [ ] Vai pra Fase 2 — mesma Sessão C implementa B.4 a B.8 usando esses primitives
```

### Fluxo até merge

1. Implementa B.1 → B.2 → B.3 nessa ordem.
2. Roda `pnpm vitest run`, `pnpm playwright test --grep="primitives"` localmente.
3. Push da branch, abre PR no fork com base `algorythmo/main`.
4. Espera CI.
5. Se CI verde: chama `Use Agent tool with subagent_type "adversarial-reviewer" to review this PR rigorously`.
6. Corrige issues `critical`/`high` no MESMO PR.
7. Quando adversarial aprovou: comenta `READY_FOR_MERGE — aguardando Sessão A`.
8. PARA. Avisa humano.

### Após merge da PR #2

Sessão A te notifica. Você puxa main, recebe briefing da **Fase 2** (componentes CRM B.4 → B.8) via novo prompt.

### Regras finais

- Nenhuma decisão de produto sem perguntar à Sessão A via PR `[BLOCKED]`.
- Use o design system do PR #37 (tokens já estão disponíveis via `@algorythmo` alias após você criar o bridge).
- Se conflitar com B ou D, PARA imediatamente.
