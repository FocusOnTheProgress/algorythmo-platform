# Fase 5 — Dispatch paralelo PR 6 (M1-D) + PR 7 (M2 Onda 2 batch 1)

> **Data:** 2026-05-25
> **Orquestração:** Sessão A (esta) define contrato, cria worktrees, escreve prompts. Founder dispara 2 sessões adicionais em paralelo (uma por worktree).
> **Objetivo:** entregar a camada de observabilidade do Kanban (PR 6) e endurecer a suite Playwright dos 13 cuts com assertions positivas (PR 7), simultaneamente, sem conflito de arquivo.

---

## 1. O que cada sessão entrega

### Sessão E — PR 6 — M1-D pipeline observability

**Por quê.** O Kanban hoje mostra leads mas não responde a pergunta "onde a venda trava". Sem isso, o Brain (M3) não tem sinal pra cima. Founder afirmou em memória: *"Kanban É o funil de vendas — instrumento de métrica de jornada, não só visualização."*

**Escopo:**

- Backend: serviço `Algorythmo::Analytics::PipelineMetrics` calcula a partir de `stage_histories` o tempo médio por estágio, count de abertos por estágio, taxa de conversão pra próxima etapa, e agregado do funil (total abertos, hora média, conversion rate global).
- Controller `Algorythmo::Api::V1::PipelineMetricsController` expõe `GET /algorythmo/api/v1/accounts/:id/pipelines/:pid/metrics`.
- Cache em `Rails.cache` 60s (mesma decisão P2/T7 da FeatureGate). Stale-while-recompute aceitável.
- Frontend: `KanbanHeader.vue` (novo) com `kanban-metrics-summary`; `StageColumn.vue` (edit) com `stage-metrics-chip` no header da coluna.
- Composable `useStageMetrics.js` (novo) que faz fetch + cache local + re-fetch on stage change.
- i18n `ALGORYTHMO_CRM.METRICS.*` em en + pt_BR.
- Specs: backend RSpec do service + controller. Frontend vitest do composable + KanbanHeader. NÃO toca Playwright (vai vir em PR follow-up depois que PR 6 mergear).

### Sessão F — PR 7 — M2 Onda 2 batch 1 — Playwright assertions positivas para os 13 cuts

**Por quê.** Os 13 specs em `spec/system/algorythmo/cuts/` hoje validam só o lado negativo (flag-off → elemento ausente). Sem o positivo (flag-on → elemento visível + funcional + route guard redireciona quando off), o gate vira fé. Founder pediu Playwright como gate em T2 do plano técnico.

**Escopo:**

- Editar os 13 specs existentes em `spec/system/algorythmo/cuts/` adicionando 2 cenários por flag:
  1. **flag-on → surface visível** (link sidebar + rota carrega + título correto).
  2. **flag-off → rota direta redireciona** pra `/app/accounts/:id/dashboard` com mensagem aria-live de bloqueio (ou 404 controlado, conforme route guard atual).
- Extensão de `_fixture.ts`: helper `expectSurfaceVisible(page, flagName)` + `expectSurfaceBlocked(page, flagName, routePath)`. Anti-flake: usar `withFlag` existente em vez de toggle solto.
- NOVO: `cuts_smoke_spec.rb` no engine — smoke RSpec que confirma que cada nome em `ALGORYTHMO_CUT_FLAGS` tem rota declarada + chave i18n presente. Falha cedo no CI Ruby antes de subir Playwright.
- Documentação: `docs/algorythmo/cuts/README.md` (NOVO) — mapa "flag → rota → arquivo de spec" pra próxima sessão não precisar inferir.

**Escopo expressamente fora:**

