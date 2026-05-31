<script setup>
// algorythmo: Stream D — Início Catch-up Hub ("Enquanto você estava fora").
//
// Translates company activity into human, actionable language — never system
// logs. Each line reads like a colleague catching you up ("Sua equipe avançou
// em 2 projetos desde ontem."), and the whole card is a link into the relevant
// surface. DEMO data arrives via props (the screen owns the demo provider); the
// real OS activity summary drops in at that seam with no change here.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useStore } from 'dashboard/composables/store';
import AlgGlassCard from 'dashboard/components-next/algorythmo/AlgGlassCard.vue';

defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const { t } = useI18n();
const router = useRouter();
const store = useStore();

const accountId = computed(() => store.getters.getCurrentAccountId);

function follow(item) {
  if (!item?.routeName) return;
  router.push({
    name: item.routeName,
    params: { accountId: accountId.value },
  });
}
</script>

<template>
  <section
    class="alg-inicio-catchup"
    aria-labelledby="alg-inicio-catchup-title"
  >
    <header class="alg-inicio-catchup__head" data-alg-reveal>
      <h2 id="alg-inicio-catchup-title" class="alg-inicio-catchup__title">
        {{ t('ALGORYTHMO_ADMIN.INICIO.CATCH_UP.TITLE') }}
      </h2>
      <p class="alg-inicio-catchup__sub">
        {{ t('ALGORYTHMO_ADMIN.INICIO.CATCH_UP.SUBTITLE') }}
      </p>
    </header>

    <ul class="alg-inicio-catchup__list" role="list">
      <li
        v-for="item in items"
        :key="item.id"
        class="alg-inicio-catchup__item"
        data-alg-reveal
      >
        <AlgGlassCard
          tier="soft"
          interactive
          as="button"
          type="button"
          :class="`alg-inicio-catchup__card alg-inicio-catchup__card--${item.tone}`"
          @click="follow(item)"
        >
          <span class="alg-inicio-catchup__row">
            <span class="alg-inicio-catchup__glyph" aria-hidden="true">
              <span :class="item.glyph" />
            </span>
            <span class="alg-inicio-catchup__line">
              {{ t(item.lineKey, { count: item.count }) }}
            </span>
            <span
              class="alg-inicio-catchup__chevron i-lucide-arrow-up-right"
              aria-hidden="true"
            />
          </span>
        </AlgGlassCard>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.alg-inicio-catchup {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-6);
  width: 100%;
}

.alg-inicio-catchup__head {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-inicio-catchup__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-xl);
  font-weight: var(--alg-weight-regular);
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-inicio-catchup__sub {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-tertiary);
}

.alg-inicio-catchup__list {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.alg-inicio-catchup__item {
  display: block;
}

// The glass card is the interactive surface; widen it to the column and tune
// its inner padding to the operational catch-up rhythm.
.alg-inicio-catchup__card {
  width: 100%;
  padding: var(--alg-space-4) var(--alg-space-5);
}

.alg-inicio-catchup__row {
  display: flex;
  align-items: center;
  gap: var(--alg-space-4);
}

// Leading glyph — monochrome by default; tone shifts only its tint a hair so
// progress / attention read at a glance without colouring the chrome.
.alg-inicio-catchup__glyph {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  color: var(--alg-fg-secondary);

  > span {
    width: 1.125rem;
    height: 1.125rem;
  }
}

.alg-inicio-catchup__card--progress .alg-inicio-catchup__glyph {
  color: var(--alg-color-success);
}

.alg-inicio-catchup__card--attention .alg-inicio-catchup__glyph {
  color: var(--alg-color-warning);
}

.alg-inicio-catchup__line {
  flex: 1;
  min-width: 0;
  font-size: var(--alg-text-md);
  line-height: var(--alg-leading-normal);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-primary);
}

.alg-inicio-catchup__chevron {
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  color: var(--alg-fg-quaternary);
  transition: color var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-inicio-catchup__card:hover .alg-inicio-catchup__chevron {
  color: var(--alg-fg-secondary);
}
</style>
