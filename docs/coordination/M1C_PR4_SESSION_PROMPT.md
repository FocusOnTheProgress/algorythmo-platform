# Sessão PR 4 — Frontend wire real data (M1-C)

> **Cola este bloco inteiro no Cmd-K da sessão Claude Code nova.**
> Diretório de trabalho: `C:/Users/gusta/dev/algorythmo-m1c-pr4`

---

Você é o engenheiro da **PR 4 do M1-C** (frontend wire real data) do projeto Fork Chatwoot (Algorythmo OS).

## Setup

- **Worktree:** `C:/Users/gusta/dev/algorythmo-m1c-pr4` — já criado e cwd.
- **Branch:** `algorythmo/m1c-frontend-wire-real-data` (tracking `origin/algorythmo/main`).
- **Base:** commit `f8ef36ca8` (`feat(M1-C): stage_history API endpoint + actor_summary preload`).
- **PR target:** `algorythmo/main`.

## O que você vai construir (escopo plano §10 PR 4)

Plano completo em `docs/plans/0003-m1-c-backend-leads-reais.md` (section §7, §10 PR 4). Spec visual em `docs/plans/0003-m1-c-pr4-visual-spec.md`. CONTRACT em `docs/coordination/CONTRACT_M1B.md` (v1.1.0).

Backend já entregue e mergeado:
- `lead_json` traz `owner: { id, name, thumbnail }` ou `null` (PR #51).
- `GET /algorythmo/api/v1/accounts/:acc/leads/:id/stage_history` retorna `{ stage_history: [...], truncated: bool }` com `actor_summary` resolvido (PR #54). Cap em 100 entries.

Você toca **APENAS** em `app/javascript/dashboard/**` (mapa exato em `docs/coordination/M1C_FASE4_DISPATCH.md` §2 — qualquer arquivo fora desse subtree é violação de escopo).

### Tarefas

1. **`LeadCard.vue`** — renderiza avatar do `lead.owner` (canto inferior direito) ou placeholder "Sem dono" quando `owner == null`. Aging continua sendo calculado localmente a partir de `lead.stage_entered_at` (NÃO troque para `time_in_stage` — não existe no payload, decisão v1.1 do plano). Specs Vitest existentes em `specs/LeadCard.spec.js` ganham casos novos.

2. **`leadApi.js`** — adicione `fetchStageHistory(accountId, leadId)` que chama `GET /algorythmo/api/v1/accounts/:accountId/leads/:leadId/stage_history`.

3. **`useStageHistory.js`** (novo composable em `app/javascript/dashboard/composables/algorythmo/`) — lazy-load quando o drawer abre. Estado: `entries`, `loading`, `error`, `truncated`. Trata `truncated: true` mostrando rodapé "Mostrando últimos 100 — histórico mais antigo omitido".

4. **`LeadDetailDrawer.vue`** (novo em `routes/dashboard/crm/views/components/`) — renderiza:
   - `data-testid="lead-detail-drawer"`, `role="dialog"`, `aria-modal="true"`, `:data-lead-id="lead.id"`
   - `drawer-close`, `drawer-title`, `drawer-contact-email`, `drawer-contact-phone`, `drawer-channel-origin`
   - **`drawer-owner-name`** (novo v1.1.0) — renderiza `lead.owner.name` OR i18n placeholder "Sem dono" quando `lead.owner == null`. Sempre presente no DOM (Playwright vai assercionar em ambos os casos).
   - **`drawer-stage-history-list`** (novo v1.1.0) — `<ol>` com itens `<li :data-stage-history-id="entry.id">` mostrando nome do ator (use `actor_summary.name`, ou string i18n "Sistema" quando `actor_summary == null`), timestamp relativo, transição `from_stage → to_stage`.
   - Rodapé condicional quando `truncated: true`.

5. **i18n** — `i18n/locale/en/algorythmoCrm.json` + `i18n/locale/pt_BR/algorythmoCrm.json`. Adicione seções `DRAWER`, `DRAWER.OWNER`, `DRAWER.HISTORY` (`PLACEHOLDER_NO_OWNER`, `SYSTEM_ACTOR`, `TRUNCATED_FOOTER`, etc). Mantenha exatamente o mesmo set de chaves nos dois locales.

6. **Vitest** — specs novos:
   - `composables/algorythmo/specs/useStageHistory.spec.js` — happy path, loading, error, branch `truncated: true`.
   - `routes/dashboard/crm/views/components/specs/LeadDetailDrawer.spec.js` — render owner com/sem owner, render lista, render rodapé truncated.
   - Atualizar `specs/LeadCard.spec.js` com casos de owner avatar e placeholder.

   Régua de cobertura (T2 do plano 0001): ≥75% interaction, ≥90% composables.

## Estilo / não fazer

- **NÃO** edite nenhum arquivo fora de `app/javascript/dashboard/**`. Backend já tá fechado.
- **NÃO** edite o CONTRACT_M1B.md — testids novos (`drawer-owner-name`, `drawer-stage-history-list`) já foram acordados em v1.1.0.
- **NÃO** adicione comentários explicando o que o código faz; só comente o porquê quando não-óbvio.
- Dark-first, sensibilidade Linear/Stripe. Avatar 24x24 redondo no LeadCard. Drawer 480px largura.
- Aging sempre vermelho/laranja por idade (já existe no LeadCard atual, não regrida).

## Workflow

1. Leia o plano + CONTRACT antes de codar:
   - `docs/plans/0003-m1-c-backend-leads-reais.md` (seções §7, §10 PR 4)
   - `docs/plans/0003-m1-c-pr4-visual-spec.md`
   - `docs/coordination/CONTRACT_M1B.md` §7 (LeadDetailDrawer v1.1.0)
2. Implemente em commits granulares (1 commit por componente/composable/spec).
3. Rode local: `pnpm vitest --run` (gate verde) e `pnpm lint` no escopo tocado.
4. Push: `git push -u origin algorythmo/m1c-frontend-wire-real-data`.
5. Abra PR contra `algorythmo/main` com título `feat(M1-C/PR4): frontend wire real data (owner avatar + drawer + stage history)`. Body curto: o que mudou, por quê, como testar manual.
6. Espere CI (`gh pr checks <num> --watch`). Se algo quebrar, fix.
7. Quando 100% verde, **chame o adversarial-reviewer agent** (`Agent` tool, `subagent_type: "adversarial-reviewer"`) com prompt: "Review PR <num> branch `algorythmo/m1c-frontend-wire-real-data`. Foco: vazamento de dados sensíveis no drawer, XSS em campos render do owner/actor, race se drawer abrir e fechar rápido, a11y dialog focus trap, i18n keys faltando em pt_BR vs en."
8. Aplique fixes críticos antes de pedir merge ao founder.

## Comunicação com o founder

- Founder é Algorythmo CEO, NÃO-dev. Fale em **português**, em linguagem de produto. Nunca pede pra ele revisar código.
- Resposta default: ≤100 palavras. Atualizações curtas entre tool calls (≤25 palavras).
- Quando PR estiver verde e revisada, devolva: "PR <num> pronto pra merge. <linha do que entrega no produto>."

## Estado do repo agora

Worktrees ativos:
- PR 4 → este (`algorythmo-m1c-pr4`)
- PR 5 → outra sessão Claude está rodando em paralelo no `algorythmo-m1c-pr5` (cleanup + e2e + docs). **Zero overlap de arquivo**. Pode trabalhar livre.

Bom trabalho.
