# Contrato M1-B — selectors + aria (Fase 2)

> **Versão atual: 1.2.0** — bump M1-D, ver Changelog abaixo.
>
> **Por que esse doc existe.** Na Fase 2, o agente de componentes constrói LeadCard/Kanban e o agente de testes escreve Playwright contra esses componentes. Pra rodarem de verdade em paralelo, os dois acordam HOJE o contrato de superfície. Esta é a fonte única de verdade.
>
> **Quem altera.** Apenas a orquestradora (Sessão A). Qualquer agente que precise estender PARA e abre PR `[BLOCKED]` pedindo bump.
>
> **Como usar.** Componentes emitem os atributos EXATAMENTE como listado. Specs Playwright usam APENAS estes seletores (nada de `nth-child`, classe CSS ou regex em texto).

## Changelog

- **v1.2.0 (2026-05-25) — M1-D bump.** Reserva os testids da camada de observabilidade do Kanban consumida pela Sessão E (PR 6 do plano `0004-m1-d-pipeline-metrics`):
  - `kanban-metrics-summary` (header do board) — resumo agregado do pipeline (total de leads abertos + tempo médio do funil).
  - `kanban-metrics-stat` — item individual dentro do summary, com `data-metric-key="open_leads|avg_funnel_hours|conversion_rate"`.
  - `stage-metrics-chip` (no header de cada `stage-column`) — chip com média de tempo no estágio + count + (se aplicável) taxa de conversão pra próxima etapa.
  - Novo endpoint `GET /algorythmo/api/v1/accounts/:id/pipelines/:pid/metrics` formalizado no §9.
  Adição pura: zero alteração nos testids 1.x. Suite Playwright dos cuts (Sessão F, PR 7) NÃO toca esses testids — domínio disjunto.
- **v1.1.0 (2026-05-24) — M1-C bump.** Reserva no §7 LeadDetailDrawer dois `data-testid` consumidos pelo wire-up real do drawer (PR 4 do plano `0003-m1-c-backend-leads-reais`):
  - `drawer-owner-name` — exibição do dono do lead, vindo do campo `owner` no `lead_json` (introduzido pelo PR 1 do M1-C).
  - `drawer-stage-history-list` — lista renderizada a partir de `GET /leads/:id/stage_history` (endpoint do PR 3 do M1-C).
  Adição pura: zero alteração nos testids existentes. Suite Playwright PR #50 (ainda `.skip()` até o PR 5 do M1-C) permanece retrocompatível.
- **v1.0.0 (2026-05-24) — Inicial.** Dispatch da Fase 2 (LeadCard, Kanban, LeadAgingChip, drawer scaffold).

---

## 1. Convenções

- `data-testid` = seletor primário Playwright.
- `aria-*` = seletor secundário (a11y é asserção também).
- Classes `.alg-*` NUNCA são seletor de teste.

---

## 2. Rota `/app/accounts/:id/crm` — árvore

```
[data-testid="crm-kanban-view"]
├── [data-testid="kanban-header"]
│   ├── [data-testid="kanban-title"]                 → h1 i18n ALGORYTHMO_CRM.KANBAN.TITLE
│   ├── [data-testid="kanban-search-input"]
│   ├── [data-testid="pipeline-config-link"]         → href="/app/accounts/:id/crm/pipeline"
│   └── [data-testid="kanban-metrics-summary"]       → v1.2.0 — resumo do pipeline (M1-D)
│       └── [data-testid="kanban-metrics-stat"]      → data-metric-key="open_leads|avg_funnel_hours|conversion_rate"
├── [data-testid="kanban-board"]                     → role="region" aria-label="Kanban CRM"
│   └── [data-testid="stage-column"]
│       [data-stage-id="N"]
│       [data-stage-kind="open|won|lost"] x5
│       ├── [data-testid="stage-column-header"]
│       │   ├── [data-testid="stage-name"]
│       │   ├── [data-testid="stage-count"]
│       │   └── [data-testid="stage-metrics-chip"]    → v1.2.0 — métricas por estágio (M1-D)
│       ├── [data-testid="stage-column-list"]        → role="list"
│       │   └── [data-testid="lead-card"] x N
│       └── [data-testid="stage-empty-state"]        → quando coluna vazia mas board NÃO vazio
├── [data-testid="kanban-empty-state"]               → quando board GLOBAL vazio
│   └── [data-testid="kanban-empty-cta"]             → href settings/inboxes/new
└── [data-testid="aria-live-region"]                 → aria-live="polite"
```

