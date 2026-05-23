# CRM Frontend — Design Reference

**Design system base:** `engines/algorythmo/app/assets/stylesheets/` (PR #37)
**Tokens file:** `engines/algorythmo/app/assets/stylesheets/_tokens.scss`
**Components file:** `engines/algorythmo/app/assets/stylesheets/_components.scss`
**A11y criteria:** `docs/algorythmo/crm/A11Y.md`

This document is a design contract for Sessão C implementing M1-B components. It references tokens from PR #37 by exact variable name.

---

## 1. Design principles (from global DESIGN.md)

The Algorythmo CRM inherits the OS-wide principles. Specific to the Kanban:

1. **Operational clarity over decoration.** Every visual element has operational meaning. Aging colors are not aesthetic — they are a radar signal for pipeline health.
2. **Dark-first.** All components are designed on `--alg-bg` (neutral-2 dark). Light theme is a secondary target.
3. **Dense but not cramped.** `base-4` spacing. Card is ~280px wide. Multiple data points per card without feeling like a spreadsheet.
4. **States are designed.** Empty, loading, error, success — each has a first-class visual treatment. Not whitespace + "no data" text.

---

## 2. Color tokens in use

From `_tokens.scss`:

| Token | Value (dark) | Use in CRM |
|---|---|---|
| `--alg-bg` | `oklch(0.180 0.006 264)` | App background (behind Kanban) |
| `--alg-bg-raised` | `oklch(0.218 0.008 264)` | Card background |
| `--alg-bg-raised-hover` | `oklch(0.258 0.010 264)` | Card hover state |
| `--alg-bg-overlay` | `oklch(0.140 0.005 264 / 0.72)` | Drawer scrim / modal backdrop |
| `--alg-border` | neutral-5 | Stage column border, card border |
| `--alg-text-primary` | neutral-9 `oklch(0.970 0.004 264)` | Lead name, stage name |
| `--alg-text-secondary` | neutral-8 `oklch(0.690 0.012 264)` | Channel label, time-in-stage |
| `--alg-text-tertiary` | neutral-7 `oklch(0.530 0.013 264)` | Stage empty text, metadata |
| `--alg-color-brand-primary` | `oklch(0.745 0.165 195)` | CTA links, focus ring accent |
| `--alg-ring-focus` | 2px gap + 4px brand ring | All interactive elements `:focus-visible` |

---

## 3. Aging chip anatomy (D5 + D10)

Token source: `_tokens.scss` §7 "LeadAgingChip".

```
┌──────────────────────────────────────────┐
│  .alg-chip  .alg-chip--aging             │
│  data-state="green|yellow|red|neutral"   │
│                                          │
│  ┌──────────┐  ┌───────────────────────┐ │
│  │  glyph   │  │  label (time-in-stage)│ │
│  │ aria-    │  │  "Em dia · 12 min"    │ │
│  │ hidden   │  │  "Atenção · 4h 2m"   │ │
│  └──────────┘  └───────────────────────┘ │
└──────────────────────────────────────────┘
```

### State table

| State | `data-state` | Glyph | Glyph CSS | Color token | BG token | aria-label |
|---|---|---|---|---|---|---|
| Green | `"green"` | `●` | `\25CF` | `--alg-aging-green` | `--alg-aging-green-bg` | "Em dia · {time}" |
| Yellow | `"yellow"` | `◐` | `\25D0` | `--alg-aging-yellow` | `--alg-aging-yellow-bg` | "Atenção · {time}" |
| Red | `"red"` | `○` | `\25CB` | `--alg-aging-red` | `--alg-aging-red-bg` | "Atrasado · {time}" |
| Neutral | `"neutral"` | `—` | `\2014` | `--alg-aging-neutral` | `--alg-aging-neutral-bg` | "Sem alerta" |

### State computation (from T-B6)

```
if (agingCoefficient === 0 || agingCoefficient == null)
  return 'neutral'  // ← F6 guard — MUST execute before any division

ratio = secondsInStage / (12 * 3600 * agingCoefficient)

if (ratio < 1)  → 'green'
if (ratio < 2)  → 'yellow'
else            → 'red'
```

### Color values (dark theme)

- Green: `oklch(0.770 0.155 152)` — 8.2:1 on raised bg ✓ WCAG AAA
- Yellow: `oklch(0.820 0.155 85)` — 10.1:1 on raised bg ✓ WCAG AAA
- Red: `oklch(0.710 0.200 25)` — 6.8:1 on raised bg ✓ WCAG AA

---

## 4. Lead card anatomy (D5)

```
┌─────────────────────────────────────────┐
│  .alg-card  .alg-card--interactive      │
│  padding: --alg-space-card-padding (16px)│
│                                          │
│  [Avatar 32px]  [Lead name]             │  ← line 1
│                 --alg-text-primary       │
│                 --alg-text-sm (13→14px)  │
│                                          │
│  [Channel icon 16px]  [Channel name]    │  ← line 2
│                       --alg-text-sm      │
│                       --alg-text-secondary│
│                                          │
│  [AgingChip] ·· [time in stage]         │  ← line 3
│  .alg-chip--aging    --alg-text-2xs      │
│                                          │
│                                  [⋮]    │  ← menu trigger (on hover)
└─────────────────────────────────────────┘
card width: fits inside stage column (100% - 2 * gap)
min-height: 44px (touch target)
border-radius: --alg-radius-lg (12px)
shadow: --alg-shadow-xs (default) → --alg-shadow-sm (hover)
transition: box-shadow --alg-duration-fast --alg-ease-out
```

### Stage column layout

```
┌──────────────────────────────────────────────────────┐
│  Kanban  (.alg-kanban-board)                         │
│  display: flex; gap: --alg-space-3; overflow-x: auto │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ...      │
│  │ .alg-    │  │ .alg-    │  │ .alg-    │           │
│  │ stage-   │  │ stage-   │  │ stage-   │           │
│  │ column   │  │ column   │  │ column   │           │
│  │          │  │          │  │          │           │
│  │ min: 280px│  │ min: 280px│  │ min: 280px│           │
│  │ flex: 0   │  │ flex: 0   │  │ flex: 0   │           │
│  │           │  │           │  │           │           │
│  │ [Header]  │  │ [Header]  │  │ [Header]  │           │
│  │ [Card]    │  │ [Card]    │  │           │           │
│  │ [Card]    │  │ [Card]    │  │ [Empty]   │           │
│  │ [Card]    │  │           │  │           │           │
│  └──────────┘  └──────────┘  └──────────┘           │
└──────────────────────────────────────────────────────┘
```

---

## 5. Empty state anatomy (T-B16)

### Global empty (all stages have zero leads)

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│           (illustration or icon)                    │
│                                                     │
│   Os Leads vão aparecer aqui automaticamente        │
│   conforme conversas entram pelos seus canais.      │
│                                                     │
│         [ Conecte um canal agora → ]                │
│           .alg-btn (brand)                          │
│           links to /settings/inboxes/new            │
│           tabindex="0" (P3 — Tab-reachable)         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Tokens: centered on `--alg-bg`, text in `--alg-text-secondary`, CTA uses `.alg-btn` brand variant.

### Per-column empty (other stages have leads)

```
┌────────────────────┐
│  Nenhum Lead em    │
│  [stage name]      │
│  (low opacity)     │
│  --alg-text-muted  │
│  --alg-text-sm     │
└────────────────────┘
```

---

## 6. Drawer anatomy (AlgDrawer.vue — T-B9)

```
┌─────────────────────────────────────────────────────┐  ← scrim
│                                            ┌───────┐│
│                                            │ Drawer ││
│                                            │        ││
│                                            │ width: ││
│                                            │ --alg- ││
│                                            │ drawer-││
│                                            │ width  ││
│                                            │ (420px)││
│                                            │        ││
│                                            └───────┘│
└─────────────────────────────────────────────────────┘
```

Token usage:
- Width: `--alg-drawer-width` = 420px
- Animation: `slide-in` using `--alg-duration-slow` (340ms) + `--alg-ease-out`
- Scrim: `--alg-bg-overlay` with `backdrop-filter: blur(8px)`
- Z-index: `--alg-z-modal` (1000)
- Padding: `--alg-space-modal-padding` (24px = `--alg-space-6`)

Mobile (`@media (max-width: 768px)`): width becomes `100vw`.

---

## 7. Spacing reference

Tokens from `_tokens.scss` §9:

| Context | Token | Value |
|---|---|---|
| Inside card | `--alg-space-card-padding` | 16px |
| Inside dense card | `--alg-space-card-padding-tight` | 12px |
| Between cards | `--alg-space-card-gap` | 12px |
| Stage column gap | `--alg-space-3` | 12px |
| Page padding desktop | `--alg-space-page-padding-desktop` | 32px |
| Modal / drawer padding | `--alg-space-modal-padding` | 24px |

---

## 8. Motion reference

Tokens from `_tokens.scss` §12:

| Context | Duration | Easing |
|---|---|---|
| Card hover (shadow) | `--alg-duration-fast` (140ms) | `--alg-ease-out` |
| Drawer slide-in | `--alg-duration-slow` (340ms) | `--alg-ease-out` |
| Drag drop preview | `--alg-duration-instant` (80ms) | `--alg-ease-out` |
| Toast appear | `--alg-duration-base` (220ms) | `--alg-ease-out` |
| Optimistic card move | immediate (no animation) | — |

`@media (prefers-reduced-motion: reduce)` — all durations collapse to 1ms (already in tokens).

---

## 9. Components to implement (Sessão C checklist)

From `docs/plans/0002-m1-trilha-b-frontend-crm.md` §1.2 gaps:

| Component | CSS class | File |
|---|---|---|
| Drawer | `.alg-drawer` (add to `_components.scss`) | `AlgDrawer.vue` |
| Menu | `.alg-menu` (add to `_components.scss`) | `AlgMenu.vue` |
| Toast | `.alg-toast` (add to `_components.scss`) | `AlgToast.vue` + `AlgToastContainer.vue` |
| Avatar | `.alg-avatar` (add to `_components.scss`) | `AlgAvatar.vue` |

These are gaps explicitly called out in `engines/algorythmo/app/assets/stylesheets/DESIGN.md §7.4` and delegated to Sessão C.

Each new component class must be added to `_components.scss` with a `// algorythmo: design-system-import` comment at the block start (this tag is in the `check-soft-fork-zone.sh` allowlist), and documented in `engines/algorythmo/DESIGN.md` §3.7-3.10.
