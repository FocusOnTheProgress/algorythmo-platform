<script setup>
// algorythmo: Stream D — "Início" (the default landing surface).
//
// The first thing the user sees: a hero-band welcome that translates the
// company's state into a confident, human panorama. Composition, top to bottom:
//   • GreetingHero — time-of-day greeting + the living Aurora Orb + the
//                    invisible sync line (system status without a spinner).
//   • CatchUpHub   — "Enquanto você estava fora" human catch-up cards.
//   • SmartActions — 2–3 contextual next-best-actions.
//
// The screen owns the demo-wiring boundary: it asks `getInicioBriefing()` for
// the catch-up data and hands it down. Replacing that provider with the OS
// activity layer (see inicio.demo.js) lands real data with no component change.
//
// Density: `.alg-density-hero` — 96px+ padding, generous gaps, display register.
// The canvas breathes like a premium magazine cover (DESIGN.md §3.3, hero band).
import { ref, onMounted } from 'vue';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';
import { getInicioBriefing } from './inicio.demo.js';
import GreetingHero from './GreetingHero.vue';
import CatchUpHub from './CatchUpHub.vue';
import SmartActions from './SmartActions.vue';

const root = ref(null);
const { revealChildren } = useAlgMotion(root);

// Briefing data (demo provider for now). `syncing` drives the invisible status
// line — a brief settle on mount, then ready. The real provider is async; the
// screen already treats this as data so the swap is mechanical.
const briefing = ref({ catchUp: [] });
const syncing = ref(true);

onMounted(() => {
  briefing.value = getInicioBriefing();

  // Cinematic staggered entrance across the hero's reveal targets.
  revealChildren('[data-alg-reveal]', { each: 0.08, y: 14 });

  // The invisible sync line breathes "syncing" for one ambient beat, then
  // settles to "ready" — presence, never a blocking spinner.
  window.setTimeout(() => {
    syncing.value = false;
  }, 1100);
});
</script>

<template>
  <div ref="root" class="alg-inicio">
    <div class="alg-density-hero alg-inicio__band">
      <GreetingHero :syncing="syncing" />

      <div class="alg-inicio__body">
        <CatchUpHub :items="briefing.catchUp" />
        <SmartActions />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Full-bleed dark void floor — the hero sits on the deepest black so the band
// reads as a command-room canvas, not a card.
.alg-inicio {
  min-height: 100%;
  width: 100%;
  overflow-y: auto;
  background: var(--alg-black-1, #0a0a0b);
}

// Centred hero band — max-width keeps the magazine-cover proportion on a 27".
.alg-inicio__band {
  max-width: 1280px;
  margin: 0 auto;
}

// Section gap below the hero — the band's own gap handles greeting→body; this
// keeps catch-up and actions on a tighter, related rhythm beneath it.
.alg-inicio__body {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-10);
  max-width: 720px;
}
</style>
