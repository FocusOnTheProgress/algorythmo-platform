<script setup>
// algorythmo: Stream E1 — The Committee (left panel).
//
// Director status cards (CFO/CMO/CTO/COO). Each shows a Planet Avatar identity,
// the role, a readiness line ("lendo os dados atuais") with a soft green
// luminous pulse when the data is fresh, and a "Chamar para a Mesa" toggle to
// include/exclude that director from the round.
//
// The toggle is a real ARIA switch (keyboard + screen-reader correct). The
// parent owns the set of seated director ids; this panel emits intents.
//
// TODO(real-wiring): `fresh` + the readiness copy come from the agent runtime
// (last data read). The toggle will gate which director-agents actually join
// the live debate.
import { useI18n } from 'vue-i18n';
import { AlgPlanetAvatar } from 'dashboard/components-next/algorythmo';

defineProps({
  directors: {
    type: Array,
    required: true,
  },
  // Set-like array of seated director ids.
  seated: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['toggle']);

const { t } = useI18n();

function isSeated(seated, id) {
  return seated.includes(id);
}
</script>

<template>
  <section
    class="alg-cl-committee"
    :aria-label="t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.ARIA_PANEL')"
  >
    <header class="alg-cl-committee__head">
      <p class="alg-cl-committee__eyebrow">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.EYEBROW') }}
      </p>
      <h2 class="alg-cl-committee__title">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.TITLE') }}
      </h2>
    </header>

    <ul class="alg-cl-committee__list" role="list">
      <li
        v-for="director in directors"
        :key="director.id"
        class="alg-cl-director"
        :class="{ 'alg-cl-director--seated': isSeated(seated, director.id) }"
        data-alg-reveal-committee
        :style="{ '--alg-cl-accent': director.accent }"
      >
        <span class="alg-cl-director__accent" aria-hidden="true" />

        <AlgPlanetAvatar
          class="alg-cl-director__avatar"
          :seed="director.seed"
          :name="t(director.roleKey)"
          size="md"
          aria-hidden="true"
        />

        <div class="alg-cl-director__body">
          <p class="alg-cl-director__role">{{ t(director.roleKey) }}</p>
          <p class="alg-cl-director__status">
            <span
              v-if="director.fresh"
              class="alg-cl-director__pulse"
              aria-hidden="true"
            />
            {{ t(director.statusKey) }}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          class="alg-cl-director__switch"
          :aria-checked="isSeated(seated, director.id)"
          :aria-label="
            t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.CALL_ARIA', {
              role: t(director.roleKey),
            })
          "
          @click="emit('toggle', director.id)"
        >
          <span class="alg-cl-director__track" aria-hidden="true">
            <span class="alg-cl-director__thumb" />
          </span>
          <span class="alg-cl-director__switch-label">{{
            isSeated(seated, director.id)
              ? t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.AT_TABLE')
              : t('ALGORYTHMO_ADMIN.C_LEVELS.COMMITTEE.CALL')
          }}</span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.alg-cl-committee {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-5);
  height: 100%;
  min-height: 0;
}

.alg-cl-committee__head {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-cl-committee__eyebrow {
  margin: 0;
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-cl-committee__title {
  margin: 0;
  font-size: var(--alg-text-lg);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-cl-committee__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
}

.alg-cl-director {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--alg-space-3);
  padding: var(--alg-space-3) var(--alg-space-4);
  padding-left: var(--alg-space-4);
  background: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-md);
  box-shadow: var(--alg-elevation-1);
  overflow: hidden;
  transition:
    border-color var(--alg-duration-base) var(--alg-ease-cinematic),
    opacity var(--alg-duration-base) var(--alg-ease-cinematic),
    background var(--alg-duration-base) var(--alg-ease-cinematic);
}

// Excluded directors recede — present, but clearly not at the table.
.alg-cl-director:not(.alg-cl-director--seated) {
  opacity: 0.5;
}
.alg-cl-director:not(.alg-cl-director--seated) .alg-cl-director__accent {
  opacity: 0.25;
}

// Subtle per-director accent: a thin side-bar, NOT a saturated border.
.alg-cl-director__accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--alg-cl-accent);
  opacity: 0.85;
  transition: opacity var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-cl-director__avatar {
  grid-row: 1;
}

.alg-cl-director__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alg-cl-director__role {
  margin: 0;
  font-size: var(--alg-text-sm);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-primary);
}

.alg-cl-director__status {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: var(--alg-space-2);
  font-size: var(--alg-text-2xs);
  color: var(--alg-fg-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// Soft green luminous pulse when the director has fresh data.
.alg-cl-director__pulse {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-color-success);
  box-shadow: 0 0 8px 0 oklch(0.77 0.155 152 / 0.8);
  animation: alg-cl-readiness var(--alg-duration-ambient-fast)
    var(--alg-ease-ambient) infinite alternate;
}

.alg-cl-director__switch {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: var(--alg-space-1) var(--alg-space-1);
  background: none;
  border: none;
  cursor: pointer;
  appearance: none;
  border-radius: var(--alg-radius-sm);

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}

.alg-cl-director__track {
  position: relative;
  width: 34px;
  height: 18px;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-bg-tint-high);
  border: 1px solid var(--alg-border);
  transition: background var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-cl-director__thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 14px;
  height: 14px;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-fg-secondary);
  box-shadow: var(--alg-elevation-1);
  transition:
    transform var(--alg-duration-base) var(--alg-ease-cinematic),
    background var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-cl-director--seated .alg-cl-director__track {
  background: color-mix(in oklch, var(--alg-cl-accent), transparent 55%);
  border-color: color-mix(in oklch, var(--alg-cl-accent), transparent 35%);
}
.alg-cl-director--seated .alg-cl-director__thumb {
  transform: translateX(16px);
  background: var(--alg-fg-primary);
}

.alg-cl-director__switch-label {
  font-size: 9px;
  letter-spacing: var(--alg-tracking-wide);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  white-space: nowrap;
}

@keyframes alg-cl-readiness {
  from {
    opacity: 0.5;
    box-shadow: 0 0 4px 0 oklch(0.77 0.155 152 / 0.5);
  }
  to {
    opacity: 1;
    box-shadow: 0 0 10px 0 oklch(0.77 0.155 152 / 0.9);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-cl-director__pulse {
    animation: none;
  }
  .alg-cl-director__thumb,
  .alg-cl-director__track {
    transition: none;
  }
}
</style>
