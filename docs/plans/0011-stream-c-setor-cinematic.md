# Plan 0011 — Stream C: Setor Cinematic

Status: DRAFT → IN PROGRESS
Base branch: `algorythmo/round-0011-integration`
Working branch: `algorythmo/stream-c-setor-cinematic`
PR target: `algorythmo/round-0011-integration` (NOT main)

Derived from the founder's Design Brief v3, Stream C. This plan covers the
three scarred problems on the **sector** pages: (1) the sticky agent chat that
covers content on scroll, (2) the color "carnival" (one color per sector, beam
white, icons monochrome), and (3) the glowing border **beam that still renders
static** despite a prior documented "fix".

This is the third+ time the beam has been requested. The body of this plan opens
with the root-cause of why every prior fix failed — because the fix that shipped
last time addressed a *different* root cause than the one that actually breaks
it on the founder's machine.

---

## 1. Why the previous beam "fix" failed (and why mine works)

### What the previous fix believed the bug was
The prior commit (`d360794f0` / `6d0b1dd59`) correctly identified ONE real bug:
a Vue **scoped** `<style>` cannot host a working global `@property`, so the
`--alg-aurora-angle` custom property was treated as un-registered → non-
interpolable → the conic-gradient `from <angle>` jumped discretely (and, because
a conic gradient is periodic, `0deg == 360deg`, so it looked frozen). That fix
moved the `@property` registration + the conic ring CSS into the GLOBAL engine
stylesheet `engines/algorythmo/app/assets/stylesheets/_components.scss`. That part
is correct and I keep it.

### Why it STILL renders static on the founder's screen
The animation is killed a **second** time, downstream, by the global
reduced-motion policy in `_tokens.scss` — and the founder runs Windows with
"animation effects off" (he flagged this himself: *"common on Windows"*). Two
compounding kill-switches both fire under `@media (prefers-reduced-motion: reduce)`:

1. **`_tokens.scss` lines 888–890** collapse the ambient duration tokens to
   `1ms`:
   ```scss
   --alg-duration-ambient-fast: 1ms;
   --alg-duration-ambient:      1ms;
   --alg-duration-ambient-slow: 1ms;   // ← the beam reads this one
   ```
   The beam animation is `alg-aurora-border-travel var(--alg-duration-ambient-slow)`.
   At `1ms` it completes a full 0→360° loop every millisecond — invisibly fast,
   i.e. it looks static (a smear, then nothing).

2. **`_tokens.scss` lines 897–904** then apply a universal `!important`
   kill-switch to *everything*:
   ```scss
   *, *::before, *::after {
     animation-duration: 0.01ms !important;
     animation-iteration-count: 1 !important;   // ← runs ONCE, then dead
     ...
   }
   ```
   `animation-iteration-count: 1 !important` means the beam runs a single 0.01ms
   pass and **stops forever**. The local override the prior fix added in
   `_components.scss` (`.alg-aurora-border__beam { animation-duration: 28s }`
   under reduced-motion) is **out-ranked by the `!important` universal rule** —
   it never takes effect. So the prior "we slow it to 28s under reduced-motion"
   comment is a lie on screen: the universal `!important` wins.

That is the actual scar: **the beam's signature motion is destroyed by the global
reduced-motion policy, on exactly the machine the founder reviews on.** No amount
of conic-gradient/`@property` correctness fixes a beam that the cascade has
explicitly turned off.

### Why my fix works
The beam is a **slow ambient gradient drift**, not the rapid/parallax/scroll
motion that the `prefers-reduced-motion` contract exists to suppress (WCAG 2.3.3
targets motion that can trigger vestibular discomfort — large translational/
parallax movement, not a calm hue arc on a hairline). The founder has explicitly,
repeatedly required this beam to MOVE. So I make the beam an **exception** to the
universal kill-switch, scoped narrowly:

- Add a single, surgical exception inside the reduced-motion block in
  `_tokens.scss` that re-grants the beam a continuous (slowed, calm) animation,
  with the `!important` specificity needed to beat the universal `*` rule:
  ```scss
  @media (prefers-reduced-motion: reduce) {
    .alg-aurora-border__beam {
      animation-duration: 24s !important;
      animation-iteration-count: infinite !important;
    }
  }
  ```
  This is placed in `_tokens.scss` (where the kill-switch lives) so it sits in
  the same cascade layer and the same media block, guaranteeing it wins the
  `!important` tie by source order. The 24s calm loop is non-distracting and
  honours the *intent* of reduced-motion while keeping the signature alive.

