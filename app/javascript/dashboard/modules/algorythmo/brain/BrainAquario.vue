<script setup>
// algorythmo: Brain "Aquário" — the company's knowledge hub (Cinematic OS).
//
// Faithful to Ref design 2: a central LIVING SPHERE (AlgAuroraOrb) with light
// beams radiating out to the surrounding "Knowledge Layer" cards. The sphere is
// structurally the hub — it owns the centre column of the grid; the four
// canonical knowledge layers (Source / Human / Auto / Agent Interaction) sit in
// the corners around it, each with a count + a "<Kind> Knowledge Layers" title +
// a short description, exactly the content in the reference. An ice-toned beam
// reaches from the core to each card (light travelling out of the living core,
// not a line slicing the card).
//
// Round-4 rebuild. The previous Brain was rejected as "a cheap replica" — flat
// magenta ball loose in the middle, NO card animation, and lead/CRM data that
// does not belong in the Brain. This version: faithful composition, beams that
// read as light, cards that VISIBLY animate in (entrance + stagger via the
// shared motion system), and ZERO lead data — knowledge layers only.
//
// Frontend-only / demo for now (M3+ data plugs in once the Brain backend is
// stable). The Aurora gradient appears ONLY on the orb sphere (sacred); the
// beams are ice; everything else is glass / fg-opacity / hairline tokens. The
// demo watermark keeps the illustrative nature honest (same convention as
// sectors).
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraOrb } from 'dashboard/components-next/algorythmo';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';
import BrainDropzone from './BrainDropzone.vue';

const { t } = useI18n();

