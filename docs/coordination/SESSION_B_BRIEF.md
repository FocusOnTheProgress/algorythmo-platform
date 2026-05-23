# Briefing — Sessão B (executora)

> **Como usar:** abra uma nova janela de Claude Code no diretório `C:\Users\gusta\dev\Fork Chatwoot`, no branch `algorythmo/main`. Cole TODO este documento (do `---` em diante) como primeira mensagem.

---

Você é a **Sessão B** num esquema de 3 sessões paralelas de Claude Code coordenadas pela Sessão A (orquestradora) no projeto Algorythmo OS (fork de Chatwoot).

## Leia primeiro

1. `docs/coordination/README.md` — topologia geral.
2. `docs/coordination/RULES.md` — regras inegociáveis.
3. `docs/coordination/STATUS.md` — sua linha é "Sessão B", seu domínio de arquivos está listado.
4. `docs/plans/0001-mvp-algorythmo-os.md` §3 M2 + §10 trilha C — o que você está entregando.
5. `docs/plans/cuts.md` — os 13 cortes que VÃO usar o framework de gating que você está construindo agora.

## Setup do worktree (primeira coisa a fazer)

```bash
git fetch origin
git worktree add ../algorythmo-b -b algorythmo/m2-foundation origin/algorythmo/main
cd ../algorythmo-b
```

A partir daqui, todo trabalho é em `C:\Users\gusta\dev\algorythmo-b\`. Você NUNCA edita fora desse worktree.

## Sua tarefa — Onda 1 M2 Foundation (PR #1)

**Objetivo:** estabelecer o mecanismo de feature gate (`algorythmo_<flag>`) que vai esconder as 13 surfaces listadas em `docs/plans/cuts.md`. Esta PR NÃO esconde nada ainda — só constrói o framework.

### Escopo

1. **Adicionar 13 flags em `config/features.yml`** — todas com prefixo `algorythmo_`, default `false`, descrição clara. Nomes EXATAMENTE como listados em `cuts.md`:
   - `algorythmo_campaigns` (CUT-001)
   - `algorythmo_help_center` (CUT-002)
   - `algorythmo_sla` (CUT-003)
   - `algorythmo_audit_logs` (CUT-004)
   - `algorythmo_custom_roles` (CUT-005)
   - `algorythmo_security_settings` (CUT-006)
   - `algorythmo_billing_settings` (CUT-007)
   - `algorythmo_agent_bots` (CUT-008)
   - `algorythmo_macros` (CUT-009)
   - `algorythmo_dashboard_apps` (CUT-010)
   - `algorythmo_advanced_assignment` (CUT-011)
   - `algorythmo_reports_bot` (CUT-012a)
   - `algorythmo_conversation_workflow` (CUT-013)

   (Total: 13. CUT-012b SLA Reports NÃO recebe flag — founder decidiu preservar.)

2. **Helper Ruby** em `lib/algorythmo/feature_gate.rb` (módulo `Algorythmo::FeatureGate`) com método `enabled?(account, flag_name)` que reusa `FeatureHelper` do Chatwoot upstream. Sem reinventar — só agregar o prefixo `algorythmo_` na convenção.

3. **Helper JS** em `app/javascript/dashboard/helper/algorythmoFeatureFlags.js` que exporta:
   - `isAlgorythmoFeatureEnabled(flagName, accountFeatures)` — boolean.
   - Documentação inline sobre como usar nos componentes Vue (1 linha de exemplo).

4. **Playwright fixture** em `spec/system/algorythmo/cuts/_fixture.ts` que exporta:
   - `toggleFlag(page, flagName, value)` — interage com a UI admin do Chatwoot pra ligar/desligar a flag durante o teste.
   - `withFlag(flagName, value, testFn)` — wrapper de teardown automático.

5. **Vitest spec** pro helper JS em `spec/javascript/algorythmo/helper/algorythmoFeatureFlags.spec.ts`.

6. **RSpec spec** pro helper Ruby em `spec/lib/algorythmo/feature_gate_spec.rb`.

### Arquivos PROIBIDOS

NÃO toque:
- `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (você toca isso na Fase 2, não agora)
- Qualquer route file em `app/javascript/dashboard/routes/`
- Qualquer arquivo em `app/javascript/dashboard/components-next/algorythmo/` (domínio da Sessão C)
- Qualquer arquivo em `spec/system/algorythmo/crm/` (domínio da Sessão D)

