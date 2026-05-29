<script setup>
// algorythmo: Brain "Aquário" — the company's knowledge hub (Cinematic OS).
//
// The founder chose this as the home for the living identity: the Aurora sphere
// sits at the centre as the knowledge core, with light conduits reaching out to
// glass tiles that present the knowledge layers (DESIGN.md §6.2, Ref 2, and the
// approved mockup docs/plans/cinematic-os/preview/03-shell-sidebar.html).
//
// Frontend-only / demo for now (M3+ data plugs in once the Brain backend is
// stable). The Aurora gradient appears ONLY through AlgAuroraOrb — sacred. All
// other surfaces use --alg-* tokens (glass, fg opacities, hairlines). The demo
// watermark keeps the illustrative nature honest (same convention as sectors).
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  AlgAuroraOrb,
  AlgGlassTile,
} from 'dashboard/components-next/algorythmo';

const { t } = useI18n();

// Four knowledge-layer tiles, arranged 2×2 around the Aurora core. Demo data in
// the spirit of Ref 2 — labels in PT-BR via i18n, big numerals, descriptions.
const layers = computed(() => [
  {
    id: 'source',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.SOURCE_LABEL'),
    value: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.SOURCE_VALUE'),
    caption: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.SOURCE_DESC'),
  },
  {
    id: 'human',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.HUMAN_LABEL'),
    value: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.HUMAN_VALUE'),
    caption: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.HUMAN_DESC'),
  },
  {
    id: 'auto',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AUTO_LABEL'),
    value: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AUTO_VALUE'),
    caption: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AUTO_DESC'),
  },
  {
    id: 'agent',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AGENT_LABEL'),
    value: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AGENT_VALUE'),
    caption: t('ALGORYTHMO_BRAIN.AQUARIO.HUB.LAYERS.AGENT_DESC'),
  },
]);
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

    <!-- the living core, centred between the knowledge-layer tiles -->
    <div
      class="alg-aquario__stage"
      role="group"
      :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.STAGE_ARIA')"
    >
      <div class="alg-aquario__orb" aria-hidden="false">
        <AlgAuroraOrb
          :size="132"
          :conduits="6"
          :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.HUB.ORB_ARIA')"
        />
      </div>

      <AlgGlassTile
        v-for="layer in layers"
        :key="layer.id"
        class="alg-aquario__tile"
        :label="layer.label"
        :value="layer.value"
        :caption="layer.caption"
      />
    </div>
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
  z-index: 2;
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

// ── Orb stage — 2×2 glass tiles with the Aurora core centred between them ─────
.alg-aquario__stage {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--alg-space-5);
  max-width: 1040px;
}

.alg-aquario__tile {
  position: relative;
  z-index: 2;
  min-height: 150px;
}

// The orb is absolutely centred over the grid so the conduits read as if they
// feed each surrounding tile. pointer-events:none keeps the tiles interactive
// underneath. On narrow widths it scales down with the grid.
.alg-aquario__orb {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

@media (max-width: 640px) {
  .alg-aquario__stage {
    grid-template-columns: 1fr;
  }

  // With a single column the orb would overlap the stacked tiles; let it sit
  // inline at the top instead of floating over the list.
  .alg-aquario__orb {
    position: static;
    margin-bottom: var(--alg-space-4);
  }
}
</style>