// The four canonical Knowledge Layers, arranged in the corners around the orb
// (the orb owns the centre column). `pos` maps each card to its grid cell;
// `conduit` is the ice beam aimed from the core at that card — irregular angle +
// explicit length tuned so the light fades before the card edge (connects, never
// slices). `kind` tints the meta dot. Order/delay drive the entrance stagger.
const cards = computed(() => [
  {
    id: 'source',
    pos: 'tl',
    kind: 'source',
    conduit: { angle: 214, length: 178, delay: 0 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.BODY'),
  },
  {
    id: 'human',
    pos: 'tr',
    kind: 'human',
    conduit: { angle: 326, length: 178, delay: 0.5 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.BODY'),
  },
  {
    id: 'auto',
    pos: 'bl',
    kind: 'auto',
    conduit: { angle: 146, length: 178, delay: 1.0 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.BODY'),
  },
  {
    id: 'agent',
    pos: 'br',
    kind: 'agent',
    conduit: { angle: 34, length: 178, delay: 0.25 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.BODY'),
  },
]);

// "Knowledge Layers" suffix — kept in English to match the reference exactly.
const layerSuffix = computed(() =>
  t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYER_SUFFIX')
);

// Aimed ice beams handed to the orb, matched 1:1 to the card positions above.
const aimedConduits = computed(() => cards.value.map(c => c.conduit));

// Single coherent layer count, seated under the orb.
const layerCount = computed(() =>
  t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYER_COUNT')
);

// ── Card entrance/stagger — the founder's non-negotiable ──────────────────────
// Cards must VISIBLY animate in (the prior round had none). They start hidden
// (opacity 0, lifted) and reveal in a staggered sequence on mount via the shared
// motion system. Reduced motion collapses this to an instant opacity settle (no
// travel) — handled inside algStagger. Hover deepening stays CSS.
const stage = ref(null);
const { revealChildren, reveal } = useAlgMotion(stage);

onMounted(() => {
  // Hero core first, then the cards cascade out — light reaching each layer.
  reveal('.alg-aquario__core', { y: 8, duration: 0.52 });
  revealChildren('[data-alg-card]', {
    y: 16,
    each: 0.09,
    startDelay: 0.16,
    duration: 0.52,
  });
});

// Dropzone hover state — demo only (no upload backend yet).
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

    <!-- The living core as a structural hub: orb in the centre column, the four
         knowledge-layer cards in the corners, ice beams reaching each. -->
    <div
      ref="stage"
      class="alg-aquario__stage"
      role="group"
      :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.STAGE_ARIA')"
    >
      <!-- centre column: the Aurora core, beams radiating to the corner cards -->
      <div class="alg-aquario__core">
        <AlgAuroraOrb
          :size="132"
          beam="ice"
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

      <!-- knowledge-layer cards (glass, never aurora) -->
      <article
        v-for="card in cards"
        :key="card.id"
        data-alg-card
        class="alg-aquario__card"
        :class="`alg-aquario__card--${card.pos}`"
      >
        <span class="alg-aquario__card-grain" aria-hidden="true" />
        <span class="alg-aquario__card-beamlight" aria-hidden="true" />
        <span
          class="alg-aquario__card-glyph i-lucide-layers"
          aria-hidden="true"
        />
        <p class="alg-aquario__card-count">{{ card.count }}</p>
        <h3 class="alg-aquario__card-title">
          <span class="alg-aquario__card-kind">{{ card.kindLabel }}</span>
          <span class="alg-aquario__card-suffix">{{ layerSuffix }}</span>
        </h3>
        <p class="alg-aquario__card-body">{{ card.body }}</p>
        <span
          class="alg-aquario__card-dot"
          :class="`alg-aquario__card-dot--${card.kind}`"
          aria-hidden="true"
        />
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
// A 3-column × 2-row grid. The orb owns the centre column (spanning both rows);
// the four knowledge-layer cards sit in the corners. The orb is therefore
// STRUCTURALLY the hub (a real grid cell), not an absolute disc floating over a
// 2×2 — that overlay is exactly what made the prior round read as "a ball loose
// in the middle cutting the cards". Beams radiate diagonally from the centre to
// each corner card.
.alg-aquario__stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr minmax(168px, 0.78fr) 1fr;
  grid-template-rows: 1fr 1fr;
  grid-template-areas:
    'tl core tr'
    'bl core br';
  gap: var(--alg-space-6) var(--alg-space-8);
  align-items: stretch;
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
}

// Centre column — the living core spans both rows so the orb sits dead centre,
// equidistant from all four corner cards (the beams read as symmetric radiation).
//
// z-index 1 seats the core (and the orb's beams, which live inside it) BELOW the
// cards (z-index 2). If a beam overshoots into a card it paints UNDER the glass
// (light beneath the surface), never a line slicing across the card face.
.alg-aquario__core {
  grid-area: core;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-2);
}

// The single coherent layer count, seated under the orb — one number, in the
// type hierarchy (display weight, fg-primary).
.alg-aquario__core-count {
  margin-top: var(--alg-space-5);
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

// ── Knowledge-layer cards ────────────────────────────────────────────────────
// Real glass (backdrop-filter + solid fallback + mandatory grain). Each card is
// a knowledge layer: layers glyph, big count, "<Kind> Knowledge Layers" title,
// short description, a meta dot. They start hidden (opacity 0) and reveal via the
// motion system on mount; hover deepens border + elevation + an ice edge-light.
.alg-aquario__card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
  padding: var(--alg-space-6);
  min-height: 188px;
  // Entrance is JS-driven (useAlgMotion): start invisible so the reveal is real
  // motion, not a flash. Reduced motion still resolves to opacity 1 instantly.
  opacity: 0;
  border: 1px solid var(--alg-glass-border);
  border-radius: var(--alg-radius-xl);
  background: var(--alg-bg-elevated);
  box-shadow: var(--alg-glass-highlight), var(--alg-elevation-2);
  overflow: hidden;
  transition:
    border-color var(--alg-duration-base) var(--alg-ease-cinematic),
    box-shadow var(--alg-duration-base) var(--alg-ease-cinematic),
    transform var(--alg-duration-base) var(--alg-ease-cinematic);

  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-soft-bg);
    backdrop-filter: var(--alg-glass-soft-filter);
    -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  }

  // Hover: lift + deepen elevation, and bring the ice edge-light (the beam's
  // landing spot on the card) up — the card responds to the light reaching it.
  &:hover {
    transform: translateY(-3px);
    border-color: var(--alg-glass-border-strong);
    box-shadow: var(--alg-glass-highlight), var(--alg-elevation-3);

    .alg-aquario__card-beamlight {
      opacity: 1;
    }
    .alg-aquario__card-glyph {
      color: var(--alg-fg-secondary);
    }
  }

  &--tl {
    grid-area: tl;
  }
  &--tr {
    grid-area: tr;
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

// Ice edge-light: a soft cool glow on the card's inner corner facing the orb —
// the spot the beam lands. Faint at rest, brightens on hover. Each corner card
// points its glow back toward the centre (the source of the light).
.alg-aquario__card-beamlight {
  position: absolute;
  z-index: 0;
  width: 70%;
  height: 70%;
  border-radius: var(--alg-radius-pill);
  background: radial-gradient(
    circle,
    color-mix(in oklch, var(--alg-ice-2), transparent 80%) 0%,
    transparent 70%
  );
  filter: blur(14px);
  opacity: 0.5;
  pointer-events: none;
  transition: opacity var(--alg-duration-slow) var(--alg-ease-cinematic);
}
.alg-aquario__card--tl .alg-aquario__card-beamlight {
  right: -6%;
  bottom: -6%;
}
.alg-aquario__card--tr .alg-aquario__card-beamlight {
  left: -6%;
  bottom: -6%;
}
.alg-aquario__card--bl .alg-aquario__card-beamlight {
  right: -6%;
  top: -6%;
}
.alg-aquario__card--br .alg-aquario__card-beamlight {
  left: -6%;
  top: -6%;
}

.alg-aquario__card-glyph,
.alg-aquario__card-count,
.alg-aquario__card-title,
.alg-aquario__card-body,
.alg-aquario__card-dot {
  position: relative;
  z-index: 1;
}

.alg-aquario__card-glyph {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--alg-fg-tertiary);
  transition: color var(--alg-duration-base) var(--alg-ease-cinematic);
}

// The big count — matches the reference's prominent numeral. Display weight,
// tabular so the four counts align across the grid.
.alg-aquario__card-count {
  margin: var(--alg-space-1) 0 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-3xl);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tightest);
  line-height: 1;
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
}