- I also remove the now-redundant/ineffective reduced-motion override in
  `_components.scss` (the 28s one that never applied) to avoid two sources of
  truth.

Net: the beam interpolates (correct `@property`, global), sweeps the full
rounded-rect perimeter (correct conic mask), AND is no longer silently killed by
the reduced-motion policy on the founder's machine.

### How a reviewer confirms the arc MOVES (frame-to-frame)
1. Open any sector page (e.g. Comercial). The hero band is `.alg-shell__chat`
   (the `AlgAuroraBorder` root).
2. In DevTools, inspect `.alg-aurora-border__beam`. In the **Computed** panel,
   watch `--alg-aurora-angle`: it must tick continuously `0deg → 360deg` over
   `--alg-duration-ambient-slow` (8s normal). If it is stuck at one value, the
   `@property` did not register (regression).
3. Visually: a single bright **ICE/white arc** (~30° of bright span) must travel
   the WHOLE perimeter — top → right edge → bottom → left edge → back to top —
   like a comet. It must NOT light the whole border at once, and must NOT light
   only one side.
4. Toggle OS reduce-motion ON (or DevTools → Rendering → "Emulate prefers-
   reduced-motion: reduce"). The arc must STILL travel, just slower (~24s loop).
   Before this fix it freezes; after, it continues.
5. Confirm the body/content inside the band is **never tinted** — only the
   hairline ring paints (the mask cuts the centre out).

---

## 2. Bug — sticky agent chat covers content on scroll

### Root cause
`engines/.../_components.scss` `.alg-shell__chat` is `position: sticky; top: 0;
z-index: 2` inside `.alg-shell` (the `overflow-y: auto` scroll container). The
hero band is tall (planet `lg` + heading + composer + `space-6` padding). As the
user scrolls the data grid, the sticky band stays pinned to the top of the
viewport and **permanently occludes** the top band of content behind it — the
KPI grid scrolls *under* an opaque panel. That is the founder's "the chat covers
the data" complaint: it is working as coded (sticky), but sticky-at-top of a
tall hero is occlusion by design.

### Fix
The agent hero must **coexist**, never cover. The hero flows in the document and
scrolls away with the page; the data grid then owns the full viewport once you
scroll past the agent. Concretely:
- Remove `position: sticky; top: 0; z-index: 2` from `.alg-shell__chat`. The band
  becomes a normal in-flow block at the top of the sector (still first, still
  above the tablist — DOM order unchanged, the existing spec assertion holds).
- Keep it a SOLID opaque elevated surface (brief: cards are solid, not glass) and
  keep the Aurora frame + glow. Solidity no longer matters for occlusion (nothing
  is pinned over content) but stays for the depth-by-light ruler.
- Verify at 375 / 768 / 1280 / 1920: at every width the band scrolls away and the
  data below is fully readable at all scroll positions. (At ≤768 it was already
  `position: static`, so mobile is unaffected.)

This is the minimal, robust fix and matches the brief's instruction ("proper
layout flow / reserved space … readable at all scroll positions"). A collapsible
dock was considered and rejected: it adds state + an occluding floating element,
the exact failure mode we are removing.

---

## 3. Kill the color carnival

Founder rule (verbatim): *"manter a ideia de uma cor por setor todos diferentes
e o feixe de luz da borda dos agentes deve ser branco."* Minimalism: *"pontos de
luz só onde há necessidade de percepção."* Inadmissible: *"Ícones coloridos ou
com fill."*

### 3a. Beam = WHITE / ICE, universal (no per-sector tint)
Today `.alg-aurora-border__beam` consumes `--alg-sector-hue` so the beam takes
each sector's hue (the "ice-tint per sector" of the last commit). Founder reversed
this: the beam is WHITE on every sector. Change `--alg-beam-h`/`--alg-beam-c` to a
fixed neutral ICE register (high L, near-zero chroma) and stop reading
`--alg-sector-hue`. The bright arc becomes white/ice everywhere; the dim base ring
likewise. The `--alg-ice-*` tokens already encode this register — reuse them.

### 3b. Icons = MONOCHROMATIC white in opacity tiers
Remove the sector-hue tint from icons. Specifically delete the override
`[class*='alg-shell--'] .alg-kpi-tile__icon { color: oklch(... var(--alg-sector-hue)) }`
so the KPI icon falls back to its neutral `.alg-kpi-tile__icon { color: var(--alg-fg-tertiary) }`.
Codify the founder's exact tier set as tokens so every monochrome glyph uses them:
`rgba(250,250,250, 1 / .72 / .48 / .28)`. Icons already use `stroke="currentColor"`
+ `fill="none"` (audited across all 8 OverviewPanes) — so no SVG edits needed; only
the driving `color` changes. No filled icons exist to remove.

### 3c. One signature color per sector, ONE strategic point only
Each sector keeps its single hue, but it is applied at exactly one place: the
sector's **identity + active/selected accent**, never the beam, never icons,
never scattered figures. Decisions:
- **Sector identity orb** = `AlgPlanetAvatar` in the hero. It is hash-derived
  from the agent seed (its own Aurora-family palette) — this is the agent's
  planet, a sanctioned chroma surface, and it is the single bright identity point
  per sector. Left as-is (it is not "scatter"; it is THE one point).
- **Active accent** = the selected sub-tab. Today `.alg-shell__tab--active` uses
  a neutral glass + primary fg. Tint the active tab's accent (a hairline underline
  / left-marker and the active label) with `--alg-sector-hue` so the sector's
  color marks the selected state — the brief's "active/selected-state accent".
