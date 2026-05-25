# M1-C Fase 4 — Dispatch paralelo PR 4 + PR 5

> **Data:** 2026-05-24
> **Orquestração:** founder dispara 2 sessões Claude Code em paralelo, uma por worktree.
> **Objetivo:** PR 4 (frontend wire real data) e PR 5 (cleanup + e2e + docs) trabalham simultâneo, sem conflito de arquivo, mergeando em ordem segura.

---

## 1. Worktrees

| Worktree | Path | Branch | Parte de |
|---|---|---|---|
| **PR 4** | `C:/Users/gusta/dev/algorythmo-m1c-pr4` | `algorythmo/m1c-frontend-wire-real-data` | `origin/algorythmo/main @ f8ef36ca8` |
| **PR 5** | `C:/Users/gusta/dev/algorythmo-m1c-pr5` | `algorythmo/m1c-cleanup-and-e2e` | `origin/algorythmo/main @ f8ef36ca8` |

Ambos rastreando `origin/algorythmo/main`. Branches já criadas localmente, não pushadas.

---

## 2. Mapa de toque — provando zero overlap em arquivos

### PR 4 (frontend) — toca APENAS `app/javascript/dashboard/**`

- `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadCard.vue` (edit)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadDetailDrawer.vue` (novo)
- `app/javascript/dashboard/helper/algorythmo/leadApi.js` (edit — novo método `fetchStageHistory`)
- `app/javascript/dashboard/composables/algorythmo/useStageHistory.js` (novo)
- `app/javascript/dashboard/i18n/locale/en/algorythmoCrm.json` (edit — adiciona seção `DRAWER`, `OWNER`, `HISTORY`)
- `app/javascript/dashboard/i18n/locale/pt_BR/algorythmoCrm.json` (edit — espelho pt_BR)
- `app/javascript/dashboard/composables/algorythmo/specs/useStageHistory.spec.js` (novo)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/specs/LeadDetailDrawer.spec.js` (novo)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/specs/LeadCard.spec.js` (edit — adiciona casos de owner)

### PR 5 (cleanup + e2e + docs) — toca APENAS backend + e2e + docs

- `engines/algorythmo/lib/tasks/algorythmo/cleanup.rake` (novo) ou `algorythmo_cleanup.rake` no mesmo dir
- `engines/algorythmo/spec/algorythmo/tasks/cleanup_legacy_leads_spec.rb` (novo)
- `spec/system/algorythmo/crm/*.spec.ts` (edit — un-skip dos 11 arquivos atuais)
- `spec/system/algorythmo/crm/owner_assignment.spec.ts` (novo — skip inicial)
- `spec/system/algorythmo/crm/stage_history_drawer.spec.ts` (novo — skip inicial)
- `engines/algorythmo/docs/M1-C-OPERATION.md` (novo)
- `docs/coordination/STATUS.md` (edit — Fase 3 fechada)

**Interseção de paths:** `∅` (vazio).

---

## 3. Regra de merge — PR 4 antes de PR 5

Os 2 cenários novos Playwright de PR 5 (`owner_assignment.spec.ts`, `stage_history_drawer.spec.ts`) só passam se o frontend de PR 4 já existir.

**Sequência obrigatória:**

1. PR 4 abre, CI verde, **merge** em main.
2. PR 5 (que já entrou com esses 2 specs marcados `test.skip(...)`) faz `git fetch && git rebase origin/algorythmo/main`, remove os `test.skip` desses 2 arquivos, roda Playwright local, push.
3. PR 5 CI verde → merge.

Enquanto PR 4 não mergear, PR 5 segue tocando seu próprio escopo (rake task + specs do rake + un-skip dos 11 já existentes + docs). Os 2 specs novos ficam declarados mas pulados.

---

## 4. Comandos sanity check (rodados antes do dispatch)

```bash
git worktree list                # confirma 2 worktrees novos
cd algorythmo-m1c-pr4 && git status && git log -1   # f8ef36ca8 ✓
cd algorythmo-m1c-pr5 && git status && git log -1   # f8ef36ca8 ✓
```

---

## 5. Prompts das sessões

Salvos em:
- `docs/coordination/M1C_PR4_SESSION_PROMPT.md`
- `docs/coordination/M1C_PR5_SESSION_PROMPT.md`

Cada um é auto-contido. Cola no Cmd-K da sessão nova, ela já tem todo contexto.
