# Plan 0010 — Admin OS: Final Front-End Round

Status: ACTIVE · Owner: founder (Gustavo) · Authored: 2026-05-30

This is the **last batch** of front-end changes for the Admin OS panel. The bar is
world-class, Apple-grade, faithful to the five reference images in
`referências front end design/` (gitignored). Prior rounds failed because features
were rebuilt on top of a base that still read as Chatwoot, and requested animations
never actually rendered. **This round is foundation-first**: the visual identity +
animation system land before any feature surface is rebuilt on top of them.

References (read before any visual work):
- `REF CRM.jpeg` — CRM kanban card + column anatomy.
- `Ref design 1.jpeg` — Agent Studio (sidebar + central radial burst). Apple, dark, editorial.
- `Ref design 2.jpeg` — **Brain**: central living sphere + "Knowledge Layers" cards joined by beams.
- `Ref design 3.jpeg` — agent prompt/checkpoint editor + simulations list.
- `Ref design 4.jpeg` — stacked agent cards, planet glyphs, Apple aesthetic.

Design source of truth: `DESIGN.md` (Cinematic OS). Do not invent new tokens that
contradict it; extend it where the references demand.

---

## Sequencing (anti-rework)

- **Phase 1 — Foundation (Stream A).** Must land and be verified first.
- **Phase 1 (parallel, independent) — Stream B.** Pure layout/bug cleanup, no identity dependency.
- **Phase 2 — Streams C, D, E.** Build on the landed foundation. Launch only after A is merged.
- **Closeout gate.** Visual QA of every touched surface against the five reference
  images, on the deployed instance, before the round is declared done.

Each stream ships its own focused PR from an isolated worktree.

---

## Stream A — Identity + Animation Foundation  (designer, Phase 1)

Goal: kill the "still looks like Chatwoot / no animations" root cause for good.

A1. **Sidebar logo not rendering** — fix. Files: `components-next/sidebar/*`
    (`Sidebar.vue`, `SidebarAccountSwitcher.vue`). Find why the brand mark is blank
    and make it render reliably (asset path / theme-aware variant / size).

A2. **Remove remaining search/compose affordance** — the "pencil" icon must go.
    Earlier rounds removed search from the sidebar but a pencil (compose) remnant
    survives. Files: `components-next/sidebar/*`.

A3. **De-Chatwoot the sidebar** — colors, fonts, finish must match Ref design 1/2
    (dark, editorial, Apple restraint). Section labels (Agentes/Fontes style),
    weights, spacing, active-state treatment. No leftover Chatwoot hues/typography.

A4. **Light ("white") mode broken** — the theme toggle does not switch the Admin OS
    surfaces. Root-cause the theme variable wiring for the algorythmo surfaces and
    make light mode fully functional and on-brand (not an afterthought).

A5. **Border-beam = traveling comet, ice tone.** `AlgAuroraBorder.vue` is authored
    for a drifting arc but renders as a static ring + glow-behind. Root-cause:
    verify `--alg-aurora-border` actually consumes the animated `--alg-aurora-angle`
    (registered `@property`) as a conic gradient so a bright arc *travels the
    perimeter*. Re-tone the Aurora gradient from magenta/purple/green to an **ice**
    palette (cool whites/blues). The effect must read as a beam moving along the
    border, NOT a light behind the element. Keep reduced-motion parking.

A6. **Motion library.** Install one lightweight motion lib (Motion One — `motion`,
    ~5kb, or GSAP if orchestration demands) for entrance/stagger animations consumed
    by Brain cards (Stream D), C-levels (Stream E), and any card reveal. Establish a
    shared composable/util so every feature animates from one system, not ad hoc.

A7. **Sector-agent chat polish** — `AlgSectorAgentChat.vue` / `AlgSectorAgentChatTrigger.vue`:
    - Center the chat; it must not span the full top of the screen.
    - **Center the panel's information** (heading/content centered).
    - **Enlarge the microphone** icon (bottom corner).
    - Remove clutter: "OFFLINE" label, the "+" send affordance, any redundant chrome.
    - Border animation uses the fixed ice comet from A5.

Acceptance: sidebar reads as Ref design 1 (no Chatwoot tells), logo renders, no
pencil, light mode works, the border shows a moving ice beam, motion system in place,
agent chat centered and decluttered with a larger mic.

---

## Stream B — Contatos + Comercial  (engineer, Phase 1, parallel with A)

B1. **Contatos: remove the "Ativo" tab.** No active/inactive split — one list of
    registered contacts. Files: `routes/dashboard/contacts/*`.

B2. **Contatos: list + import icon only.** The page shows registered contacts plus a
    single import-contacts icon. Nothing else.

B3. **Comercial layout broken.** The Commercial sector page has oversized margins/
    borders and does not fill the viewport like every other sector. Make it fill the
    screen consistently with the other sectors. Files:
    `modules/algorythmo/admin/sectors/*commercial*`, shared sector shell/layout.

Acceptance: Contatos is a single clean list with an import icon; Comercial fills the
viewport identically to other sectors. Alignment + proportion verified.

---

## Stream C — CRM  (designer, Phase 2)

