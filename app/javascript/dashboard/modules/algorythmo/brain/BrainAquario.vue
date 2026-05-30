<script setup>
// algorythmo: Brain "Aquário" — the company's knowledge hub (Cinematic OS).
//
// Round-3 rebuild. The Aurora sphere is structurally the HUB: it sits in the
// centre cell of a grid, with LIVING glass knowledge cards arranged around it
// (real gaps, no overlap) and hand-aimed light conduits reaching from the orb
// to each card — connecting, never slicing (round-2 was rejected for a flat
// magenta ball loose in the middle cutting a 2×2 of static KPI numerals).
//
// The cards are recent/relevant company knowledge (an ingested doc, a learned
// fact, a consolidated decision) — glass, never aurora. They breathe with a
// staggered ambient pulse. Below the stage, a signature dropzone (AlgAuroraBorder
// + glow) invites the founder to feed the Brain — the "borda brilhante animada".
//
// Frontend-only / demo for now (M3+ data plugs in once the Brain backend is
// stable). The Aurora gradient appears ONLY through AlgAuroraOrb + its conduits
// (sacred). Everything else is glass / fg-opacity / hairline tokens. The demo
// watermark keeps the illustrative nature honest (same convention as sectors).
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraOrb } from 'dashboard/components-next/algorythmo';
import BrainDropzone from './BrainDropzone.vue';

const { t } = useI18n();

