<script setup>
// algorythmo: Brain "Aquário" — the company's knowledge hub (Cinematic OS).
//
// PIXEL-FAITHFUL to Ref design 2 (THIRD founder rejection — the page must be
// IDENTICAL to the reference, only the written content differs). A single, clean,
// full-bleed dark canvas: the central plasma orb (AlgAuroraOrb) as the radiant
// hub, PINK light rays reaching out to a SCATTER of Knowledge Layer cards — three
// across the top, two flanking the sphere at mid-height, and a totalizer below.
// Each card carries a count + a "<Kind> Knowledge Layers" title + a short
// description, exactly the reference content.
//
// Round-6 deltas vs the rejected round-5:
//   • The editorial header (eyebrow/title/subtitle) is GONE — the reference has
//     no header. The page is just the orb + cards on the dark canvas.
//   • The ingestion dropzone is GONE — it was the "black split panel" the founder
//     called out. The Brain is now ONE clean page, nothing below the stage.
//   • The rays are PINK (beam="aurora"), matching the reference — not ice.
//   • The stage is vertically centred and fills the viewport (no scroll split).
// Kept: zero lead data, six-card scatter, entrance/stagger via the shared motion
// system, hover, light mode.
//
// Frontend-only / demo for now (M3+ data plugs in once the Brain backend is
// stable). The Aurora gradient appears ONLY on the orb sphere (sacred);
// everything else is glass / fg-opacity / hairline tokens.
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraOrb } from 'dashboard/components-next/algorythmo';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';

const { t } = useI18n();

// Six Knowledge Layer cards in the reference's radial scatter. `pos` maps each
// card to its grid cell; `conduit` is the PINK ray aimed from the core at that
// card — CSS rotate convention (0°=right, 90°=down, 180°=left, 270°=up). Angles
// mirror Ref design 2: three rays fan UP/OUT to the top cards, two reach the
// flanking cards, and the totalizer's downward ray rides under the plume. Lengths
// are tuned per direction so the light fades before the card edge (connects,
// never slices). `kind` tints the meta dot. `total` flags the summary card (493
// "in use"), which renders a single title instead of the kind+suffix split.
const cards = computed(() => [
  {
    id: 'source',
    pos: 'source',
    kind: 'source',
    conduit: { angle: 214, length: 200, delay: 0 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.SOURCE.BODY'),
  },
  {
    id: 'human',
    pos: 'human',
    kind: 'human',
    conduit: { angle: 270, length: 168, delay: 0.45 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.HUMAN.BODY'),
  },
  {
    id: 'agent',
    pos: 'agent',
    kind: 'agent',
    conduit: { angle: 326, length: 200, delay: 0.2 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AGENT.BODY'),
  },
  {
    id: 'auto',
    pos: 'auto',
    kind: 'auto',
    conduit: { angle: 180, length: 196, delay: 0.9 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.AUTO.BODY'),
  },
  {
    id: 'tool',
    pos: 'tool',
    kind: 'tool',
    conduit: { angle: 0, length: 196, delay: 0.65 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOOL.COUNT'),
    kindLabel: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOOL.KIND'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOOL.BODY'),
  },
  {
    id: 'total',
    pos: 'total',
    kind: 'total',
    total: true,
    conduit: { angle: 90, length: 150, delay: 1.15 },
    count: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOTAL.COUNT'),
    title: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOTAL.TITLE'),
    body: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.CARDS.TOTAL.BODY'),
  },
]);

// "Knowledge Layers" suffix — kept in English to match the reference exactly.
const layerSuffix = computed(() =>
  t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYER_SUFFIX')
);

// Aimed pink rays handed to the orb, matched 1:1 to the card positions above.
const aimedConduits = computed(() => cards.value.map(c => c.conduit));

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
    each: 0.08,
    startDelay: 0.16,
    duration: 0.52,
  });
});
</script>

<template>
  <section
    class="alg-aquario"
    :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.ARIA_LABEL')"
  >
    <span class="alg-aquario__watermark" aria-hidden="true">
      {{ t('ALGORYTHMO_BRAIN.AQUARIO.HUB.DEMO_WATERMARK') }}
    </span>

    <!-- The living core as the radiant hub: the plasma orb in the centre cell,
         six knowledge-layer cards scattered around it (3 top, 2 flanking, 1
         below), pink rays reaching each — exactly Ref design 2. No header, no
         second fold: one clean canvas. -->
    <div
      ref="stage"
      class="alg-aquario__stage"
      role="group"
      :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.STAGE_ARIA')"
    >
      <!-- centre cell: the Aurora core, pink rays radiating to every card -->
      <div class="alg-aquario__core">
        <AlgAuroraOrb
          :size="92"
          :aimed-conduits="aimedConduits"
          :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.ORB_ARIA')"
        />
      </div>

      <!-- knowledge-layer cards (glass, never aurora) -->
      <article
        v-for="card in cards"
        :key="card.id"
        data-alg-card
        class="alg-aquario__card"
        :class="[
          `alg-aquario__card--${card.pos}`,
          { 'alg-aquario__card--total': card.total },
        ]"
      >
        <span class="alg-aquario__card-grain" aria-hidden="true" />
        <span class="alg-aquario__card-beamlight" aria-hidden="true" />
        <span
          class="alg-aquario__card-glyph i-lucide-layers"
          aria-hidden="true"
        />
        <p class="alg-aquario__card-count">{{ card.count }}</p>
        <h3 v-if="card.total" class="alg-aquario__card-title">
          <span class="alg-aquario__card-kind">{{ card.title }}</span>
        </h3>
        <h3 v-else class="alg-aquario__card-title">
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
  </section>
