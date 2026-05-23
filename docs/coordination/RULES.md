# Regras de coordenação — inegociáveis

Toda sessão executora (B, C, D) DEVE respeitar estas regras. Violação = PR rejeitado.

## R1 — Worktree exclusivo

Cada sessão trabalha em seu próprio worktree git, criado no início:

```bash
git fetch origin
git worktree add ../algorythmo-<letra> -b <branch_name> origin/algorythmo/main
cd ../algorythmo-<letra>
```

Sessões NUNCA editam fora do próprio worktree. Sessões NUNCA fazem `git checkout` no diretório principal.

## R2 — Domínio de arquivos exclusivo

Cada briefing lista **arquivos permitidos** (apenas estes podem ser editados/criados) e **arquivos proibidos** (NUNCA tocar). Se a sessão descobrir que precisa tocar arquivo proibido, ela **PARA** e pede ao humano levar à Sessão A.

## R3 — Sem decisão de produto

Sessões executoras NÃO inventam comportamento, NÃO escolhem entre alternativas, NÃO assumem premissas. Dúvida = PR aberto com `[BLOCKED]` no título + comentário descrevendo a dúvida.

## R4 — PR único por sessão por entrega

Cada sessão abre **1 PR por entrega**, com título no formato:

```
<tipo>(<escopo>): <descrição curta>
```

Tipos válidos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
Body do PR obrigatório: `## Summary` + `## Test plan` + referência ao plano (`Implementa task X.Y de docs/plans/000N-...`).

## R5 — CI verde como pré-requisito de merge

Nenhum merge acontece sem CI verde. Se CI falhar, sessão executora investiga, corrige no MESMO PR (novo commit), espera ficar verde. Sem `--no-verify`, sem bypass.

## R6 — Adversarial review obrigatório

Após CI verde, sessão executora chama:

```
Use Agent tool with subagent_type "adversarial-reviewer" to review this PR
```

E aguarda o relatório. Issues `critical`/`high` viram commits de correção no mesmo PR. Apenas após adversarial-reviewer aprovar (ou só apontar `low`/`info`), a sessão sinaliza ao humano que está pronto pra merge.

## R7 — Ordem de merge é decidida pela Sessão A

Quando 2+ PRs estiverem prontos, NUNCA mergear sem sinal verde da Sessão A. A ordem é importante porque define rebase strategy.

## R8 — Sinalização de conclusão

Quando o PR estiver pronto pra merge (CI verde + adversarial aprovou):
1. Sessão executora deixa comentário no PR: `READY_FOR_MERGE — aguardando Sessão A`.
2. Humano avisa Sessão A.
3. Sessão A coordena merge e atualiza `STATUS.md`.

## R9 — Conflito de premissa = parar

Se uma sessão descobrir que premissa do briefing não bate com a realidade do código (ex: arquivo apontado não existe, contrato mudou, etc.), ela **PARA**, abre PR `[BLOCKED]` com explicação, espera Sessão A replanejar.

## R10 — Sem deletar nem renomear de outros worktrees

Sessão NUNCA mexe em worktrees de outras sessões (mesmo que pareça "tarde demais"). Sessão NUNCA mexe no diretório principal (`C:\Users\gusta\dev\Fork Chatwoot`).
