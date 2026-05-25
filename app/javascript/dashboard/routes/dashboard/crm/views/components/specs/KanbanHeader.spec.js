// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';
import KanbanHeader from '../KanbanHeader.vue';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
});

// router-link needs a router instance even in a memory-mode test.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:path(.*)*', component: { template: '<div />' } }],
});

const summaryFixture = (overrides = {}) => ({
  open_leads: 42,
  avg_funnel_hours: 73.5,
  conversion_rate: 0.31,
  ...overrides,
});

const mountHeader = (props = {}) =>
  mount(KanbanHeader, {
    props: {
      pipelineConfigPath: '/app/accounts/1/crm/pipeline',
      summary: null,
      loading: false,
      error: null,
      searchValue: '',
      ...props,
    },
    global: { plugins: [i18n, router] },
  });

describe('KanbanHeader (CONTRACT_M1B §2 v1.2.0)', () => {
  it('renders the three required metric stats with data-metric-key', () => {
    const wrapper = mountHeader({ summary: summaryFixture() });
    const stats = wrapper.findAll('[data-testid="kanban-metrics-stat"]');
    expect(stats).toHaveLength(3);
    expect(stats.map(s => s.attributes('data-metric-key'))).toEqual([
      'open_leads',
      'avg_funnel_hours',
      'conversion_rate',
    ]);
  });

  it('exposes the kanban-metrics-summary container with aria-live polite', () => {
    const wrapper = mountHeader({ summary: summaryFixture() });
    const summary = wrapper.find('[data-testid="kanban-metrics-summary"]');
    expect(summary.exists()).toBe(true);
    expect(summary.attributes('aria-live')).toBe('polite');
  });

  it('renders concrete values when summary is hydrated', () => {
    const wrapper = mountHeader({ summary: summaryFixture() });
    const stats = wrapper.findAll('[data-testid="kanban-metrics-stat"]');
    expect(stats[0].text()).toContain('42');
    expect(stats[1].text()).toContain('74h');
    expect(stats[2].text()).toContain('31%');
  });

  it('formats avg_funnel_hours under 1h as minutes', () => {
    const wrapper = mountHeader({
      summary: summaryFixture({ avg_funnel_hours: 0.5 }),
    });
    const stat = wrapper.find('[data-metric-key="avg_funnel_hours"]');
    expect(stat.text()).toContain('30min');
  });

  it('formats avg_funnel_hours over 48h as days', () => {
    const wrapper = mountHeader({
      summary: summaryFixture({ avg_funnel_hours: 120 }),
    });
    const stat = wrapper.find('[data-metric-key="avg_funnel_hours"]');
    expect(stat.text()).toContain('5d');
  });

  it('falls back to placeholder em-dash when summary is null', () => {
    const wrapper = mountHeader({ summary: null });
    const stats = wrapper.findAll('[data-testid="kanban-metrics-stat"]');
    stats.forEach(s => {
      expect(s.text()).toContain('—');
    });
  });

  it('marks the summary as aria-busy and dims it when loading', () => {
    const wrapper = mountHeader({ loading: true });
    const summary = wrapper.find('[data-testid="kanban-metrics-summary"]');
    expect(summary.attributes('aria-busy')).toBe('true');
    expect(wrapper.find('.alg-kanban-header').classes()).toContain(
      'alg-kanban-header--loading'
    );
  });

  it('surfaces an error indicator with the i18n tooltip when error is set', () => {
    const wrapper = mountHeader({
      summary: summaryFixture(),
      error: 'boom',
    });
    const icon = wrapper.find('[data-testid="kanban-metrics-error"]');
    expect(icon.exists()).toBe(true);
    expect(icon.attributes('title')).toBe(
      algorythmoCrm.ALGORYTHMO_CRM.METRICS.ERROR_TOOLTIP
    );
  });

  it('hides the error indicator when error is null', () => {
    const wrapper = mountHeader({ summary: summaryFixture(), error: null });
    expect(wrapper.find('[data-testid="kanban-metrics-error"]').exists()).toBe(
      false
    );
  });

  it('emits update:searchValue when the search input changes', async () => {
    const wrapper = mountHeader();
    const input = wrapper.find('[data-testid="kanban-search-input"]');
    await input.setValue('Maria');
    const emitted = wrapper.emitted('update:searchValue');
    expect(emitted).toBeTruthy();
    expect(emitted[0]).toEqual(['Maria']);
  });

  it('renders the pipeline-config-link with the provided path', () => {
    const wrapper = mountHeader({
      pipelineConfigPath: '/app/accounts/7/crm/pipeline',
    });
    const link = wrapper.find('[data-testid="pipeline-config-link"]');
    expect(link.exists()).toBe(true);
    // router-link rendered as <a href="…"> in the test runner.
    expect(link.attributes('href')).toBe('/app/accounts/7/crm/pipeline');
  });

  it('keeps the kanban-title and kanban-search-input testids (CONTRACT §2)', () => {
    const wrapper = mountHeader();
    expect(wrapper.find('[data-testid="kanban-title"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kanban-search-input"]').exists()).toBe(
      true
    );
  });
});