</template>

<style scoped lang="scss">
// One clean, full-bleed dark canvas (Ref design 2). The stage is vertically and
// horizontally centred in the viewport — orb in the middle, cards scattered
// around. No header, no second fold: nothing but the hub on the dark.
.alg-aquario {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
  flex: 1;
  padding: var(--alg-space-6) 0;
  overflow-y: auto;
  isolation: isolate;
}

// "Dados de demonstração" — honest signal, mono uppercase, quaternary, top-right.
// Whisper-quiet so the canvas reads identical to the reference.
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
  opacity: 0.5;
  pointer-events: none;
}

// ── Hub stage ────────────────────────────────────────────────────────────────
// A 3-column × 3-row grid mirroring the reference's radial scatter. The orb owns
// the centre cell; the six cards sit around it — three across the top, two
// flanking the sphere at mid-height (Auto left, Tool right), and the totalizer
// centred below. The orb is therefore STRUCTURALLY the hub (a real grid cell),
// the radiant centre every ray leaves from.
.alg-aquario__stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr minmax(140px, 0.62fr) 1fr;
  grid-template-rows: auto minmax(150px, auto) auto;
  // Reference scatter: three cards across the top, the orb flanked by Auto/Tool
  // at mid-height, the totalizer centred below.
  grid-template-areas:
    'source human agent'
    'auto   core  tool'
    '.      total .';
  gap: var(--alg-space-5) var(--alg-space-6);
  align-items: stretch;
  max-width: 1180px;
  width: 100%;
  margin: 0 auto;
}

// Centre cell — the living core. The orb sits dead centre, the radiant point
// every ray leaves from. z-index 1 seats the core (and the orb's rays + plume,
// which live inside it) BELOW the cards (z-index 2): an overshooting ray paints
// UNDER the glass (light beneath the surface), never a line on the card face.
.alg-aquario__core {
  grid-area: core;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: var(--alg-space-5);
  min-height: 150px;
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

  &--source {
    grid-area: source;
  }
  &--human {
    grid-area: human;
  }
  &--agent {
    grid-area: agent;
  }
  &--auto {
    grid-area: auto;
  }
  &--tool {
    grid-area: tool;
  }
  &--total {
    grid-area: total;
  }
}

// The flanking cards (Auto / Tool) hug the sphere's height — let them fill their
// taller mid row so the sphere reads as nestled between them, as in the ref.
.alg-aquario__card--auto,
.alg-aquario__card--tool {
  justify-content: flex-start;
}

// The totalizer is a summary, not a layer-type card: a touch more restrained,
// centred under the orb, narrower so it reads as a footer figure not a 7th peer.
.alg-aquario__card--total {
  align-self: center;
  max-width: 360px;
  width: 100%;
  margin: 0 auto;
  min-height: 0;
  text-align: left;
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

// Pink edge-light: a soft warm glow on the card's edge facing the orb — the spot
// the ray lands. Faint at rest, brightens on hover. Each card points its glow
// back toward the centre (the source of the light), matching the reference's
// warm rays. Very low at rest so the cards read as clean glass.
.alg-aquario__card-beamlight {
  position: absolute;
  z-index: 0;
  width: 70%;
  height: 70%;
  border-radius: var(--alg-radius-pill);
  background: radial-gradient(
    circle,
    color-mix(in oklch, var(--alg-aurora-1), transparent 84%) 0%,
    transparent 70%
  );
  filter: blur(14px);
  opacity: 0.4;
  pointer-events: none;
  transition: opacity var(--alg-duration-slow) var(--alg-ease-cinematic);
}
// Glow positioned on the inner edge facing the orb, per the card's slot.
.alg-aquario__card--source .alg-aquario__card-beamlight {
  right: -6%;
  bottom: -6%;
}
.alg-aquario__card--human .alg-aquario__card-beamlight {
  left: 15%;
  bottom: -10%;
}
.alg-aquario__card--agent .alg-aquario__card-beamlight {
  left: -6%;
  bottom: -6%;
}
.alg-aquario__card--auto .alg-aquario__card-beamlight {
  right: -10%;
  top: 15%;
}
.alg-aquario__card--tool .alg-aquario__card-beamlight {
  left: -10%;
  top: 15%;
}
.alg-aquario__card--total .alg-aquario__card-beamlight {
  left: 50%;
  top: -14%;
  transform: translateX(-50%);
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
// tabular so the counts align across the grid.
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

// Two-line title: "<Kind>" over "Knowledge Layers" — exactly the reference. The
// totalizer renders a single line (no suffix), so its kind line carries the full
// "Knowledge Layers in use" label.
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
  max-width: 34ch;
}

.alg-aquario__card--total .alg-aquario__card-body {
  flex: none;
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
  &--tool {
    background: var(--alg-ice-3, var(--alg-fg-tertiary));
  }
  &--total {
    background: var(--alg-fg-tertiary);
  }
}

// ── Responsive ───────────────────────────────────────────────────────────────
// Below the hub breakpoint the orb can't be a centre cell without crushing the
// cards. Collapse to a single column: orb on top (inline), cards stacked. The
// rays stop being meaningful at this width, but the orb keeps its depth + plume,
// so it still reads as the living core.
@media (max-width: 980px) {
  .alg-aquario__stage {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-template-areas:
      'core'
      'source'
      'human'
      'agent'
      'auto'
      'tool'
      'total';
    gap: var(--alg-space-5);
  }

  .alg-aquario__core {
    margin-bottom: var(--alg-space-2);
  }

  .alg-aquario__card--total {
    max-width: none;
  }
}
</style>