---

## 3. Lead card

```html
<article
  data-testid="lead-card"
  :data-lead-id="lead.id"
  :data-stage-id="lead.stage_id"
  :data-channel="lead.channel_origin"
  role="button"
  tabindex="0"
  :aria-label="`Lead ${name}, etapa ${stage}, ${timeHuman} nesta etapa, canal ${channel}`"
>
  <span data-testid="lead-card-channel-icon" aria-hidden="true">…</span>
  <span data-testid="lead-card-name">{{ name }}</span>
  <span data-testid="lead-card-time">{{ timeHuman }}</span>
  <!-- LeadAgingChip embutido -->
  <button
    data-testid="lead-card-menu-trigger"
    :aria-label="`Ações para lead ${name}`"
    aria-haspopup="menu"
  >⋮</button>
</article>
```

**Comportamento:**
- Click / `Enter` / `Space` no card → abre LeadDetailDrawer.
- Click no menu trigger → abre `[data-testid="lead-card-menu"]`.

---

## 4. LeadAgingChip

```html
<span
  data-testid="lead-aging-chip"
  :data-state="state"               <!-- "neutral" | "green" | "yellow" | "red" -->
  :aria-label="ariaLabel"
>
  <span data-testid="lead-aging-chip-glyph" aria-hidden="true">{{ glyph }}</span>
  <span data-testid="lead-aging-chip-label">{{ timeHuman }}</span>
</span>
```

| state | glyph | quando |
|---|---|---|
| `neutral` | `—` | won/lost OU `aging_coefficient ∈ {0, null}` |
| `green` | `●` | `ratio < 1` |
| `yellow` | `◐` | `1 ≤ ratio < 2` |
| `red` | `○` | `ratio ≥ 2` |

**Dual-coding:** glyph + cor. D valida AMBOS.

---

## 5. Empty states

**Kanban global:**
```html
<div data-testid="kanban-empty-state">
  <h2 data-testid="kanban-empty-title">…</h2>
  <a data-testid="kanban-empty-cta" :href="connectChannelUrl">…</a>
</div>
```

**Coluna individual:**
```html
<div data-testid="stage-empty-state" :data-stage-id="stage.id">
  <span data-testid="stage-empty-text">…</span>
</div>
```

---

## 6. Menu ⋮ + MoveLeadModal (keyboard fallback de drag)

```html
<div role="menu" data-testid="lead-card-menu" :data-lead-id="L">
  <button role="menuitem" data-testid="lead-menu-move">Mover para…</button>
</div>

<div role="dialog" aria-modal="true" data-testid="move-lead-modal" :data-lead-id="L">
  <fieldset role="radiogroup">
    <input type="radio" :data-testid="`move-stage-radio-${s.id}`" :value="s.id" /> {{ s.name }}
  </fieldset>
  <button data-testid="move-lead-modal-confirm">Mover</button>
  <button data-testid="move-lead-modal-cancel">Cancelar</button>
</div>
```

---

## 7. LeadDetailDrawer (entra na Fase 3, contrato fixado AGORA pra D scaffoldar)

```html
<aside
  data-testid="lead-detail-drawer"
  :data-lead-id="lead.id"
  role="dialog"
  aria-modal="true"
>
  <button data-testid="drawer-close">×</button>
  <h2 data-testid="drawer-title">{{ name }}</h2>
  <span data-testid="drawer-contact-email">…</span>
  <span data-testid="drawer-contact-phone">…</span>
  <span data-testid="drawer-channel-origin">…</span>
  <!-- v1.1.0 — owner do lead (lead.owner do lead_json). Renderiza placeholder quando null. -->
  <span data-testid="drawer-owner-name">{{ ownerNameOrPlaceholder }}</span>
  <a data-testid="drawer-conversation-link" :data-conversation-id="c.id" v-for="c in convs" />
  <button data-testid="drawer-conversations-load-more" v-if="hasMore">Ver mais</button>
  <!-- v1.1.0 — histórico de etapas (GET /leads/:id/stage_history). Lazy-load no abrir do drawer. -->
  <ol data-testid="drawer-stage-history-list">
    <li v-for="entry in stageHistory" :data-stage-history-id="entry.id">…</li>
  </ol>
  <textarea data-testid="drawer-notes-input" />
  <button v-if="isClosed" data-testid="drawer-reopen-button">Reabrir como novo Lead</button>
</aside>
```

