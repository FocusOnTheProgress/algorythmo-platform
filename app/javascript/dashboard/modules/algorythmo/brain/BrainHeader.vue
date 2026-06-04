<script setup>
// algorythmo: Brain — Aurora identity strip (plan 0012, founder-approved layout).
//
// The Aurora orb (AlgAuroraOrb) was approved visually as the living-intelligence
// object. The earlier Brain hub let that orb DOMINATE the whole canvas with a
// fake six-card scatter of demonstration data — the founder rejected that. This
// strip keeps the orb's approved fidelity (bloom / halo / plume / chroma drift)
// but CONTAINS it: a small (56px) seated core on the left of a single glass
// band, the brand wordmark beside it, and LIVE stats from the real motor on the
// right. No dominating sphere, no fake scatter — identity as a header, data
// below it.
//
// Stats are real (compiled_truth → { pages, edges }). While loading, the numbers
// shimmer; on a fresh/empty brain they read 0 honestly (0 is not an error).
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraOrb } from 'dashboard/components-next/algorythmo';

const props = defineProps({
  // { pages, edges, raw_stats, account_id } | null
  stats: { type: Object, default: null },
  isLoading: { type: Boolean, default: false },
  // ISO timestamp of the most recent brain event, or null when the brain is empty.
  lastGrewAt: { type: String, default: null },
});

const { t } = useI18n();

const pages = computed(() => Number(props.stats?.pages ?? 0));
const edges = computed(() => Number(props.stats?.edges ?? 0));

const numberFmt = new Intl.NumberFormat();
const pagesLabel = computed(() => numberFmt.format(pages.value));
const edgesLabel = computed(() => numberFmt.format(edges.value));

// "cresceu há Xd / Xh / agora" — relative age of the last brain event. Null
// (no events yet) renders nothing; an empty brain just shows the counts at 0.
const grewLabel = computed(() => {
  if (!props.lastGrewAt) return null;
  const then = new Date(props.lastGrewAt).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return t('ALGORYTHMO_BRAIN.HEADER.GREW_NOW');
  if (mins < 60) return t('ALGORYTHMO_BRAIN.HEADER.GREW_MINUTES', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('ALGORYTHMO_BRAIN.HEADER.GREW_HOURS', { n: hours });
  const days = Math.round(hours / 24);
  return t('ALGORYTHMO_BRAIN.HEADER.GREW_DAYS', { n: days });
});
</script>

<template>
  <header
    class="alg-brain-header"
    :aria-label="t('ALGORYTHMO_BRAIN.HEADER.ARIA_LABEL')"
  >
    <span class="alg-brain-header__grain" aria-hidden="true" />

    <!-- Contained Aurora core — the approved orb, seated small on the left. -->
    <div class="alg-brain-header__orb">
      <AlgAuroraOrb
        :size="56"
        :active="isLoading"
        :aria-label="t('ALGORYTHMO_BRAIN.HEADER.ORB_ARIA')"
      />
    </div>

    <div class="alg-brain-header__identity">
      <p class="alg-brain-header__eyebrow">
        {{ t('ALGORYTHMO_BRAIN.HEADER.EYEBROW') }}
      </p>
      <h1 class="alg-brain-header__title">
        {{ t('ALGORYTHMO_BRAIN.HEADER.TITLE') }}
      </h1>
    </div>

    <!-- Live stats from the real motor. -->
    <dl class="alg-brain-header__stats" :aria-busy="isLoading">
      <div class="alg-brain-header__stat">
        <dt class="alg-brain-header__stat-label">
          {{ t('ALGORYTHMO_BRAIN.HEADER.STATS.DOCUMENTS') }}
        </dt>
        <dd class="alg-brain-header__stat-value">
          <span
            v-if="isLoading"
            class="alg-brain-header__shimmer"
            aria-hidden="true"
          />
          <span v-else>{{ pagesLabel }}</span>
        </dd>
      </div>
      <span class="alg-brain-header__stat-sep" aria-hidden="true" />
      <div class="alg-brain-header__stat">
        <dt class="alg-brain-header__stat-label">
          {{ t('ALGORYTHMO_BRAIN.HEADER.STATS.EDGES') }}
        </dt>
        <dd class="alg-brain-header__stat-value">
          <span
            v-if="isLoading"
            class="alg-brain-header__shimmer"
            aria-hidden="true"
          />
          <span v-else>{{ edgesLabel }}</span>
        </dd>
      </div>
      <template v-if="grewLabel && !isLoading">
        <span class="alg-brain-header__stat-sep" aria-hidden="true" />
        <div class="alg-brain-header__stat alg-brain-header__stat--grew">
          <dt class="alg-brain-header__stat-label">
            {{ t('ALGORYTHMO_BRAIN.HEADER.STATS.GREW') }}
          </dt>
          <dd
            class="alg-brain-header__stat-value alg-brain-header__stat-value--muted"
          >
            {{ grewLabel }}
          </dd>
        </div>
      </template>
    </dl>
  </header>
</template>

<style scoped lang="scss">
// One contained glass band. The orb is a seated detail on the left, never the
// canvas. Identity sits in the middle; live data on the right.
.alg-brain-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--alg-space-5);
  padding: var(--alg-space-4) var(--alg-space-6);
  border: 1px solid var(--alg-glass-border);
  border-radius: var(--alg-radius-2xl);
  background: var(--alg-bg-elevated);
  box-shadow: var(--alg-glass-highlight), var(--alg-elevation-2);
  overflow: hidden;
  isolation: isolate;

  @supports (backdrop-filter: blur(1px)) {
    background: var(--alg-glass-soft-bg);
    backdrop-filter: var(--alg-glass-soft-filter);
    -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  }
}