- **Remove scattered sector color from figures**: drop the `.alg-sector-ink`
  application on KPI values (the hue-colored numbers) so the data reads as
  white + dark canvas. (The `.alg-sector-ink` class + the `--alg-sector-hue`
  map are retained for the single active-accent point.) Delta pills stay SEMANTIC
  (up=green/down=red) — that is meaning, not a sector accent; unchanged.

### 3d. No repeats across sectors
The 8 hues are already spread around the wheel with no repeats (audited):
commercial 160, marketing 65, operations 240, procurement 320, hr 12,
facilities 195, finance 120, administration 275. Verified distinct. The final
per-sector color map is recorded in the PR description and in `_components.scss`
comments.

---

## 4. Files touched (planned)
- `engines/algorythmo/app/assets/stylesheets/_components.scss`
  - `.alg-aurora-border__beam`: drop sector-hue, make ICE/white universal.
  - delete the ineffective reduced-motion 28s override (moved to `_tokens.scss`).
  - delete `[class*='alg-shell--'] .alg-kpi-tile__icon` hue override.
  - `.alg-shell__chat`: remove sticky/top/z-index (in-flow).
  - `.alg-shell__tab--active`: add sector-hue accent (selected state).
- `engines/algorythmo/app/assets/stylesheets/_tokens.scss`
  - add monochrome icon opacity-tier tokens (`--alg-icon-1..4`).
  - add the surgical reduced-motion beam exception (keeps the beam moving).
- KPI tile / overview panes: stop applying `.alg-sector-ink` to figures where it
  scatters color (audit; minimal edits, panes already mostly neutral).
- `app/javascript/dashboard/components-next/algorythmo/specs/AlgAuroraBorder.spec.js`
  (new) — asserts the global `@property` + keyframe + white/ICE beam (no sector
  hue) + reduced-motion still animates. Lives in the already-globbed specs dir.
- `app/javascript/dashboard/modules/algorythmo/admin/sectors/specs/SectorShellV2.spec.js`
  — add an assertion that the chat band is NOT sticky (no `position: sticky`),
  guarding the overlap regression. Registered explicitly in CI already.
- `.github/workflows/run_foss_spec.yml` — register the new AlgAuroraBorder spec
  if not covered by the existing `components-next/algorythmo/specs` glob (it is —
  confirm only).

## 5. Definition of done
- Plan doc (this file) committed first.
- Sticky overlap fixed; beam rebuilt + provably animatable incl. reduced-motion;
  every sector one-color + white beam + monochrome icons, no repeats.
- Build/lint pass; relevant vitest run; new spec registered; eslint clean on
  changed files.
- ONE PR into `algorythmo/round-0011-integration`.
