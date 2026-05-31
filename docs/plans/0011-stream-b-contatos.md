# Plan 0011 — Stream B: Contatos Rework

**Branch:** `engineer/stream-b-contatos`
**Base / target:** `algorythmo/cinematic-delivery`
**Scope:** Contacts area UX — drop sub-tab, premium empty state, import wire-up

---

## Problem

The Contacts sidebar entry today shows a "All Contacts" child tab that the user must click before landing on contact content. The empty state is generic (blurred ghost cards + a Create button). Neither matches the Brief v3 Hero-band spec.

## What changes (exactly)

### 1. Remove the "All Contacts" sub-tab from the sidebar
- In `Sidebar.vue`, the `Contacts` menu item has a `children` array whose first child is `{ name: 'All Contacts', ... }`.
- Remove that child. Keep Segments and Tagged With children (they're useful navigation).
- The parent `Contacts` item must gain a direct `to` and `activeOn` pointing at `contacts_dashboard_index` / `contacts_edit` so clicking "Contacts" in the sidebar lands directly at the contacts list.

### 2. Premium empty state (Hero-band)
Replace `ContactEmptyState.vue` with a component that follows the Hero-band ruler:
- Generous top padding (96–128px via Tailwind `pt-24 lg:pt-32`).
- Headline: short, editorial, low-opacity ("Seus contatos aparecerão aqui.").
- Subtitle: even lighter opacity, smaller weight ("Importe uma lista ou aguarde o primeiro contato chegar.").
- BELOW the text: a single `+` icon (line-style, `i-lucide-plus`, thin, size-5, `text-n-slate-9`), acting as a subtle clickable affordance to create a contact. NOT a filled button — just the icon, center-aligned.
- Import row: a text link "Importar lista de contatos existente" beneath the `+`, triggering the existing `ContactImportDialog`.
- Entrance animation via `useAlgMotion` / `algReveal`, respecting `prefers-reduced-motion`.
- No ghost contact cards (remove the backdrop pattern — the emptiness is the asset).
- The `showButton` prop is dropped; the component is self-contained for the new design.

### 3. Keep existing import flow
`ContactImportDialog` already exists and is working. The empty state just needs to wire up a ref to it and open it. No new parsing code needed.

---

## Files touched

| File | Change |
|------|--------|
| `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` | Remove `All Contacts` child; add `to` + `activeOn` to parent `Contacts` item |
| `app/javascript/dashboard/components-next/Contacts/EmptyState/ContactEmptyState.vue` | Full rewrite — Hero-band spec |
| `app/javascript/dashboard/routes/dashboard/contacts/pages/ContactsIndex.vue` | Wire import dialog into `showEmptyStateLayout` path |

Secondary/supporting:
| File | Change |
|------|--------|
| `engines/algorythmo/app/javascript/i18n/overrides/en.json` | Add `CONTACTS_LAYOUT.EMPTY_STATE` Hero-band strings |
| `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json` | Same keys in PT-BR |

---

## Design ruler checklist

- [ ] Subtraction before addition: no new components beyond the empty state rewrite.
- [ ] 8pt grid: spacing uses multiples of 8px (Tailwind p-6=24, pt-24=96, pt-32=128).
- [ ] Inner ≤ outer spacing: icon margin smaller than section padding.
- [ ] Typography: Inter (system default), text opacity tiers (not pure white).
- [ ] Motion: `algReveal` from existing `useAlgMotion`, reduced-motion respected.
- [ ] Icons: `i-lucide-plus` line stroke, no fill color.
- [ ] No build/lint regressions.

---

## Definition of done

1. Plan doc written (this file).
2. "All Contacts" sub-tab removed; "Contacts" in sidebar links directly to `contacts_dashboard_index`.
3. Empty state: Hero-band layout, low-opacity headline, subtle `+` icon, import text link.
4. Import entry wired to the existing `ContactImportDialog` (not duplicated).
5. `pnpm run eslint` clean on changed files.
6. Relevant vitest runs (no new spec needed — no new composable/utility logic added).
7. PR opened into `algorythmo/cinematic-delivery`.
