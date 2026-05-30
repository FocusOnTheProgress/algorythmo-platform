# Cinematic OS — Shared Motion System (A6)

One motion library for the whole platform. Brain (Stream D) and the C-level
surfaces (Stream E) animate entrances and staggers from a single helper so the
curve, the durations and the reduced-motion contract are identical everywhere —
never hand-rolled per screen.

## Library

[`motion`](https://motion.dev) (Motion One), ~5 kb runtime, WAAPI-backed.
Chosen over GSAP (heavier, license friction for some use) and Framer Motion
(React-only). Motion One gives spring-free, token-aligned entrances with
first-class `stagger`, which is all the entrance/stagger orchestration the OS
needs. If a future surface genuinely needs timeline orchestration that Motion
One can't express, GSAP can be added then — not pre-emptively.

## Helper

`app/javascript/dashboard/composables/algorythmo/useAlgMotion.js`

Exposes a thin, opinionated surface (NOT the full Motion API):

| Export | Purpose |
|---|---|
| `algReveal(el, opts)` | Single-element entrance — fade + small upward lift. |
| `algStagger(els, opts)` | Staggered entrance across a list/grid. |
| `algAmbient(el, keyframes, opts)` | Looping ambient breath (symmetric easing, `reverse`). |
| `useAlgMotion(rootRef)` | Composable wrapper bound to a root ref. |
| `prefersReducedMotion()` | Live media-query read. |
| `ALG_EASE_CINEMATIC` / `ALG_EASE_AMBIENT` | Curves mirrored from the CSS tokens. |
| `ALG_DURATION` | Duration scale (seconds) mirrored from `--alg-duration-*`. |

### Doctrine baked in (DESIGN.md §3.7 / §10.4)

- Default ease is the Apple cinematic curve (`--alg-ease-cinematic`).
- Entrances feel ease-out; durations come from the DESIGN.md scale.
- Spring is **not** exposed — it stays a rare, hand-authored delight moment.
- `prefers-reduced-motion: reduce` collapses every entrance to an instant
  opacity settle (no transform travel) and parks ambient loops at a static
  mid-frame. The presence stays; the motion stops.

## Consuming it

Entrance on mount (the common case):

```js
import { ref, onMounted } from 'vue';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';

const root = ref(null);
const { revealChildren } = useAlgMotion(root);
onMounted(() => revealChildren('[data-alg-reveal]', { each: 0.06 }));
```

```html
<section ref="root">
  <article data-alg-reveal>…</article>
  <article data-alg-reveal>…</article>
</section>
```

Or use the functions directly:

```js
import { algReveal, algStagger, algAmbient } from 'dashboard/composables/algorythmo/useAlgMotion';

algReveal(headerEl, { y: 16, duration: 0.52 });          // hero reveal
algStagger(cardEls, { each: 0.05 });                     // grid stagger
algAmbient(haloEl, { scale: [1, 1.06, 1] }, { duration: 6 }); // orb halo breath
```

CSS-only transitions still belong in `.alg-*` classes / scoped styles for simple
hover/focus/press. Reach for this helper when you need **entrance choreography**
(reveals, staggers) or **JS-driven ambient loops** that must share one curve and
one reduced-motion contract across streams.