### Critério de aceite

- [ ] `config/features.yml` contém as 13 flags, todas default `false`, todas prefixadas `algorythmo_`.
- [ ] `Algorythmo::FeatureGate.enabled?(Account.first, 'campaigns')` retorna `false` no rails console.
- [ ] `Algorythmo::FeatureGate.enabled?(Account.first, 'campaigns')` retorna `true` após ligar a flag via UI admin.
- [ ] Helper JS importa em qualquer componente Vue sem quebrar build.
- [ ] Vitest spec do helper JS verde.
- [ ] RSpec spec do helper Ruby verde.
- [ ] Playwright fixture testada em pelo menos UMA das 13 flags (ex: `algorythmo_campaigns`) — toggle on/off funciona end-to-end.
- [ ] CI inteiro verde (lint, RSpec, Vitest, Playwright smoke, soft-fork integrity check).
- [ ] Adversarial-reviewer aprovou ou só apontou `low`/`info`.

### Padrão de PR

**Título:** `feat(M2-C.2): foundation de feature gates algorythmo — flags + helpers + Playwright fixture`

**Body:**
```markdown
## Summary
Entrega da Onda 1 do M2 batch 1 (`docs/plans/0001-mvp-algorythmo-os.md` §3 M2, task C.2).

Estabelece o framework de feature gating que será usado pelas Ondas 2 e 3 pra esconder as 13 surfaces listadas em `docs/plans/cuts.md`.

- 13 flags `algorythmo_*` em `config/features.yml`, default `false`
- Helper Ruby `Algorythmo::FeatureGate` reaproveitando `FeatureHelper` upstream
- Helper JS `isAlgorythmoFeatureEnabled` pra componentes Vue
- Playwright fixture pra toggle em testes
- Specs RSpec + Vitest

## Test plan
- [ ] CI verde
- [ ] Adversarial-reviewer aprovou
- [ ] Playwright fixture validada com flag `algorythmo_campaigns` (toggle on → feature aparece; off → some)
- [ ] Vai pra Onda 2 — Sessão B reusa fixture pra aplicar 13 gates em sidebar/routes

Coordena com Sessão A pra ordem de merge (referência: `docs/coordination/STATUS.md`).
```

### Fluxo até merge

1. Implementa.
2. Roda `bin/rails spec`, `pnpm vitest run`, `pnpm playwright test spec/system/algorythmo/cuts/` localmente.
3. Push da branch, abre PR no fork `FocusOnTheProgress/algorythmo-platform` com base `algorythmo/main`.
4. Espera CI.
5. Se CI verde: chama `Use Agent tool with subagent_type "adversarial-reviewer" to review this PR rigorously`.
6. Corrige issues `critical`/`high` no MESMO PR.
7. Quando adversarial aprovou: comenta no PR `READY_FOR_MERGE — aguardando Sessão A`.
8. PARA. Avisa humano. Espera Sessão A coordenar merge.

### Após merge da PR #1

Sessão A te notifica. Você puxa main no worktree (`git pull origin algorythmo/main`) e recebe o briefing da **Fase 2** (Onda 2 — sidebar gates) via novo prompt.

### Regras finais

- Nenhuma decisão de produto sem perguntar à Sessão A via PR `[BLOCKED]`.
- Nenhum arquivo fora do escopo permitido.
- Se conflitar com C ou D, PARA imediatamente.
