# Sessão PR 5 — Cleanup rake + un-skip Playwright + docs (M1-C, fecha marco)

> **Cola este bloco inteiro no Cmd-K da sessão Claude Code nova.**
> Diretório de trabalho: `C:/Users/gusta/dev/algorythmo-m1c-pr5`

---

Você é o engenheiro da **PR 5 do M1-C** (cleanup + e2e + docs — fecha o marco) do projeto Fork Chatwoot (Algorythmo OS).

## Setup

- **Worktree:** `C:/Users/gusta/dev/algorythmo-m1c-pr5` — já criado e cwd.
- **Branch:** `algorythmo/m1c-cleanup-and-e2e` (tracking `origin/algorythmo/main`).
- **Base:** commit `f8ef36ca8` (`feat(M1-C): stage_history API endpoint + actor_summary preload`).
- **PR target:** `algorythmo/main`.

## O que você vai construir (escopo plano §10 PR 5)

Plano completo em `docs/plans/0003-m1-c-backend-leads-reais.md` (seções §8.3, §10 PR 5).

Backend e endpoint já fechados (PRs #51, #52, #54). Frontend wire está sendo construído em paralelo (PR 4 no worktree `algorythmo-m1c-pr4`). **Você não toca em frontend.**

Você toca **APENAS** em:
- `engines/algorythmo/lib/tasks/algorythmo/**`
- `engines/algorythmo/spec/algorythmo/tasks/**`
- `spec/system/algorythmo/crm/**`
- `engines/algorythmo/docs/**`
- `docs/coordination/STATUS.md`

(Mapa exato em `docs/coordination/M1C_FASE4_DISPATCH.md` §2. Qualquer arquivo fora desse set = violação de escopo.)

### Tarefas

1. **Rake `algorythmo:crm:cleanup_legacy_leads`** em `engines/algorythmo/lib/tasks/algorythmo/cleanup.rake`:
   - Lógica: re-roda o auto-create de leads pro histórico (conversas existentes que não geraram lead porque o gate estava off). Detalhes da semântica em `0003-m1-c-backend-leads-reais.md` §8.3.
   - **Duplo gate em produção:** aborta se `Rails.env.production?` E não vier `--force` na linha. Aborta também se faltar env var `ALGORYTHMO_CRM_CLEANUP_CONFIRM=yes`. Em dev ambos os gates são bypass.
   - **Audit log:** grava em `tmp/cleanup_legacy_leads_<unix_timestamp>.log` (lead_id criado, contact_id, conversation_id, decisão tomada).
   - Idempotente: rodar 2x não cria duplicatas (advisory lock + unique partial index já protegem; reuse `process_lead_for` do listener se possível).

2. **RSpec** em `engines/algorythmo/spec/algorythmo/tasks/cleanup_legacy_leads_spec.rb`:
   - Cenário dev happy path (cria N leads pra N conversas órfãs)
   - Idempotência (rodar 2x = mesma contagem)
   - Prod sem `--force` aborta
   - Prod sem env var aborta
   - Prod com ambos → executa + audit log gerado (assercione path do arquivo)

3. **Un-skip Playwright** em `spec/system/algorythmo/crm/`:
   - Os 11 arquivos atuais (`_a11y_smoke.spec.ts`, `a11y_keyboard.spec.ts`, `a11y_screen_reader.spec.ts`, `aging_dual_coding.spec.ts`, `auto_create_lead.spec.ts`, `contract_conformance.spec.ts`, `empty_state.spec.ts`, `idempotency.spec.ts`, `kanban_drag_and_drop.spec.ts`, `pipeline_rename.spec.ts`, `reopen_lead.spec.ts`) estão com `.skip()` aplicado no `test.describe` / `test`.
   - Localize todos os `.skip` e remova. Garanta que cada arquivo continue rodando.

4. **2 specs novos em Playwright** (ENTRAM COM `test.skip` POR ENQUANTO — destrava só após PR 4 mergear):
   - `spec/system/algorythmo/crm/owner_assignment.spec.ts` — assercia que após primeira resposta humana outbound, drawer.owner-name renderiza nome do agente; antes disso renderiza placeholder.
   - `spec/system/algorythmo/crm/stage_history_drawer.spec.ts` — abre drawer, lista `drawer-stage-history-list` aparece com entries em ordem newest-first, rodapé "Mostrando últimos 100" aparece quando `truncated: true`.

   No topo de cada um desses 2 arquivos: `test.skip(true, 'Waiting on PR 4 merge — drawer UI not in main yet. Unskip after rebase.')` com comentário explicando o porquê.

5. **Docs:**
   - `engines/algorythmo/docs/M1-C-OPERATION.md` (novo) — checklist §9.3 do plano (manual smoke do founder) + documentação do duplo gate do rake (como rodar em dev, como rodar em prod simulado, o que esperar no audit log).
   - `docs/coordination/STATUS.md` — adicione entrada "Fase 3 do M1-C FECHADA — PRs #51, #52, #53, #54, <#PR4>, <#PR5> mergeados" (deixe placeholder pra ser preenchido no merge final).

### Acceptance

- `bundle exec rake algorythmo:crm:cleanup_legacy_leads` em dev funciona e é idempotente
- Em prod simulado: sem `--force` aborta; com `--force` mas sem env aborta; com ambos executa
- Audit log gerado e nomeado conforme spec
- Os 11 specs Playwright passam (un-skipados)
- Os 2 specs novos ESTÃO declarados mas pulados (CI verde, founder vê eles como skipped — não fail)
- Cobertura mantida ≥90% nos arquivos novos backend
- axe-core continua zero violations critical/serious

## Estilo / não fazer

- **NÃO** edite nenhum arquivo de frontend (`app/javascript/**`). PR 4 está fazendo isso em paralelo. Conflito = retrabalho.
- **NÃO** edite nada em `engines/algorythmo/app/**` (controllers, models, services, listeners) — backend M1-C tá fechado.
- **NÃO** comente o que o código faz; só o porquê quando não-óbvio.
- O rake é destrutivo em prod. **Audit log + duplo gate são inegociáveis** — founder vai testar manual.

## Workflow

1. Leia primeiro:
   - `docs/plans/0003-m1-c-backend-leads-reais.md` §8.3 (lógica do cleanup), §9.3 (checklist manual), §10 PR 5
   - `engines/algorythmo/app/listeners/algorythmo/crm_listener.rb` (você vai querer reusar `process_lead_for` / `upsert_lead_under_lock` no rake — extrai pra um service se ficar feio)
   - `engines/algorythmo/lib/tasks/algorythmo/seed.rake` (estilo de rake já usado no projeto)
   - 2-3 dos specs Playwright já existentes em `spec/system/algorythmo/crm/` pra pegar o estilo de fixture e seletor (CONTRACT_M1B.md é a fonte de testids)
2. Implemente em commits granulares (rake → spec do rake → un-skip Playwright → 2 specs novos skipados → docs).
3. Rode local: `bundle exec rspec engines/algorythmo/spec/algorythmo/tasks/` (rake spec verde), `pnpm playwright test spec/system/algorythmo/crm/` (Playwright verde — os 2 novos vão como `skipped`, não `failed`).
4. Push: `git push -u origin algorythmo/m1c-cleanup-and-e2e`.
5. Abra PR contra `algorythmo/main` com título `chore(M1-C/PR5): cleanup rake + un-skip Playwright + docs (fecha M1-C)`. Body curto: o que entrega, como o founder roda o cleanup, qual é o gate de produção.
6. Espere CI verde.
7. Chame `adversarial-reviewer` com foco: **segurança do rake** (injeção via params, escape de prod gate, leak no audit log), idempotência de fato, regressão em algum dos 11 specs un-skipados.
8. **NÃO PEÇA MERGE AINDA SE PR 4 NÃO MERGEOU.** Workflow de fechamento:
   - Quando PR 4 mergear: faça `git fetch origin && git rebase origin/algorythmo/main` no seu worktree.
   - Remova `test.skip` dos 2 arquivos `owner_assignment.spec.ts` e `stage_history_drawer.spec.ts`.
   - Rode Playwright local pra garantir que os 2 passam contra o frontend novo.
   - Push novo commit `chore(M1-C/PR5): un-skip owner+history specs (PR 4 merged)`.
   - Espere CI verde de novo.
   - Atualize o placeholder no `STATUS.md` com os números reais dos PRs.
   - Aí sim devolve "PR <num> pronto pra merge — fecha M1-C."

## Comunicação com o founder

- Founder é Algorythmo CEO, NÃO-dev. Português, linguagem de produto. Nunca pede pra ele revisar código.
- ≤100 palavras default. Atualizações curtas (≤25 palavras) entre tool calls.
- Quando PR estiver verde e revisada, devolva: "PR <num> pronto pra merge — fecha M1-C. Cleanup rake protegido por duplo gate. Suite Playwright reabilitada com 13 cenários."

## Estado do repo agora

Worktrees ativos:
- PR 4 → outra sessão Claude está rodando em paralelo no `algorythmo-m1c-pr4` (frontend wire real data).
- PR 5 → este (`algorythmo-m1c-pr5`).

Zero overlap de arquivo. Pode trabalhar livre. Só não mergeie antes da PR 4.

Bom trabalho.
