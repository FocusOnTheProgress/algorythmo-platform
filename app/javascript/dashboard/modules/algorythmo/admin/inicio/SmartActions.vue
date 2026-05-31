<script setup>
// algorythmo: Stream D — Inicio Smart Actions (contextual next-best-actions).
//
// Only the 2-3 things the user most likely does next, chosen by a simple
// time-of-day heuristic (the OS-ranked list replaces it later). One emphasised
// (solid) action leads; the rest are ghost. No glass on buttons — the ruler
// keeps buttons solid/ghost (DESIGN.md 5.1).
//
// Actions are role-filtered: admin-only destinations are never offered to
// agents or custom_roles.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useStore } from 'dashboard/composables/store';
import { smartActionsForHour } from './inicio.demo.js';

const props = defineProps({
  // The viewer's role — drives which actions are offered.
  role: {
    type: String,
    default: 'agent',
  },
});

const { t } = useI18n();
const router = useRouter();
const store = useStore();

const accountId = computed(() => store.getters.getCurrentAccountId);

// Resolved against local time at render, filtered by role.
// Always 2-3 items, first one primary.
const actions = computed(() =>
  smartActionsForHour(new Date().getHours(), props.role)
);

function run(action) {
  if (!action?.routeName) return;
  router.push({
    name: action.routeName,
    params: { accountId: accountId.value },
  });
}
</script>

<template>
  <nav
    class="alg-inicio-actions"
    :aria-label="t('ALGORYTHMO_ADMIN.INICIO.ACTIONS.ARIA')"
    data-alg-reveal
  >
    <button
      v-for="action in actions"
      :key="action.id"
      type="button"
      class="alg-btn alg-btn--lg alg-inicio-actions__btn"
      :class="
        action.variant === 'primary' ? 'alg-btn--primary' : 'alg-btn--ghost'
      "
      @click="run(action)"
    >
      <span class="alg-btn__icon" aria-hidden="true">
        <span :class="action.glyph" />
      </span>
      {{ t(action.labelKey) }}
    </button>
  </nav>
</template>

<style lang="scss" scoped>
.alg-inicio-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--alg-space-3);
}

.alg-inicio-actions__btn {
  // Ghost actions sit on a hairline so the secondary options read as buttons,
  // not links, while staying clearly subordinate to the solid primary.
  &.alg-btn--ghost {
    border-color: var(--alg-border);
  }

  > .alg-btn__icon > span {
    width: 1rem;
    height: 1rem;
  }
}

@media (max-width: 480px) {
  .alg-inicio-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