Reincident block — most prior CRM asks were not executed. Match `REF CRM.jpeg` exactly.
Files: `routes/dashboard/crm/views/*` (`LeadCard.vue`, `StageColumn.vue`,
`KanbanHeader.vue`, `LeadDetailDrawer.vue`, `PipelineConfigPlaceholder.vue`).

C1. **Cards identical to REF CRM**: name, channel chip (email/whatsapp/instagram/
    tiktok with the right glyph+label), avatar, date, time-in-stage. Column header
    colored per stage (blue/yellow/purple/orange) with count badge + gear + "+".

C2. **Click card → detail panel** (evolve existing `LeadDetailDrawer.vue`): a panel
    showing the person's profile. Data will come from a future lead-nurturing agent
    (LinkedIn/Instagram/Facebook research + conversation memory) — **build the panel
    shell now**, structured to receive that data; use demo data meanwhile.

C3. **"Go to conversation"** action inside the detail panel — redirect to the lead's
    conversation.

C4. **Column color distinct from background** — give each column a fill that
    separates it from the page background for readability (per ref).

C5. **Gear icon (top-right) → "configure pipeline"** hidden behind the icon; clicking
    reveals pipeline config. Cleans up the surface. Evolve `PipelineConfigPlaceholder.vue`.

C6. Alignment + proportion are pass/fail.

Acceptance: side-by-side with REF CRM the layout matches; clicking a card opens a
profile panel with a conversation redirect; columns are visually separated; pipeline
config lives behind a gear.

---

## Stream D — Brain  (designer, Phase 2)

Copy `Ref design 2.jpeg`. Files: `modules/algorythmo/brain/BrainViewer.vue`,
`components-next/algorythmo/AlgAuroraOrb.vue`.

D1. **Faithful to the reference**: a central living sphere with beams radiating to
    surrounding cards. Premium, not a cheap replica. Use the foundation's ice palette
    and orb treatment.

D2. **Card content = Knowledge Layers ONLY**: Source / Human / Auto / Agent
    Interaction Knowledge Layers, each with a count and a short description (as in the
    ref). **Remove every trace of lead data from the Brain** — leads do not belong here.

D3. **Card animations** — entrance/stagger + hover, via the Stream A motion system.
    Cards must visibly animate.

Acceptance: Brain mirrors Ref design 2; cards show Knowledge-Layer content with no
lead data; cards animate.

---

## Stream E — C-Levels: "Sala de Conselho IA"  (designer + engineer, Phase 2)

Build the full surface from `CLevelsPlaceholder.vue`. A strategic C-level executive
forum (CEO is the user/chair; the AI committee = CFO, CMO, CTO, COO) — macro
decisions, future vision, risk, strategic paradoxes. **Front-end experience now with
demo data; real OS wiring (pulling real reports, creating real work orders, real
projections) is a later backend layer** — build the shells so that wiring drops in.

Three panels:

E1. **Left — The Committee.** Director status cards (CFO/CMO/CTO/COO) with a readiness
    indicator ("reading current data", green luminous pulse when fresh) and a **"Chamar
    para a Mesa"** toggle to include/exclude each agent from the round.

E2. **Center — Dynamic debate flow.** Styled message bubbles with a **subtle** per-
    director color accent (a thin side-bar/dot — NOT a saturated border; the ice comet
    stays the system border language). **Data pills**: when an AI cites a real OS
    figure the text renders a visual link, e.g. `recomendo cortar [R$ 45k em Infra] 📊`;
    clicking the pill opens the source report. Under each proposal, three floating
    actions: **👍 Aprovar** (opens create-a-Work-Order flow), **💬 Pedir alternativa**
    (forces the AI to recompute), **❌ Descartar** (archives).

E3. **Right — Impact Simulator (the differentiator).** A panel of 4–5 macro indicators
    (Faturamento, Margem, Satisfação do Cliente, Sobrecarga da Equipe). **Ghost effect**:
    when an AI makes a proposal, the charts draw a dotted projected-future line (e.g.
    CMO proposes R$20k paid traffic → Caixa dips now, Previsão de Vendas rises ~3 months
    out). Rejecting reverts the charts.

E4. **Opening + flow.** A prominent prompt: "Sobre qual desafio ou área do negócio quer
    propor melhorias hoje?" plus preset goals (Reduzir Churn, Cortar Custos Operacionais,
    Aumentar Margem). Choosing one triggers the relevant AIs to debate each other → right
    panel simulates impact → CEO approves → the AI emits a structured checklist → on
    confirm the OS would create projects/tasks in the operational tabs (stub the creation
    now, label it clearly as demo).

Use the Stream A motion system for reveal/transitions; ice border language; Apple
restraint; alignment + proportion are pass/fail.

Acceptance: the three-panel Sala de Conselho runs end-to-end on demo data — committee
toggles, color-accented debate bubbles, clickable data pills, the three proposal
actions, and the ghost-line impact simulator — looking world-class and on-brand.

---

## Global rules (every stream)

- **Alignment + proportion** are explicit pass/fail criteria. Nothing loose, cropped,
  saturated, or misaligned passes QA.
- Match the references; if it looks like a template or like Chatwoot, it fails.
- Animations are required where specified — if a technique can't be done natively,
  use the Stream A motion lib, not nothing.
- Each stream: isolated worktree, one focused PR, adversarial review + visual QA
  against the references before merge.
