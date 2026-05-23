# Algorythmo CRM Frontend — Developer Overview

**Plan:** `docs/plans/0002-m1-trilha-b-frontend-crm.md`
**Status:** Scaffolded (M1-B Fase 1). Components implemented in Fase 2 by Sessão C.
**Design:** `docs/algorythmo/crm/DESIGN.md`
**A11y:** `docs/algorythmo/crm/A11Y.md`

---

## What this is

The CRM frontend is a Kanban-style pipeline view embedded in the Algorythmo OS dashboard. It displays **Leads** — sales pipeline entries that are automatically created when messages arrive from connected channels (widget, WhatsApp, email, Instagram).

This is **not** a generic CRM you configure from scratch. Leads are created server-side by `Algorythmo::CrmListener` (already merged in Trilha A). The frontend's job is to visualize and allow operators to move Leads through stages.

---

## Architecture

### Component tree

```
CrmKanbanView.vue          ← route component (/app/accounts/:id/crm)
├── KanbanHeader.vue        ← title, search placeholder, "Configurar Pipeline" link
└── KanbanBoard.vue         ← orchestrates 5 stage columns
    ├── StageColumn.vue     ← one column, virtualised with virtua/vue when >100 leads
    │   ├── LeadCard.vue    ← the card cell
    │   │   └── LeadAgingChip.vue
    │   └── StageEmptyState.vue
    ├── LeadEmptyState.vue  ← shown when ALL stages empty (first session)
    └── LeadDetailDrawer.vue ← opens on card click; focus trap; Esc closes

PipelineConfigView.vue     ← route component (/app/accounts/:id/crm/pipeline)
└── PipelineConfigForm.vue  ← inline rename + aging coefficient per stage

ConversationCrmContext.vue ← mounted in ConversationHeader.vue (upstream soft-fork)
                              shows which Lead a conversation belongs to
MoveLeadModal.vue          ← keyboard fallback for drag (T-B19)
```

### Shared primitives (also used by other Algorythmo features)

Located at `app/javascript/dashboard/components-next/algorythmo/`:

| Component | Purpose |
|---|---|
| `AlgDrawer.vue` | Side-drawer, 420px, focus trap, slide-in animation |
| `AlgMenu.vue` | ⋮ dropdown menu, arrow-key navigation |
| `AlgToast.vue` + `AlgToastContainer.vue` | Toast stack, bottom-right, retry support |
| `AlgAvatar.vue` | Contact avatar with deterministic fallback gradient |

### Composables

Located at `app/javascript/dashboard/composables/algorythmo/`:

| Composable | Purpose |
|---|---|
| `useLeadStore.js` | All Lead state per stage; optimistic move + rollback |
| `usePipelineStore.js` | Pipeline + stages cache (fetched once on mount) |
| `usePolling.js` | Generic polling with pause-on-blur |
| `useKanbanDragDrop.js` | `vuedraggable` wrapper; intra-stage drag blocked (Q-B3) |
| `useToast.js` | Singleton toast queue |
| `useAlgDrawer.js` | Focus trap helper for `AlgDrawer.vue` |

### API helpers

Located at `app/javascript/dashboard/helper/algorythmo/`:

| File | Purpose |
|---|---|
| `leadApi.js` | Axios wrappers for `/algorythmo/api/v1/accounts/:id/leads*` |
| `timeFormat.js` | `formatTimeHuman(seconds)` → "12 min", "4h 2m", "3d", etc. |

---

## Store design

`useLeadStore` uses Vue 3 `reactive` + `Map` — **not Vuex**. This is intentional: Vuex is the upstream Chatwoot global store and touching it creates sync conflicts every monthly rebase. All CRM state is isolated.

```
state: Map<stageId, {
  leads: Lead[],
  cursor: string | null,
  isLoading: boolean,
  hasMore: boolean,
  error: string | null,
}>
```

Optimistic move protocol:
1. `moveLeadOptimistic` removes lead from `fromStage`, prepends to `toStage` with `_optimisticMove: true`.
2. API call `PATCH /leads/:id/move`.
3. On success: `commitMove` — replaces with server data, clears `_optimisticMove`.
4. On failure: `rollbackMove` — restores to `fromStage`, shows error toast with retry.

Polling upsert skips leads with `_optimisticMove: true` to prevent clobbering in-flight moves.

