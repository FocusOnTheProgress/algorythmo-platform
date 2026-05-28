<script setup>
// algorythmo: plan 0007 M2-c — Customer Support sub-tab (D7).
// Read-only window into the Help Center: published articles + their categories,
// for support reference. The management chrome (Settings / Locales / Categories
// management / Articles editor) is deliberately absent — this pane only READS.
// The upstream Help Center routes stay live and unmodified; we compose their
// store getters here, never their editor SFCs.
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import {
  ARTICLE_STATUSES,
  getArticleStatus,
} from 'dashboard/helper/portalHelper';

const { t } = useI18n();
const store = useStore();

const portals = useMapGetter('portals/allPortals');
const isFetchingPortals = useMapGetter('portals/isFetchingPortals');
const articles = useMapGetter('articles/allArticles');
const isFetchingArticles = useMapGetter('articles/isFetching');
const categories = useMapGetter('categories/allCategories');

const isReady = ref(false);

const portal = computed(() => portals.value?.[0]);

const categoryNameById = computed(() =>
  Object.fromEntries((categories.value ?? []).map(c => [c.id, c.name]))
);

const articleRows = computed(() =>
  (articles.value ?? []).map(article => ({
    id: article.id,
    title: article.title,
    views: article.views ?? 0,
    categoryName:
      categoryNameById.value[article.categoryId] ??
      categoryNameById.value[article.category_id] ??
      t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.UNCATEGORIZED'),
  }))
);

const isLoading = computed(
  () => isFetchingPortals.value || isFetchingArticles.value || !isReady.value
);
const isEmpty = computed(() => !isLoading.value && !portal.value);

onMounted(async () => {
  await store.dispatch('portals/index');
  const current = portals.value?.[0];
  if (current) {
    const params = {
      portalSlug: current.slug,
      locale: current.meta?.default_locale,
    };
    await Promise.all([
      store.dispatch('categories/index', params),
      store.dispatch('articles/index', {
        ...params,
        status: getArticleStatus(ARTICLE_STATUSES.PUBLISHED),
      }),
    ]);
  }
  isReady.value = true;
});
</script>

<template>
  <section
    class="alg-support"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.ARIA')"
  >
    <p
      v-if="isLoading"
      class="alg-support__state"
      role="status"
      aria-live="polite"
    >
      {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.LOADING') }}
    </p>

    <p v-else-if="isEmpty" class="alg-support__state">
      {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.EMPTY') }}
    </p>

    <template v-else>
      <header class="alg-support__header">
        <p class="alg-support__portal">{{ portal.name }}</p>
        <p class="alg-support__hint">
          {{ t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.HINT') }}
        </p>
      </header>

      <div v-if="categories.length" class="alg-support__categories">
        <span
          v-for="category in categories"
          :key="category.id"
          class="alg-support__chip"
        >
          {{ category.name }}
        </span>
      </div>

      <ul v-if="articleRows.length" class="alg-support__list">
        <li
          v-for="article in articleRows"
          :key="article.id"
          class="alg-support__article"
        >
          <span class="alg-support__article-title">{{ article.title }}</span>
          <span class="alg-support__article-meta">
            {{ article.categoryName }} ·
            {{
              t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.VIEWS', {
                count: article.views,
              })
            }}
          </span>
        </li>
      </ul>

      <p v-else class="alg-support__state">
        {{
          t('ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.NO_ARTICLES')
        }}
      </p>
    </template>
  </section>
</template>
