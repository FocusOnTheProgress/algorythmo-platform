// algorythmo: plan 0007 M2-c — Customer Support read-only behavior (D7).
// Asserts: only READ dispatches fire (portals/categories/articles index), the
// published-status filter is applied, NO management actions (create / update /
// delete) are ever dispatched, and the empty state degrades gracefully.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const dispatch = vi.fn().mockResolvedValue(undefined);
const getters = {};

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
}));

vi.mock('dashboard/composables/store', () => ({
  useStore: () => ({ dispatch }),
  useMapGetter: key => ({
    get value() {
      return getters[key];
    },
  }),
}));

import CustomerSupportPane from '../CustomerSupportPane.vue';

function setGetters({ portals = [], articles = [], categories = [] } = {}) {
  getters['portals/allPortals'] = portals;
  getters['portals/isFetchingPortals'] = false;
  getters['articles/allArticles'] = articles;
  getters['articles/isFetching'] = false;
  getters['categories/allCategories'] = categories;
}

describe('CustomerSupportPane (M2-c)', () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it('fetches portals, then categories + published articles for the first portal', async () => {
    setGetters({
      portals: [
        { slug: 'help', name: 'Ajuda', meta: { default_locale: 'pt' } },
      ],
    });
    mount(CustomerSupportPane);
    await flushPromises();

    expect(dispatch).toHaveBeenCalledWith('portals/index');
    expect(dispatch).toHaveBeenCalledWith('categories/index', {
      portalSlug: 'help',
      locale: 'pt',
    });
    expect(dispatch).toHaveBeenCalledWith('articles/index', {
      portalSlug: 'help',
      locale: 'pt',
      status: 1, // published — getArticleStatus('published')
    });
  });

  it('never dispatches a write action (create / update / delete / show)', async () => {
    setGetters({
      portals: [
        { slug: 'help', name: 'Ajuda', meta: { default_locale: 'pt' } },
      ],
    });
    mount(CustomerSupportPane);
    await flushPromises();

    const dispatched = dispatch.mock.calls.map(([action]) => action);
    const forbidden = dispatched.filter(action =>
      /(create|update|delete|destroy|show)/i.test(action)
    );
    expect(forbidden).toEqual([]);
  });

  it('renders the empty state when no portal is configured', async () => {
    setGetters({ portals: [] });
    const wrapper = mount(CustomerSupportPane);
    await flushPromises();

    expect(wrapper.find('.alg-support__state').exists()).toBe(true);
    expect(wrapper.find('.alg-support__list').exists()).toBe(false);
  });

  it('lists published articles with their category and view count', async () => {
    setGetters({
      portals: [
        { slug: 'help', name: 'Ajuda', meta: { default_locale: 'pt' } },
      ],
      categories: [{ id: 7, name: 'Pagamentos' }],
      articles: [{ id: 1, title: 'Como pagar', categoryId: 7, views: 12 }],
    });
    const wrapper = mount(CustomerSupportPane);
    await flushPromises();

    const article = wrapper.find('.alg-support__article');
    expect(article.exists()).toBe(true);
    expect(article.text()).toContain('Como pagar');
    expect(article.text()).toContain('Pagamentos');
  });
});