// Six living knowledge cards positioned around the orb. `pos` maps each card to
// a grid cell (the orb owns the centre); `conduit` is the hand-aimed ray that
// reaches it — irregular angle + length tuned so the beam fades into the card,
// never through it. `glyph` is a lucide icon class; `kind` tints the meta dot.
const cards = computed(() => [
  {
    id: 'doc-mvm',
    pos: 'tl',
    glyph: 'i-lucide-file-text',
    kind: 'source',
    conduit: { angle: 209, length: 188, delay: 0 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DOC_MVM.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DOC_MVM.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DOC_MVM.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DOC_MVM.META'),
  },
  {
    id: 'fact-voice',
    pos: 'tr',
    glyph: 'i-lucide-message-square-quote',
    kind: 'human',
    conduit: { angle: 331, length: 188, delay: 0.5 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.FACT_VOICE.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.FACT_VOICE.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.FACT_VOICE.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.FACT_VOICE.META'),
  },
  {
    id: 'decision-dream',
    pos: 'ml',
    glyph: 'i-lucide-git-merge',
    kind: 'auto',
    conduit: { angle: 180, length: 150, delay: 1.0 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DECISION.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DECISION.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DECISION.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.DECISION.META'),
  },
  {
    id: 'lead-recent',
    pos: 'mr',
    glyph: 'i-lucide-user-round-check',
    kind: 'human',
    conduit: { angle: 0, length: 150, delay: 0.75 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.LEAD.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.LEAD.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.LEAD.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.LEAD.META'),
  },
  {
    id: 'doc-catalog',
    pos: 'bl',
    glyph: 'i-lucide-boxes',
    kind: 'source',
    conduit: { angle: 151, length: 188, delay: 1.25 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.CATALOG.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.CATALOG.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.CATALOG.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.CATALOG.META'),
  },
  {
    id: 'auto-signal',
    pos: 'br',
    glyph: 'i-lucide-activity',
    kind: 'auto',
    conduit: { angle: 29, length: 188, delay: 0.25 },
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SIGNAL.LABEL'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SIGNAL.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SIGNAL.BODY'),
    meta: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SIGNAL.META'),
  },
]);

// Aimed conduits handed to the orb, matched 1:1 to the card positions above.
const aimedConduits = computed(() => cards.value.map(c => c.conduit));

// Live count of knowledge layers — single coherent figure for the header.
const layerCount = computed(() =>
  t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYER_COUNT')
);

// Dropzone hover state — demo only (no upload backend yet). @dragover/@drop just
// drive the visual "armed" state so the borda brilhante reacts to a real drag.
const isDragging = ref(false);
</script>

<template>
  <section
    class="alg-aquario"
    :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.ARIA_LABEL')"
  >
    <span class="alg-aquario__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.DEMO_WATERMARK') }}
    </span>

    <!-- editorial header -->
    <header class="alg-aquario__head">
      <p class="alg-aquario__eyebrow">
        {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.EYEBROW') }}
      </p>
      <h1 class="alg-aquario__title">
        {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.TITLE') }}
      </h1>
      <p class="alg-aquario__subtitle">
        {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.SUBTITLE') }}
      </p>
    </header>

    <!-- The living core as a structural hub: orb in the centre cell, knowledge
         cards in the cells around it with real gaps, conduits aimed at each. -->
    <div
      class="alg-aquario__stage"
      role="group"
      :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.STAGE_ARIA')"
    >
      <!-- centre cell: the Aurora core -->
      <div class="alg-aquario__core">
        <AlgAuroraOrb
          :size="120"
          :aimed-conduits="aimedConduits"
          :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.ORB_ARIA')"
        />
        <span class="alg-aquario__core-count" aria-hidden="true">
          {{ layerCount }}
        </span>
        <span class="alg-aquario__core-label">
          {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYER_COUNT_LABEL') }}
        </span>
      </div>

      <!-- living knowledge cards (glass, never aurora) -->
      <article
        v-for="(card, i) in cards"
        :key="card.id"
        class="alg-aquario__card"
        :class="`alg-aquario__card--${card.pos}`"
        :style="{ '--alg-card-delay': `${(i * 0.6).toFixed(2)}s` }"
      >
        <span class="alg-aquario__card-grain" aria-hidden="true" />
        <header class="alg-aquario__card-head">
          <span
            class="alg-aquario__card-icon"
            :class="card.glyph"
            aria-hidden="true"
          />
          <span class="alg-aquario__card-label">{{ card.label }}</span>
        </header>
        <h3 class="alg-aquario__card-title">{{ card.title }}</h3>
        <p class="alg-aquario__card-body">{{ card.body }}</p>
        <footer class="alg-aquario__card-foot">
          <span
            class="alg-aquario__card-dot"
            :class="`alg-aquario__card-dot--${card.kind}`"
            aria-hidden="true"
          />
          <span class="alg-aquario__card-meta">{{ card.meta }}</span>
        </footer>
      </article>
    </div>

    <!-- 2nd fold: signature ingestion dropzone (borda brilhante animada) -->
    <BrainDropzone
      v-model:dragging="isDragging"
      class="alg-aquario__dropzone"
    />
  </section>
</template>

<style scoped lang="scss">
.alg-aquario {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-8);
  padding: var(--alg-space-2) 0 var(--alg-space-8);
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  isolation: isolate;
}

// "Dados de demonstração" — honest signal, mono uppercase, quaternary, top-right.
.alg-aquario__watermark {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 4;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-quaternary);
  pointer-events: none;
}

// ── Editorial header ─────────────────────────────────────────────────────────
.alg-aquario__head {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
  max-width: 560px;
}

.alg-aquario__eyebrow {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-aquario__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-3xl);
  font-weight: var(--alg-weight-light);
  letter-spacing: var(--alg-tracking-tightest);
  line-height: var(--alg-leading-tight);
  color: var(--alg-fg-primary);
}

.alg-aquario__subtitle {
  margin: 0;
  font-size: var(--alg-text-md);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-secondary);
}

// ── Hub stage ────────────────────────────────────────────────────────────────
// A 3-column grid. The orb owns the centre cell; six knowledge cards sit in the
// surrounding cells with real gaps. The orb is therefore STRUCTURALLY the hub
// (a real grid cell), not an absolute disc floating over a 2×2 — that overlay is
// exactly what made it "a ball loose in the middle cutting the cards".
.alg-aquario__stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr minmax(180px, 0.9fr) 1fr;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    'tl  core tr'
    'ml  core mr'
    'bl  core br';
  gap: var(--alg-space-5) var(--alg-space-8);
  align-items: center;
  max-width: 1080px;
  width: 100%;
}

// Centre cell — the living core spans all three rows so the orb is vertically
// centred against the column of cards on each side.
//
// z-index 1 seats the core (and therefore the orb's aimed conduits, which live
// inside it) BELOW the cards (z-index 2). The orb occupies its own empty centre
// cell, so nothing covers the sphere — but if a conduit overshoots into a card
// it now paints UNDER the glass (light beneath the surface), never a line
// slicing across the card face. Robust at every breakpoint, independent of how
// far a ray reaches.
.alg-aquario__core {
  grid-area: core;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-2);
  align-self: stretch;
}

// The single coherent layer count, seated under the orb — one number, in the
// type hierarchy (display weight, fg-primary), never an orphan in a stray colour.
.alg-aquario__core-count {
  margin-top: var(--alg-space-4);
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-2xl);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tightest);
  line-height: var(--alg-leading-tight);
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
}

.alg-aquario__core-label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  text-align: center;
}

