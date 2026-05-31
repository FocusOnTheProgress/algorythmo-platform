# Plan 0011 — Stream D: Tela "Início"

**Status:** in progress
**Owner:** designer agent
**Base branch:** `algorythmo/cinematic-delivery` (PR into it, NOT main)
**Design source:** Design Brief v3 + founder change list (this prompt). DESIGN.md (Cinematic OS v2) is the system of record for tokens/components.

---

## 1. What this ships

A new **Início** screen — the first surface the user lands on when the app loads.
It is a SIGNATURE hero surface, built to the DESIGN.md hero-band ruler, and it is
set as the default landing route. Content:

1. **Dynamic greeting** — bom dia / boa tarde / boa noite by local time + the
   logged-in user's first name. Display-lg, weight 300, negative tracking, high
   opacity (it is the welcome, not ghostly chrome).
2. **Catch-up Hub ("Enquanto você estava fora")** — data translated into human,
   actionable language ("Sua equipe avançou em 2 projetos desde ontem. Você tem
   1 aprovação pendente."). DEMO data now, structured so a real source drops in
   later via a clearly-marked demo provider.
3. **2–3 Smart Actions (contextual)** — only the 2–3 things the user likely does
   next, varying by time of day via a simple heuristic. Solid/ghost buttons per
   the ruler (no glass on buttons).
4. **Invisible system status** — a near-imperceptible pulsing sync line. NEVER a
   full "Carregando…" screen or a generic spinner.

The hero reuses the existing **AlgAuroraOrb** (the living-intelligence object) —
exactly one instance, per the sacredness rule (§6.2). Início has clear
"intelligence" semantics (it is the panorama the platform's intelligence
assembled for you), so the orb belongs here.

## 2. Out of scope (owned by other streams)

Contacts, sidebar conversation restructure, sector pages, the beam, theme/white
files. The ONLY shared file touched is the router + the sidebar nav, and only to
register Início + make it the default landing.

## 3. Architecture

```
app/javascript/dashboard/modules/algorythmo/admin/inicio/
  InicioScreen.vue        — the screen (hero band, composes the parts below)
  GreetingHero.vue        — greeting + ambient AlgAuroraOrb + invisible sync line
  CatchUpHub.vue          — "Enquanto você estava fora" human catch-up cards
  SmartActions.vue        — 2–3 contextual next-best-action buttons
  inicio.demo.js          — DEMO / REAL-WIRING boundary (provider + heuristics)
  routes.js               — route registration (default landing)
  specs/InicioScreen.spec.js
```

- **Demo boundary.** `inicio.demo.js` exports a `getInicioBriefing()` provider
  returning the shape the UI consumes (catch-up items + smart-action ids), plus
  pure helpers `greetingKeyForHour(hour)` and `smartActionsForHour(hour)`. Every
  real-wiring seam carries a `TODO(real-wiring)` comment. Swapping the provider
  for the OS layer never touches the Vue components — same as `clevels.demo.js`.
- **Motion.** Entrances via `useAlgMotion` (cinematic stagger). The orb breathes
  on its own ambient loop. The sync line is a CSS opacity pulse on the ambient
  curve. All respect `prefers-reduced-motion` through the existing primitives.
- **Tokens.** Hero band uses `.alg-density-hero` + `--alg-*` tokens only. No
  hard-coded hex. Greeting in display face (`--alg-text-4xl`, weight 300,
  `--alg-tracking-tightest`). Body 14–16px. White in opacity tiers, never #FFF.
- **Cards.** Catch-up items render on `AlgGlassCard` (real glass + grain +
  hairline + inset highlight) — the system's elevated surface.

## 4. Routing / default landing

- New route `algorythmo_admin_inicio` at `accounts/:accountId/inicio`, meta
  `permissions: ['administrator', 'agent', 'custom_role']` so any logged-in user
  lands here (Início is the universal welcome, not an admin-only sector).
- Make Início the default landing: change `defaultRedirectPage` in
  `helper/routeHelpers.js` so the primary `path` resolves to `inicio` (it
  currently resolves to `dashboard`). This is the minimal, single-line shared
  change. Conversations remain reachable via the sidebar exactly as today.
- Register the route file in `dashboard.routes.js` (one import + one spread).

## 5. Sidebar entry

Add a top-of-list **Início** entry (icon `i-lucide-house`) as the very first
item, above the Operacional block, with `activeOn: ['algorythmo_admin_inicio']`.
Consistent with existing nav item shape. No section header (it stands alone at
the top, like a home).

## 6. i18n

Add an `ALGORYTHMO_ADMIN.INICIO` block + `SIDEBAR.ALG_INICIO` to the engine
override files (`en.json` + `pt_BR.json`). Greeting keys with `{name}`. Default
runtime locale is pt-BR; both overrides stay in parity (the i18n overlay spec
enforces structural parity).

## 7. Tests + CI

- `specs/InicioScreen.spec.js` (vitest, jsdom): greeting key by hour, first-name
  extraction, catch-up items render from the demo provider, smart actions count
  is 2–3 and varies by hour, invisible sync line present (no spinner), reduced
  motion path. Motion One mocked + vue-i18n stubbed (same pattern as the
  CLevels spec).
- Register the spec in `.github/workflows/run_foss_spec.yml` explicit include
  list (CI uses an explicit list, not a glob).

## 8. Definition of done

Plan doc (this) → implementation to the hero-band ruler → default landing wired
→ build/lint pass, vitest green, spec registered, eslint on changed files clean
→ single PR into `algorythmo/cinematic-delivery`.
