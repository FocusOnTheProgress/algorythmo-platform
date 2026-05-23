# Briefing — Sessão D (executora)

> **Como usar:** abra uma nova janela de Claude Code no diretório `C:\Users\gusta\dev\Fork Chatwoot`, no branch `algorythmo/main`. Cole TODO este documento (do `---` em diante) como primeira mensagem.

---

Você é a **Sessão D** num esquema de 3 sessões paralelas de Claude Code coordenadas pela Sessão A (orquestradora) no projeto Algorythmo OS (fork de Chatwoot).

## Leia primeiro

1. `docs/coordination/README.md` — topologia geral.
2. `docs/coordination/RULES.md` — regras inegociáveis.
3. `docs/coordination/STATUS.md` — sua linha é "Sessão D", seu domínio de arquivos está listado.
4. `docs/plans/0002-m1-trilha-b-frontend-crm.md` §5 B.13 + B.14 + B.16 — suas tasks.
5. `docs/plans/0001-mvp-algorythmo-os.md` §3 M1 critério de aceite (incluindo D11 — a11y baseline).

## Setup do worktree (primeira coisa a fazer)

```bash
git fetch origin
git worktree add ../algorythmo-d -b algorythmo/m1b-test-harness origin/algorythmo/main
cd ../algorythmo-d
```

A partir daqui, todo trabalho é em `C:\Users\gusta\dev\algorythmo-d\`.

## Sua tarefa — M1-B Test Harness + Docs (PR #3)

**Objetivo:** estabelecer scaffolding de testes e documentação do CRM frontend. Esta PR NÃO testa nada de feature ainda (componentes não existem) — define ESTRUTURA dos testes que vão validar o trabalho de C nas próximas fases.

### Escopo

1. **B.14 — Playwright e2e suite scaffold** (`docs/plans/0002-m1-trilha-b-frontend-crm.md` §5 B.14)
   - Criar `spec/system/algorythmo/crm/_fixture.ts` com helpers de setup (criar account de teste com `algorythmo_crm: true`, seed de leads, login do admin).
   - Criar arquivos de spec VAZIOS com `describe()` + `test.skip()` (ou `test.fixme()`) listando todos os cenários do critério de aceite M1 §3:
     - `auto_create_lead.spec.ts` — D6 auto-create por canal (widget, WhatsApp, email, Instagram)
     - `kanban_drag_and_drop.spec.ts` — arrastar Lead entre stages
     - `reopen_lead.spec.ts` — reabrir Lead fechado
     - `idempotency.spec.ts` — segunda mensagem do mesmo contato não duplica Lead
     - `empty_state.spec.ts` — primeiro acesso sem Leads
     - `a11y_keyboard.spec.ts` — Tab/Enter/Esc no Kanban
     - `a11y_screen_reader.spec.ts` — `aria-live` anuncia move
     - `aging_dual_coding.spec.ts` — chip mostra cor + glyph
     - `pipeline_rename.spec.ts` — renomear stage atualiza cards

   Cada spec tem cabeçalho explicando o cenário e referenciando o critério do plano. `test.skip()` deixa CI verde até C implementar e D habilitar.

2. **B.13 — A11y harness** (§5 B.13)
   - `playwright.config.ts` ganha project `algorythmo-a11y` que roda `@axe-core/playwright` (caso ainda não exista — verificar antes de adicionar).
   - Spec base `spec/system/algorythmo/crm/_a11y_smoke.spec.ts` que carrega a página `/crm` (vai 404 até C wirear rota, mas é OK — usa `test.skip` por enquanto) e roda axe.
   - Documentar em `docs/algorythmo/crm/A11Y.md` quais critérios WCAG AA são gate de PR e quais são roadmap.

3. **B.16 — README + DESIGN.md** (§5 B.16)
   - `docs/algorythmo/crm/README.md` — visão geral do CRM frontend (arquitetura, store, componentes, fluxo de auto-create). Resumo de M1 escrito pra dev que pegar o código depois.
   - `docs/algorythmo/crm/DESIGN.md` — referencia tokens do design system PR #37, mostra anatomia do card (D5), mostra escala de aging (D10), mostra empty state.

4. **Vitest scaffold** — `spec/javascript/algorythmo/crm/` com placeholders `describe.skip()` pros componentes que C vai criar (LeadCard, KanbanBoard, etc.).

### Arquivos PROIBIDOS

NÃO toque:
- Qualquer arquivo `.vue` em produção (`app/javascript/dashboard/**/*.vue`)
- Qualquer arquivo `.js`/`.ts` em produção fora de `spec/` e `docs/`
- `config/features.yml` (Sessão B)
- `spec/system/algorythmo/cuts/` (Sessão B)
- Componentes em `app/javascript/dashboard/components-next/algorythmo/` (Sessão C)

Você só toca `spec/`, `docs/`, e — se necessário — `playwright.config.ts` / `vitest.config.ts` (SOFT-FORK, comentar com `// algorythmo: test-harness-m1b`).

### Critério de aceite

- [ ] Todos os specs scaffold rodam com `test.skip()` e CI fica verde.
- [ ] `pnpm playwright test --list` mostra os ~9 cenários esperados.
- [ ] `docs/algorythmo/crm/README.md` cobre arquitetura, store, fluxo de auto-create, link pra D5/D10/D11.
- [ ] `docs/algorythmo/crm/DESIGN.md` cita tokens do PR #37 por nome.
- [ ] `docs/algorythmo/crm/A11Y.md` lista critérios WCAG AA que viram gate.
- [ ] CI verde.
- [ ] Adversarial-reviewer aprovou.

### Padrão de PR

**Título:** `chore(M1-B): test harness + docs scaffolding (B.13 + B.14 + B.16)`

**Body:**
```markdown
## Summary
Entrega das tasks B.13 + B.14 + B.16 de `docs/plans/0002-m1-trilha-b-frontend-crm.md`.

Estabelece scaffold de testes Playwright/Vitest + docs do CRM frontend. Specs ficam `.skip()` até Sessão C implementar componentes (Fase 2).

- B.14: ~9 specs Playwright em `spec/system/algorythmo/crm/` + fixture compartilhada
- B.13: A11y harness com axe-core + critérios WCAG AA documentados
- B.16: README + DESIGN.md + A11Y.md em `docs/algorythmo/crm/`

## Test plan
- [ ] CI verde com specs `.skip()`
- [ ] Adversarial-reviewer aprovou
- [ ] `pnpm playwright test --list` mostra os cenários esperados
- [ ] Vai pra Fase 2 — Sessão D habilita specs conforme Sessão C entrega componentes
```

### Fluxo até merge

1. Implementa scaffolds + docs.
2. Roda `pnpm playwright test --list` pra confirmar coleta.
3. Push da branch, abre PR.
4. Espera CI.
5. Chama adversarial-reviewer.
6. Corrige issues `critical`/`high`.
7. Comenta `READY_FOR_MERGE — aguardando Sessão A`.
8. PARA.

### Após merge da PR #3

Sessão A te notifica. Você puxa main, recebe briefing da **Fase 2** (habilitar specs conforme C entrega componentes) via novo prompt.

### Regras finais

- Você NÃO escreve código de produção. Apenas testes, scaffolds, docs.
- Especs vivos só quando o que eles testam existir (=> sempre `.skip()` inicialmente).
- Nenhuma decisão de produto sem PR `[BLOCKED]`.
- Se conflitar com B ou C, PARA.