// ── Living knowledge cards ───────────────────────────────────────────────────
// Real glass (backdrop-filter + solid fallback + mandatory grain). They breathe
// with a staggered ambient pulse (presence, not motion) — alive but calm.
.alg-aquario__card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
  padding: var(--alg-space-5);
  min-height: 150px;
  border: 1px solid var(--alg-glass-border);
  border-radius: var(--alg-radius-lg);
  background: var(--alg-bg-elevated);
  box-shadow: var(--alg-glass-highlight), var(--alg-elevation-2);
  overflow: hidden;
  // R3 refinement ("cards se mexendo"): the knowledge cards float gently, like
  // objects suspended in the aquário — a slow, staggered vertical drift, alive
  // but calm. Was a near-invisible opacity breathe; now reads as a living brain.
  animation: alg-aquario-float var(--alg-duration-ambient-slow)
    var(--alg-ease-ambient) infinite;
  animation-delay: var(--alg-card-delay, 0s);
  transition:
    border-color var(--alg-duration-base) var(--alg-ease-cinematic),
    box-shadow var(--alg-duration-base) var(--alg-ease-cinematic),
    transform var(--alg-duration-base) var(--alg-ease-cinematic);

  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-soft-bg);
    backdrop-filter: var(--alg-glass-soft-filter);
    -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  }

  // Hover deepens border + elevation only — no transform, so it never fights the
  // float animation (which owns transform).
  &:hover {
    border-color: var(--alg-glass-border-strong);
    box-shadow: var(--alg-glass-highlight), var(--alg-elevation-3);
  }

  &--tl {
    grid-area: tl;
  }
  &--tr {
    grid-area: tr;
  }
  &--ml {
    grid-area: ml;
  }
  &--mr {
    grid-area: mr;
  }
  &--bl {
    grid-area: bl;
  }
  &--br {
    grid-area: br;
  }
}

// Mandatory grain — the tell that separates real glass from rgba-on-rgba.
.alg-aquario__card-grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--alg-glass-grain);
  opacity: 0.6;
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}

.alg-aquario__card-head,
.alg-aquario__card-title,
.alg-aquario__card-body,
.alg-aquario__card-foot {
  position: relative;
  z-index: 1;
}

.alg-aquario__card-head {
  display: flex;
  align-items: center;
  gap: var(--alg-space-2);
}

.alg-aquario__card-icon {
  width: 1rem;
  height: 1rem;
  flex: none;
  color: var(--alg-fg-tertiary);
}

.alg-aquario__card-label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-aquario__card-title {
  margin: 0;
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tight);
  line-height: var(--alg-leading-snug);
  color: var(--alg-fg-primary);
}

.alg-aquario__card-body {
  margin: 0;
  flex: 1;
  font-size: var(--alg-text-xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-secondary);
}

.alg-aquario__card-foot {
  display: flex;
  align-items: center;
  gap: var(--alg-space-2);
}

.alg-aquario__card-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--alg-radius-pill);
  flex: none;
  background: var(--alg-fg-quaternary);

  // Kind tints (semantic exception — a 5px meta dot, not the surface).
  &--source {
    background: var(--alg-color-info, var(--alg-fg-tertiary));
  }
  &--human {
    background: var(--alg-color-success, var(--alg-fg-tertiary));
  }
  &--auto {
    background: var(--alg-color-warning, var(--alg-fg-tertiary));
  }
}

.alg-aquario__card-meta {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-wide);
  color: var(--alg-fg-tertiary);
}

// ── 2nd fold dropzone ────────────────────────────────────────────────────────
.alg-aquario__dropzone {
  max-width: 1080px;
  width: 100%;
}

// Staggered ambient float — a slow vertical drift (~6px) with a faint opacity
// swell, so each card gently bobs like it's suspended in the aquário. Different
// delays per card keep it organic (never a uniform march). Reduced motion stops
// it entirely (the cards hold still at full opacity).
@keyframes alg-aquario-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.95;
  }
  50% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

// ── Responsive ───────────────────────────────────────────────────────────────
// Below the hub breakpoint the orb can't be a centre column without crushing the
// cards. Collapse to a single column: orb on top (inline, not floating), cards
// stacked. The conduits stop being meaningful at this width, but the orb keeps
// its depth + beam, so it still reads as the living core.
@media (max-width: 900px) {
  .alg-aquario__stage {
    grid-template-columns: 1fr;
    grid-template-areas:
      'core'
      'tl'
      'tr'
      'ml'
      'mr'
      'bl'
      'br';
    gap: var(--alg-space-5);
  }

  .alg-aquario__core {
    align-self: center;
    margin-bottom: var(--alg-space-2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-aquario__card {
    animation: none;
    opacity: 1;
  }
}
</style>
