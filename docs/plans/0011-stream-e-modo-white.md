# Plan 0011 — Stream E: Modo White (light theme)

Status: APPROVED (this doc is the approved plan).
Branch from: `algorythmo/round-0011-integration`. PR back into the same branch (NOT main).
Author: designer / Cinematic OS / 2026-05-31

## Goal

The dark "command room" theme is approved and frozen. The opt-in light ("paper")
theme already has ~70% of its infrastructure (`themeHelper.js` toggles `.dark` +
`data-theme='white'`; `_tokens.scss` has a full `[data-theme='white']` paper
block; `_chrome.scss` remaps the host Chatwoot Radix chrome to paper). Two things
are missing:

1. **No UI control** to switch theme where the founder expects it (the account
   branding settings, next to the logo + account name).
2. **No audit** that paper mode is actually world-class on every surface — in
   particular this round's new surfaces, and the **Aurora beam** (white/ice on
   paper = invisible).

Do NOT change dark-mode appearance. Only make light mode coherent and premium.

## Constraints / doctrine

- Elevation in light mode reads by **shadow + paper tone**, never by getting
  lighter (inverse of the dark rule). The `[data-theme='white']` elevation tokens
  already do this — verify, don't reinvent.
- No hardcoded dark hex / `rgba(255,255,255,…)` text/stroke colors that break on
  paper. Everything routes through `--alg-*` tokens that have a paper variant.
- Typography in light mode: ink in 4 near-black opacity tiers (already in tokens).
- Spring motion on the toggle, monochrome icons, `prefers-reduced-motion` honored.
- Beam stays animating in BOTH themes; reduced-motion exception preserved.

## Work breakdown

### E1 — Theme toggle control (in account branding settings)
- New component `AlgThemeControl.vue` (components-next/algorythmo): a segmented
  control — Claro / Escuro / Auto — monochrome Lucide icons, spring press, no
  glass on the control itself (a solid token-backed surface; glass on a settings
  form control would muddy legibility). Reads + writes `LOCAL_STORAGE_KEYS.COLOR_SCHEME`,
  calls the existing `setColorTheme()` so BOTH systems flip. Applies on mount so
  the visible selection matches the live theme. Emits nothing upstream — it owns
  its own persistence (mirrors `useAppearanceHotKeys`).
- Mount it in `routes/dashboard/settings/account/Index.vue` as a new
  `SectionLayout` block ("Aparência") directly under the General section (where
  the logo + name live), so it sits exactly where the founder asked.
- i18n keys under `GENERAL_SETTINGS.FORM.APPEARANCE_SECTION` (en + pt_BR overlay
  parity — the i18n overlay spec enforces parity).

### E2 — Aurora beam: paper-mode treatment (token-driven)
- The beam conic gradient in `_components.scss` hardcodes high-L `oklch(...)` ice
  stops (white comet). On paper that's invisible. Introduce beam-tone tokens:
  - `--alg-beam-l-peak / -bright / -mid / -edge` (lightness stops) and
    `--alg-beam-c` / `--alg-beam-h` already exist as cast.
  - Dark theme: keep current high-L values (white/ice comet) — UNCHANGED look.
  - `[data-theme='white']`: flip to INK stops (low L, near-black) so the comet
    reads as a dark travelling arc on paper. Same motion, same mask, same arc.
- Re-express the conic gradient stops in terms of these tokens. Verify the
  `--alg-aurora-border-base` dim ring + `--alg-aurora-border-glow` also get a
  paper variant (ink-tinted, low alpha) so the static frame + glow read on paper.
- Keep the reduced-motion beam exception intact (it animates the angle property;
  token color change does not touch it).

### E3 — Chart line colors (8 sector subtab panes)
- All 8 `*SubtabPane.vue` hardcode `borderColor: rgba(255,255,255,.72)` +
  `backgroundColor: rgba(255,255,255,.06)` — a white line/fill, invisible on
  paper (Chart.js paints to canvas; CSS vars don't reach it directly).
- New composable `useAlgChartTheme()` (composables/algorythmo): observes the
  active theme (`data-theme` on `<html>` via MutationObserver) and returns
  reactive `lineColor` / `fillColor` (white tiers in dark, ink tiers in paper).
  Reads the resolved token values off `getComputedStyle(document.documentElement)`
  so the colors always match the token system. Falls back to safe literals if
  unavailable (SSR / test).
- Wire it into all 8 panes (replace the two hardcoded literals).

### E4 — Other paper leaks
- `BrainViewer.vue:102` fallback `rgba(255,255,255,0.45)` → route through a token
  with a paper variant (`var(--alg-fg-tertiary)` fallback chain).
- Aurora Orb / Planet Avatar SVG fills (magenta gradient, white specular) are
  IDENTITY objects — they stay identical in both themes by doctrine. NOT touched.
  Documented as intentional.

### E5 — Tests + CI
- `AlgThemeControl.spec.js` (mount, click each segment → asserts LocalStorage.set
  + setColorTheme called; selected state reflects stored value).
- `useAlgChartTheme.spec.js` (returns ink colors under data-theme='white', white
  under dark; reacts to attribute change).
- Beam token spec: assert `_tokens.scss` defines the paper beam tokens (string
  presence) — guards against regression of the invisible-beam bug.
- Register all new specs in `.github/workflows/run_foss_spec.yml` vitest include.

## Definition of done
- Toggle visible in account settings, persists + applies on load.
- Beam visible + animating in paper mode (ink comet); dark beam unchanged.
- All 8 charts legible on paper; no white-on-paper leaks remain in listed surfaces.
- Lint + relevant vitest green; specs registered in CI.
- ONE PR into `algorythmo/round-0011-integration`.

## Live visual QA (cannot render light mode here — must be checked in browser)
Listed surface-by-surface in the PR / final message.