// Two-line title: "<Kind>" over "Knowledge Layers" — exactly the reference.
.alg-aquario__card-title {
  display: flex;
  flex-direction: column;
  margin: 0;
  font-size: var(--alg-text-md);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tight);
  line-height: var(--alg-leading-snug);
  color: var(--alg-fg-primary);
}

.alg-aquario__card-suffix {
  color: var(--alg-fg-secondary);
}

.alg-aquario__card-body {
  margin: var(--alg-space-1) 0 0;
  flex: 1;
  font-size: var(--alg-text-xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-tertiary);
  max-width: 32ch;
}

// A single meta dot, kind-tinted (semantic exception — 5px, not the surface).
.alg-aquario__card-dot {
  width: 5px;
  height: 5px;
  border-radius: var(--alg-radius-pill);
  flex: none;
  align-self: flex-start;
  background: var(--alg-fg-quaternary);

  &--source {
    background: var(--alg-color-info, var(--alg-fg-tertiary));
  }
  &--human {
    background: var(--alg-color-success, var(--alg-fg-tertiary));
  }
  &--auto {
    background: var(--alg-color-warning, var(--alg-fg-tertiary));
  }
  &--agent {
    background: var(--alg-ice-2, var(--alg-fg-tertiary));
  }
}

// ── 2nd fold dropzone ────────────────────────────────────────────────────────
.alg-aquario__dropzone {
  max-width: 1120px;
  width: 100%;
  margin: 0 auto;
}

// ── Responsive ───────────────────────────────────────────────────────────────
// Below the hub breakpoint the orb can't be a centre column without crushing the
// cards. Collapse to a single column: orb on top (inline), cards stacked. The
// beams stop being meaningful at this width, but the orb keeps its depth + beam,
// so it still reads as the living core.
@media (max-width: 900px) {
  .alg-aquario__stage {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas:
      'core'
      'tl'
      'tr'
      'bl'
      'br';
    gap: var(--alg-space-5);
  }

  .alg-aquario__core {
    margin-bottom: var(--alg-space-2);
  }

  .alg-aquario__card {
    min-height: 0;
  }
}
</style>
