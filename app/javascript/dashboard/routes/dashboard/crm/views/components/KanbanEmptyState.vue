<script setup>
// algorythmo: feature-gate algorythmo_crm
// CONTRACT_M1B §5 — global empty state shown when the entire board has zero leads.
// The CTA always points at `settings/inboxes/new` (channel connect flow): the
// pipeline is fed by inbound conversations, so connecting a channel is the
// canonical first action.
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { computed } from 'vue';

const { t } = useI18n();
const route = useRoute();

// router-link target keeps SPA navigation — a plain href causes a full reload
// and re-hydrates Vuex from scratch, which feels broken next to the rest of
// the dashboard. CONTRACT §5 requires the href to point at inboxes/new.
const connectChannelRoute = computed(() => ({
  path: `/app/accounts/${route.params.accountId}/settings/inboxes/new`,
}));
</script>

<template>
  <div class="alg-kanban-empty" data-testid="kanban-empty-state">
    <h2 class="alg-kanban-empty__title" data-testid="kanban-empty-title">
      {{ t('ALGORYTHMO_CRM.EMPTY_STATE.TITLE') }}
    </h2>
    <p class="alg-kanban-empty__body">
      {{ t('ALGORYTHMO_CRM.EMPTY_STATE.BODY') }}
    </p>
    <router-link
      :to="connectChannelRoute"
      class="alg-kanban-empty__cta"
      data-testid="kanban-empty-cta"
    >
      {{ t('ALGORYTHMO_CRM.EMPTY_STATE.CTA') }}
    </router-link>
  </div>
</template>

<style lang="scss" scoped>
.alg-kanban-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 1.5rem;
  text-align: center;
  color: var(--alg-card-fg, #111827);
}

.alg-kanban-empty__title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.alg-kanban-empty__body {
  max-width: 32rem;
  font-size: 0.875rem;
  color: var(--alg-card-muted-fg, #6b7280);
  margin: 0;
}

.alg-kanban-empty__cta {
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background-color: var(--alg-cta-bg, #2563eb);
  color: var(--alg-cta-fg, #ffffff);
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    background-color: var(--alg-cta-bg-hover, #1d4ed8);
  }

  &:focus-visible {
    outline: 2px solid var(--alg-focus-ring, #2563eb);
    outline-offset: 2px;
  }
}
</style>