// Mandatory grain — the tell of real glass.
.alg-brain-header__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image: var(--alg-glass-grain);
  opacity: 0.6;
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}

// The orb is CONTAINED in a circular well: the approved orb keeps its sphere +
// halo + chroma drift, but its hero-scale comet plume and wide bloom would be
// hard-cut by the header band. A circular clip (slightly larger than the orb so
// the halo breathes) turns that into a clean, intentional disc — a seated detail,
// never a sliced element. This is the founder's "contido" direction: the orb is
// the identity tell, not the canvas.
.alg-brain-header__orb {
  position: relative;
  z-index: 1;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: var(--alg-radius-pill);
  overflow: hidden;
  // Seat the disc on the glass with a faint inner ring so the clip reads as a
  // designed well, not a crop.
  box-shadow: inset 0 0 0 1px var(--alg-glass-border);
}

.alg-brain-header__identity {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1 1 auto;
}

.alg-brain-header__eyebrow {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-brain-header__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-xl);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tight);
  line-height: var(--alg-leading-snug);
  color: var(--alg-fg-primary);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
.alg-brain-header__stats {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: var(--alg-space-5);
  margin: 0;
  flex: none;
}

.alg-brain-header__stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: right;
}

.alg-brain-header__stat-label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-brain-header__stat-value {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-lg);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tightest);
  line-height: 1;
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
  min-height: 1.1em;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.alg-brain-header__stat-value--muted {
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-secondary);
}

.alg-brain-header__stat-sep {
  width: 1px;
  align-self: stretch;
  background: var(--alg-border);
  flex: none;
}

// Shimmer placeholder while the first stats fetch is in flight (skeleton, not a
// spinner — DESIGN.md bans spinners).
.alg-brain-header__shimmer {
  display: inline-block;
  width: 2.2ch;
  height: 0.9em;
  border-radius: var(--alg-radius-sm);
  background: linear-gradient(
    90deg,
    var(--alg-border) 0%,
    var(--alg-border-strong) 50%,
    var(--alg-border) 100%
  );
  background-size: 200% 100%;
  animation: alg-brain-shimmer 1.6s var(--alg-ease-cinematic) infinite;
}

@keyframes alg-brain-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

// ── Responsive ──────────────────────────────────────────────────────────────
@media (max-width: 768px) {
  .alg-brain-header {
    flex-wrap: wrap;
    gap: var(--alg-space-4);
    padding: var(--alg-space-4);
  }

  .alg-brain-header__identity {
    flex: 1 1 60%;
  }

  .alg-brain-header__stats {
    flex: 1 1 100%;
    justify-content: flex-start;
    gap: var(--alg-space-4);
    padding-top: var(--alg-space-3);
    border-top: 1px solid var(--alg-border);
  }

  .alg-brain-header__stat {
    text-align: left;
  }

  .alg-brain-header__stat-value {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-brain-header__shimmer {
    animation: none;
  }
}
</style>
