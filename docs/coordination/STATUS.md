# STATUS — quadro vivo das sessões

> **Mantenedor:** Sessão A (orquestradora). Atualizado em tempo real conforme PRs abrem, CI fecha, adversarial revisa, merge acontece.

**Última atualização:** 2026-05-24 — Fase 1 completa: PRs #43, #44, #45 mergeados. Aguardando despacho da Fase 2.

---

## Sessões ativas

| Sessão | Worktree | Branch | Tarefa atual | Status | PR |
|---|---|---|---|---|---|
| **A** (orquestradora) | `Fork Chatwoot/` (main) | `algorythmo/main` | Coordena B/C/D | 🟢 ativo | — |
| **B** (executora 1) | `../algorythmo-b` | (a recriar) | Aguardando Fase 2 — Onda 2 cuts | ⚪ idle | — |
| **C** (executora 2) | `../algorythmo-c` | (a recriar) | Aguardando Fase 2 — componentes Kanban | ⚪ idle | — |
| **D** (executora 3) | `../algorythmo-d` | (a recriar) | Aguardando Fase 2 — habilitar Playwright | ⚪ idle | — |

## Fase 1 — encerrada

- ✅ PR #44 (D) mergeado em 80f4d9e3 (2026-05-23 22:45) — M1-B test harness + docs.
- ✅ PR #45 (C) mergeado em e8b65089 (2026-05-24 00:46) — M1-B base (SCSS bridge, composables, primitives).
- ✅ PR #43 (B) mergeado em 74ff54b0 (2026-05-24 03:02) — M2 foundation (15-flag bitmask em coluna isolada, painel super-admin, migração de Captain/CRM, frontend delegation).

### Follow-ups pós-merge

- Tracking issue **#46** — 11 itens não-bloqueantes de adversarial (M2-FLW-001 a M2-FLW-011): with_lock concorrência, spec coverage extra, hygiene de fixture/migration, audit log futuro.

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
| #44 | M1-B test harness + docs (B.13+B.14+B.16) | 2026-05-23 22:45 | D |
| #45 | M1-B base — SCSS bridge + composables + primitives | 2026-05-24 00:46 | C |
| #43 | M2-C.2 foundation de feature gates | 2026-05-24 03:02 | B |
