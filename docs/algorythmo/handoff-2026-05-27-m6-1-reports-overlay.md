# Handoff — sessão 2026-05-27 → próxima sessão

## Estado do projeto

Plano `docs/plans/0005-admin-os-frontend.md` **100% shippado**. M5 até M9 fechados em `algorythmo/main`. Última PR mergeada: #75 (M9 ReplyBox read-only + ContactImportDialog microcopy).

## Próximo bloco

**M6.1 — Relatórios Comerciais (overlay sobre o que já existe).**

Contexto trancado em sessões anteriores (ver memory):
- M5 renomeou Reports → "Relatórios Comerciais" e o entry point já está no bloco GESTÃO da sidebar.
- A tela de Reports é Chatwoot upstream — overview, conversation, agent, label, etc.
- O recorte do admin Algorythmo é "comercial": foco em pipeline, conversão, canal de origem, agentes Manu. Não substitui Reports — é uma camada de leitura por cima.

O que **falta decidir** antes do código (input pro `/office-hours` / planner):
1. Overlay = nova rota dedicada (`/reports/commercial`) ou aba dentro da Reports overview existente?
2. KPIs canônicos do PME comercial — qual é o equivalente do "Operações Anchor" (estoque/giro) mas pra vendas? Pipeline value? Conversão por canal? Lead time até primeira resposta?
3. Drill-down: por canal? por agente Manu? por período?
4. Relação com o `SectorDashboard` de Marketing e o `CRM` (futuros). Há sobreposição? Quem é fonte da verdade?

## Como iniciar a próxima sessão

Use este prompt:

> Vamos planejar M6.1 — Relatórios Comerciais overlay para a tela do administrador da Algorythmo OS. Plano 0005 (M5–M9) já foi shippado; este é o próximo bloco. Acione o planner agent — rodar `/office-hours` antes (4 perguntas em `docs/algorythmo/handoff-2026-05-27-m6-1-reports-overlay.md`), depois `/plan-design-review` + `/plan-eng-review`. Output: plano `docs/plans/0006-reports-commercial-overlay.md`. Memory de contexto: `project_admin_os_frontend_d1_d6.md` e `project_admin_os_frontend_m5_m9_closed.md`.

## Dívida consciente (não esquecer, não é urgente)

**Backend policy `MessagesController`** — fechar a porta server-side do M9. Hoje admin com curl ainda envia mensagem; ReplyBox read-only é só UX nudge. Decisão de tratar como follow-up está em memory (`project_admin_os_frontend_m5_m9_closed.md`).

## Worktrees ativos (pode limpar quando quiser)

Todos os branches abaixo já foram mergeados — worktrees podem ser removidas:
- `.claude/worktrees/m6-pr6b-skeleton` (PR #73)
- `.claude/worktrees/m6-0-operacao` (PR #74)
- `.claude/worktrees/m6-derived` (PR #76)
- `.claude/worktrees/m9-readonly` (PR #75)
- `.claude/worktrees/m7-clevels` (PR #70)
- `.claude/worktrees/m8b-brain-upload` (mergeado antes)
- `.claude/worktrees/agent-*` (locked, agents antigos)

Comando: `git worktree remove <path>` por path, depois `git branch -D <branch>` localmente.
