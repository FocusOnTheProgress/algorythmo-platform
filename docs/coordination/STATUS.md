# STATUS — quadro vivo das sessões

> **Mantenedor:** Sessão A (orquestradora). Atualizado em tempo real conforme PRs abrem, CI fecha, adversarial revisa, merge acontece.

**Última atualização:** 2026-05-23 — PRs #43, #44, #45 abertos; review/CI em andamento.

---

## Sessões ativas

| Sessão | Worktree | Branch | Tarefa atual | Status | PR |
|---|---|---|---|---|---|
| **A** (orquestradora) | `Fork Chatwoot/` (main) | `algorythmo/main` | Coordena B/C/D | 🟢 ativo | — |
| **B** (executora 1) | `../algorythmo-b` | `algorythmo/m2-foundation` | Onda 1 M2: foundation | 🔴 **CI vermelho — precisa corrigir** | #43 |
| **C** (executora 2) | `../algorythmo-c` | `algorythmo/m1b-base` | M1-B base: B.1 + B.2 + B.3 | 🟡 RSpec rodando | #45 |
| **D** (executora 3) | `../algorythmo-d` | `algorythmo/m1b-test-harness` | M1-B test harness | 🟠 **CI verde, adversarial pediu changes** | #44 |

## Issues abertos por PR

### PR #43 (Sessão B) — CI vermelho
1. **Rubocop:** 2 offenses corrigíveis (`Style/ClassAndModuleChildren` em `lib/algorythmo/feature_gate.rb:12` + `Layout/MultilineOperationIndentation` em `spec/lib/algorythmo/feature_gate_spec.rb:74`). Rodar `bundle exec rubocop -a` resolve.
2. **RSpec — 14+ tests do LeadsController falhando:** B implementou o helper com método `Algorythmo::FeatureGate.enabled?(account, flag)`. Mas controllers já existentes (mergeados em PR #36) chamam `Algorythmo::FeatureGate.feature_enabled?(account, flag)`. **Contrato divergente.** Decisão: renomear o método pra `feature_enabled?` (o que controllers esperam) — ou renomear nos controllers (mais arriscado, mexe em código já em main).
3. Após corrigir + CI verde, disparar adversarial-reviewer.

### PR #44 (Sessão D) — adversarial REQUEST CHANGES

**CRITICAL** (bloqueia merge):
- `.husky/_/husky.sh` commitado por engano — diretório auto-gerado pelo husky, não deveria estar no diff. Vetor `.sh` executável não revisado.

**HIGH** (bloqueia merge):
- Tags soft-fork inválidas em `playwright.config.ts:29` e `vite.config.ts:103` — usou `// algorythmo: test-harness-m1b` e `// algorythmo: engine JS specs` que não matcham regex aceita por `engines/algorythmo/bin/check-soft-fork-zone.sh` (válidas: `rebrand-m0|soft-fork|widget-i18n-overlay|survey-i18n-overlay`). Corrigir pra `// algorythmo: soft-fork — test-harness-m1b`.
- Senha hard-coded em `spec/system/algorythmo/crm/_fixture.ts:30` (`ADMIN_PASSWORD = 'Test@12345'`). Mover pra env var obrigatória (`PLAYWRIGHT_PASSWORD`).
- `describe.skip()` sem `import` do componente em `spec/javascript/algorythmo/crm/LeadCard.spec.ts:13` (idem KanbanBoard/LeadAgingChip/LeadDetailDrawer). Vão ficar skip pra sempre quando C entregar — trocar por `it.todo()` (que aparece como pending no relatório).

**MEDIUM** (não bloqueia mas vira follow-up):
- Fixture mistura padrões (com/sem `crmPage`) — padronizar.
- `@axe-core/playwright` não está em `package.json` mas o spec depende dele — adicionar agora ou abrir issue de follow-up.
- `pipeline_rename.spec.ts:107` testa "preview scale real-time" — feature inventada, não está em B.8 do plano. Remover ou levantar como decisão.

**LOW:**
- 3 `waitForTimeout` arbitrários (`_fixture.ts:204`, `idempotency.spec.ts:67`, `empty_state.spec.ts:35`).

**INFO positivo:**
- Docs (README/DESIGN/A11Y) referenciam D5/D6/D10/D11 por número + tokens exatos. Padrão correto.
- Zero conflito futuro com C ou Fase 2 de B.

### PR #45 (Sessão C) — aguardar CI fechar
- Vitest, lint-backend, lint-frontend, soft-fork zone, validate title: passaram.
- RSpec ainda rodando. Adversarial-review só após CI fechar verde.

---

## Pipeline de tarefas

### Fase 1 — Disparo simultâneo (agora)
- [ ] **B** → M2 foundation (PR 1) — pré-requisito de M2 Onda 2
- [ ] **C** → M1-B base (PR 2) — pré-requisito de M1-B componentes
- [ ] **D** → M1-B test harness + docs (PR 3) — paralelo a C, independente

### Fase 2 — Pós-merge da Fase 1
- [ ] **B** (worktree reusado) → M2 Onda 2 sidebar gates (PR 4) — usa fixture de PR 1
- [ ] **C** (worktree reusado) → M1-B componentes (B.4 + B.5 + B.6 + B.7 + B.8) (PR 5) — usa base de PR 2
- [ ] **D** (worktree reusado) → M1-B Playwright suite completa (PR 6) — usa scaffolding de PR 3 + componentes de PR 5

### Fase 3 — Convergência final
- [ ] **B** → M2 batch 1 Playwright assertions (PR 7) — valida toggle de cada flag
- [ ] **C** → M1-B B.9 (Sidebar item + routes wiring) (PR 8) — SÓ após M2 mergear pra evitar conflito em `Sidebar.vue`
- [ ] **D** → M1-B i18n + a11y final (PR 9)

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