- Implementar route guards novos (já existem no PR #47).
- Mexer em `KanbanBoard.vue` ou qualquer coisa em `routes/dashboard/crm/`.
- Adicionar specs no engine além do `cuts_smoke_spec.rb`.

---

## 2. Worktrees

| Worktree | Path | Branch | Base |
|---|---|---|---|
| **PR 6 (Sessão E)** | `C:/Users/gusta/dev/algorythmo-m1d-metrics` | `algorythmo/m1d-pipeline-metrics` | `algorythmo/main @ d9c2a320a` |
| **PR 7 (Sessão F)** | `C:/Users/gusta/dev/algorythmo-m2b1-cuts` | `algorythmo/m2b1-cuts-playwright` | `algorythmo/main @ d9c2a320a` |

Ambos rastreando `origin/algorythmo/main`. Já criados localmente, não pushados.

---

## 3. Mapa de toque — zero overlap

### PR 6 toca SOMENTE:

**Backend (engine):**
- `engines/algorythmo/app/services/algorythmo/analytics/pipeline_metrics.rb` (novo)
- `engines/algorythmo/app/controllers/algorythmo/api/v1/pipeline_metrics_controller.rb` (novo)
- `engines/algorythmo/config/routes.rb` (edit — adiciona `pipelines/:pid/metrics`)
- `engines/algorythmo/spec/algorythmo/services/analytics/pipeline_metrics_spec.rb` (novo)
- `engines/algorythmo/spec/algorythmo/controllers/api/v1/pipeline_metrics_controller_spec.rb` (novo)

**Frontend:**
- `app/javascript/dashboard/composables/algorythmo/useStageMetrics.js` (novo)
- `app/javascript/dashboard/composables/algorythmo/specs/useStageMetrics.spec.js` (novo)
- `app/javascript/dashboard/helper/algorythmo/leadApi.js` (edit — adiciona `fetchPipelineMetrics`)
- `app/javascript/dashboard/routes/dashboard/crm/views/KanbanBoard.vue` (edit — mounta `KanbanHeader` + passa metrics down)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/KanbanHeader.vue` (novo)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/specs/KanbanHeader.spec.js` (novo)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/StageColumn.vue` (edit — embute `stage-metrics-chip` no header)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/specs/StageColumn.spec.js` (edit — cobre chip)
- `app/javascript/dashboard/i18n/locale/en/algorythmoCrm.json` (edit — seção `METRICS`)
- `app/javascript/dashboard/i18n/locale/pt_BR/algorythmoCrm.json` (edit — espelho pt_BR)

### PR 7 toca SOMENTE:

**Playwright (e2e):**
- `spec/system/algorythmo/cuts/_fixture.ts` (edit — adiciona `expectSurfaceVisible` + `expectSurfaceBlocked`)
- `spec/system/algorythmo/cuts/*.spec.ts` (edit — 13 arquivos existentes, exceto `_fixture.ts` e `_a11y_smoke.spec.ts`)

**Engine smoke spec:**
- `engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb` (novo)

**Docs:**
- `docs/algorythmo/cuts/README.md` (novo)

### Interseção de paths: `∅`

| Caminho | PR 6 | PR 7 |
|---|---|---|
| `engines/algorythmo/app/**` | toca (analytics, controller) | NÃO TOCA |
| `engines/algorythmo/config/routes.rb` | toca | NÃO TOCA |
| `engines/algorythmo/spec/**` | toca (analytics, controller) | toca APENAS `cuts_smoke_spec.rb` (diretório raiz, novo arquivo) |
| `app/javascript/dashboard/**` | toca (CRM views + composables) | NÃO TOCA |
| `spec/system/algorythmo/crm/**` | NÃO TOCA | NÃO TOCA |
| `spec/system/algorythmo/cuts/**` | NÃO TOCA | toca |
| `docs/algorythmo/cuts/**` | NÃO TOCA | toca (novo dir) |
| `docs/coordination/**` | NÃO TOCA (Sessão A mantém) | NÃO TOCA (Sessão A mantém) |
| `app/javascript/dashboard/i18n/locale/**/algorythmoCrm.json` | toca seção `METRICS` | NÃO TOCA |
| `config/features.yml` | NÃO TOCA | NÃO TOCA (flags já estão lá desde #43) |

`engines/algorythmo/spec/algorythmo/` é o único dir compartilhado, mas em sub-paths disjuntos:
- PR 6: `services/analytics/pipeline_metrics_spec.rb` + `controllers/api/v1/pipeline_metrics_controller_spec.rb`
- PR 7: `cuts_smoke_spec.rb` (raiz do dir, arquivo novo único)

→ zero conflito de merge previsto.

---

## 4. Regra de merge — qualquer ordem

PR 6 e PR 7 podem mergear em qualquer ordem. Não há dependência entre eles:

- PR 6 não consome nada do PR 7.
- PR 7 não testa nada que dependa do PR 6 (cuts são fora do CRM, não tocam KanbanBoard).

**Quem mergear primeiro:** o que passar adversarial e CI antes. O segundo rebaseia em `origin/algorythmo/main` antes do merge — se houver conflito (improvável dado o mapa acima), Sessão A coordena.

---

## 5. Contrato compartilhado

- **CONTRACT_M1B.md v1.2.0** (já bumpada antes do dispatch). PR 6 implementa contra ela. PR 7 NÃO consome — seu domínio são as flags de cut, fora do escopo do contrato Kanban.
- **Playwright fixture `_fixture.ts`:** PR 6 NÃO toca. PR 7 estende com 2 helpers novos.

Qualquer outro testid que PR 6 precise → abrir PR `[CONTRACT_BUMP]` antes de mergear PR 6.

---

## 6. Quality gates obrigatórios (idênticos pros 2 PRs)

```bash
# Backend (PR 6 only)
bundle exec rspec engines/algorythmo/spec/algorythmo/services/analytics
bundle exec rspec engines/algorythmo/spec/algorythmo/controllers/api/v1/pipeline_metrics_controller_spec.rb

# Backend smoke (PR 7 only)
bundle exec rspec engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb

# Frontend (PR 6 only)
pnpm vitest run app/javascript/dashboard/composables/algorythmo/specs/useStageMetrics.spec.js
pnpm vitest run app/javascript/dashboard/routes/dashboard/crm/views/components/specs

# Lint (ambos)
./node_modules/.bin/eslint --fix <arquivos editados ou criados em JS/Vue/TS>
bundle exec rubocop <arquivos editados ou criados em Ruby>

# Soft-fork zone (ambos)
bash engines/algorythmo/bin/check-soft-fork-zone.sh

# Playwright (PR 7 only — local, full suite cuts)
pnpm playwright test spec/system/algorythmo/cuts
```

Adversarial review obrigatório por PR (memória do founder: founder não revisa código).

---

## 7. Comunicação entre sessões

- Toda sessão tem **acesso somente ao próprio worktree**. Não navegar pro path do outro.
- Bloqueio ou dúvida → abrir PR como `[BLOCKED]` + comentário, Sessão A resolve.
- Pivôs de escopo → parar e pingar Sessão A antes de implementar.

---

## 8. Prompts auto-contidos

- Sessão E: `docs/coordination/M1D_PR6_SESSION_PROMPT.md`
- Sessão F: `docs/coordination/M2B1_PR7_SESSION_PROMPT.md`

Cada um é stand-alone. Cole no Cmd-K da sessão nova após `cd` no worktree dela.