---

## Auto-create flow (D6)

**The frontend never calls `POST /leads` in normal operation.** Leads are created server-side:

```
Channel message arrives
  → Chatwoot MessageCreated event
  → Algorythmo::AsyncDispatcher
  → Algorythmo::CrmListener#message_created
  → Lead.create_from_message! (idempotent — skips if open Lead exists for contact)
```

Frontend sees new leads via polling (8s interval, `usePolling`). When a new lead appears in the polling response, `upsertLeads` prepends it to the stage.

This is why the Kanban has no "Create Lead" button — it would be wrong product semantics.

---

## Feature flag gate

The entire CRM section is gated by `algorythmo_crm` (set in `config/features.yml`):

- **Sidebar item:** rendered only when `useAlgorythmoFeatureGate('algorythmo_crm')` is true.
- **Route:** `/crm` redirects to `/conversations` with toast "CRM não está habilitado" when flag is off (Q-B4 decision).
- **ConversationCrmContext:** renders only when flag is on.

Tagged in upstream soft-fork files with `// algorythmo: feature-gate algorythmo_crm`.

---

## Routing

New routes in `app/javascript/dashboard/routes/dashboard/crm/crm.routes.js`:

| Route | Component | Notes |
|---|---|---|
| `/app/accounts/:id/crm` | `CrmKanbanView` | Main Kanban view |
| `/app/accounts/:id/crm/pipeline` | `PipelineConfigView` | Admin-only config |

Wired into `dashboard.routes.js` via tagged spread (soft-fork zone). See `engines/algorythmo/bin/check-soft-fork-zone.sh` for integrity check.

---

## i18n

All strings use the `ALGORYTHMO_CRM.*` namespace in:
- `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json`

English is NOT translated (Q-B6 decision: product is for Brazilian SMEs; PT-BR is the only locale). If the locale is `en`, strings show the pt_BR fallback.

Key namespaces:
- `ALGORYTHMO_CRM.KANBAN.*` — Kanban view labels
- `ALGORYTHMO_CRM.STAGE_DEFAULTS.*` — Default stage names
- `ALGORYTHMO_CRM.AGING.*` — Chip state labels
- `ALGORYTHMO_CRM.EMPTY_STATE.*` — Empty state copy
- `ALGORYTHMO_CRM.ERRORS.*` — Error messages + retry copy

---

## Test structure

| Layer | Location | What it covers |
|---|---|---|
| Vitest unit | `spec/javascript/algorythmo/crm/` | Component rendering, composable logic, helper purity |
| Playwright E2E | `spec/system/algorythmo/crm/` | User flows, axe-core a11y gate, network mock scenarios |

Coverage targets (from plan 0002 §7):
- Composables + helpers: ≥90% line coverage
- Vue components (interaction): ≥75%
- `LeadAgingChip`: snapshot tests for all 4 states

---

## Key decisions to know

| Decision | What | Why |
|---|---|---|
| D6 | Auto-create Lead by channel, never manually | Product model: Lead = inbound contact, always channel-initiated |
| D10 | Aging chip with per-stage coefficient | "Parado em Proposta 7 dias" is different urgency from "Parado em Novo 7 dias" |
| D11 | A11y baseline in MVP | Keyboard + screen reader from day 1, not retrofit |
| Q-B3 | No intra-stage reorder | Simplifies state; order = chronological arrival |
| Q-B4 | Redirect (not 404) when flag off | Professional UX — 404 looks broken |
| T-B4 | Optimistic move with explicit rollback | Operators drag fast; 100ms latency is unacceptable for drag UX |
| T-B7 | Polling 8s, no ActionCable | MVP simplicity; ActionCable roadmap post-M2 |

Full decision log: `docs/plans/0002-m1-trilha-b-frontend-crm.md` §3 + `docs/plans/0001-mvp-algorythmo-os.md` §10.

---

## Links

- Design tokens + components: `docs/algorythmo/crm/DESIGN.md`
- A11y gate criteria: `docs/algorythmo/crm/A11Y.md`
- Backend API: `docs/plans/0002-m1-trilha-b-frontend-crm.md` §1.1
- Soft-fork zone: `engines/algorythmo/README.md`
- Design system: `engines/algorythmo/app/assets/stylesheets/DESIGN.md`