**Notas v1.1.0:**

- `drawer-owner-name` renderiza `lead.owner.name` quando presente, ou string i18n de placeholder ("Sem dono") quando `lead.owner` é `null`. O elemento DEVE existir em ambos os casos para que Playwright assercione presença + texto.
- `drawer-stage-history-list` é a raiz da lista; itens são li com `data-stage-history-id`. Quando `truncated: true` no payload, o rodapé "Mostrando últimos 100" é um elemento separado (não bloqueia este contrato — testid pode ser definido pelo PR 4 sem novo bump por estar dentro do envelope da lista).

---

## 8. Aria-live (anúncio de drag)

```html
<div data-testid="aria-live-region" aria-live="polite" aria-atomic="true">
  <!-- "Lead Maria movido para Qualificado" -->
</div>
```

---

## 9. Endpoints (Trilha A + B.0)

```
GET    /algorythmo/api/v1/accounts/:id/pipelines/default
GET    /algorythmo/api/v1/accounts/:id/pipelines/:pid/metrics     # v1.2.0 (M1-D)
GET    /algorythmo/api/v1/accounts/:id/leads?stage_id=X&cursor=&limit=
GET    /algorythmo/api/v1/accounts/:id/leads?contact_id=X
GET    /algorythmo/api/v1/accounts/:id/leads/:lid/conversations?cursor=&limit=
GET    /algorythmo/api/v1/accounts/:id/leads/:lid/stage_history
PATCH  /algorythmo/api/v1/accounts/:id/leads/:lid/move      { stage_id }
POST   /algorythmo/api/v1/accounts/:id/leads/:lid/reopen
PATCH  /algorythmo/api/v1/accounts/:id/stages/:sid/rename   { name }
PATCH  /algorythmo/api/v1/accounts/:id/stages/:sid          { aging_coefficient }
```

**v1.2.0 — `pipelines/:pid/metrics` payload (M1-D):**

```json
{
  "pipeline_id": 1,
  "computed_at": "2026-05-25T12:00:00Z",
  "ttl_seconds": 60,
  "summary": {
    "open_leads": 42,
    "avg_funnel_hours": 73.5,
    "conversion_rate": 0.31
  },
  "stages": [
    {
      "stage_id": 1,
      "stage_kind": "open",
      "lead_count": 12,
      "avg_time_in_stage_seconds": 14400,
      "conversion_rate_to_next": 0.55
    }
  ]
}
```

Cache em memória 60s via `Rails.cache` (mesma decisão P2/T7 da FeatureGate). `conversion_rate_to_next` é `null` em estágios terminais (`won`, `lost`).

**B.0 (backend extension)** é entregue pelo agente de componentes ANTES de tocar Vue: contact embed em `lead_json`, filter `contact_id` no `#index`, endpoint `#conversations`.

---

## 10. Versionamento

| Versão | Data | Mudança |
|---|---|---|
| 1.0.0 | 2026-05-24 | Inicial — dispatch Fase 2 |
| 1.1.0 | 2026-05-24 | M1-C: adiciona `drawer-owner-name` + `drawer-stage-history-list` no §7. Sem breaking changes. |
| 1.2.0 | 2026-05-25 | M1-D: adiciona `kanban-metrics-summary` + `kanban-metrics-stat` + `stage-metrics-chip` no §2 + endpoint `pipelines/:pid/metrics` no §9. Sem breaking changes. |

Mudanças = PR `[CONTRACT_BUMP]`, aprovação da orquestradora antes de C/D consumirem versão nova.
