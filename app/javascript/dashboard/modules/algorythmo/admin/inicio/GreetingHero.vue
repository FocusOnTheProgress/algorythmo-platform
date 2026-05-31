<script setup>
// algorythmo: Stream D — Início greeting hero (DESIGN.md §3.2, §6.2).
//
// The welcome line: "Bom dia, Leonardo. Aqui está o seu panorama hoje." rendered
// in the display face — light weight, hard-negative tracking, confident opacity
// (the welcome, not ghostly chrome). The Aurora Orb (the platform's living
// intelligence) breathes beside it; Início carries clear intelligence semantics
// — this is the panorama the intelligence assembled — so the single sacred orb
// instance lives here.
//
// Below the greeting sits the INVISIBLE system status: a near-imperceptible
// pulsing line standing in for sync/loading. Never a "Carregando…" screen, never
// a spinner (DESIGN.md §2, §14.8).
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import AlgAuroraOrb from 'dashboard/components-next/algorythmo/AlgAuroraOrb.vue';
import { greetingKeyForHour, firstNameOf } from './inicio.demo.js';

const props = defineProps({
  // Whether the briefing is still settling — drives the invisible sync line.
  syncing: {
    type: Boolean,
    default: false,
  },
});

const { t } = useI18n();
const currentUser = useMapGetter('auth/getCurrentUser');

// First name from the logged-in user; neutral fallback if absent.
const firstName = computed(() => {
  const resolved = firstNameOf(currentUser.value?.name);
  return resolved.value ?? t(resolved.key);
});

// Time-of-day greeting in local time, interpolating the first name. The copy
// itself ("Aqui está o seu panorama hoje.") lives in the i18n value.
const greeting = computed(() =>
  t(greetingKeyForHour(new Date().getHours()), { name: firstName.value })
);

// The invisible sync line is always present (it IS the system-status surface);
// it only intensifies its breath while syncing. aria-live announces sync state
// for assistive tech without ever rendering a spinner.
const syncLabel = computed(() =>
  props.syncing
    ? t('ALGORYTHMO_ADMIN.INICIO.SYNC.SYNCING')
    : t('ALGORYTHMO_ADMIN.INICIO.SYNC.READY')
);
</script>

<template>
  <header class="alg-inicio-hero">
    <div class="alg-inicio-hero__copy" data-alg-reveal>
      <p class="alg-inicio-hero__eyebrow">
        {{ t('ALGORYTHMO_ADMIN.INICIO.EYEBROW') }}
      </p>
      <h1 class="alg-inicio-hero__greeting">{{ greeting }}</h1>

      <!-- Invisible system status: a near-imperceptible pulsing line. -->
      <div
        class="alg-inicio-hero__sync"
        :class="{ 'alg-inicio-hero__sync--active': syncing }"
        role="status"
        aria-live="polite"
      >
        <span class="alg-inicio-hero__sync-line" aria-hidden="true" />
        <span class="alg-inicio-hero__sync-label">{{ syncLabel }}</span>
      </div>
    </div>

    <div class="alg-inicio-hero__orb" aria-hidden="false" data-alg-reveal>
      <AlgAuroraOrb
        :size="148"
        :conduits="0"
        :aria-label="t('ALGORYTHMO_ADMIN.INICIO.ORB_ARIA')"
      />
    </div>
  </header>
</template>

<style lang="scss" scoped>
.alg-inicio-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--alg-space-12);
  width: 100%;
}

.alg-inicio-hero__copy {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-4);
  min-width: 0;
}

// Micro eyebrow — mono uppercase, the quiet "section" voice.
.alg-inicio-hero__eyebrow {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

// The greeting — display face, light weight, hard-negative tracking, confident
// opacity. This is the editorial signature line of the surface.
.alg-inicio-hero__greeting {
  margin: 0;
  max-width: 24ch;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-4xl);
  font-weight: var(--alg-weight-light);
  line-height: var(--alg-leading-tight);
  letter-spacing: var(--alg-tracking-tightest);
  color: var(--alg-fg-primary);
  text-wrap: balance;
}

// --- Invisible system status -------------------------------------------------
// A thin line that breathes on the ambient curve. Idle: barely there. Syncing:
// a soft brand-tinted sweep travels along it. No spinner, no blocking overlay.
.alg-inicio-hero__sync {
  display: flex;
  align-items: center;
  gap: var(--alg-space-3);
  margin-top: var(--alg-space-2);
}

.alg-inicio-hero__sync-line {
  position: relative;
  display: block;
  width: 96px;
  height: 1px;
  overflow: hidden;
  background: var(--alg-border);
  border-radius: var(--alg-radius-pill);

  // The travelling highlight — a faint band that drifts left→right. Idle it
  // breathes slowly; --active speeds it to read as "syncing now".
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      color-mix(in oklch, var(--alg-color-brand-primary), transparent 55%) 50%,
      transparent 100%
    );
    transform: translateX(-120%);
    animation: alg-inicio-sync var(--alg-duration-ambient-slow)
      var(--alg-ease-ambient) infinite;
  }
}

.alg-inicio-hero__sync--active .alg-inicio-hero__sync-line::after {
  animation-duration: var(--alg-duration-ambient);
}

.alg-inicio-hero__sync-label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-wide);
  color: var(--alg-fg-quaternary);
}

.alg-inicio-hero__orb {
  flex-shrink: 0;
}

@keyframes alg-inicio-sync {
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(360%);
  }
}

// Reduced motion: the line stays present (it IS the status surface) but stops
// travelling — a static faint highlight, no directional sweep.
@media (prefers-reduced-motion: reduce) {
  .alg-inicio-hero__sync-line::after {
    animation: none;
    transform: translateX(80%);
    opacity: 0.5;
  }
}

// Mobile: stack the orb above the copy so the greeting keeps its full width.
@media (max-width: 768px) {
  .alg-inicio-hero {
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: var(--alg-space-8);
  }

  .alg-inicio-hero__greeting {
    max-width: none;
  }
}
</style>
