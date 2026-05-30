// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createRouter, createMemoryHistory } from 'vue-router';
import StageColumn from '../StageColumn.vue';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
});

// router-link (per-column gear) needs a router instance even in memory mode.
const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/:path(.*)*', component: { template: '<div />' } }],
});

const stage = (overrides = {}) => ({
  id: 7,
  name: 'Qualificado',
  kind: 'open',
  position: 2,
  aging_coefficient: 4,
  ...overrides,
});

const lead = (overrides = {}) => ({
  id: 42,
  name: 'Maria Santos',
  stage_id: 7,
  stage_name: 'Qualificado',
  channel_origin: 'whatsapp',
  channel_icon: '💬',
  time_human: '3h',
  time_aria_long: 'há 3 horas',
  aging_state: 'green',
  ...overrides,
});

const mountColumn = (props = {}) =>
  mount(StageColumn, {
    props: {
      stage: stage(),
      leads: [],
      boardHasAnyLead: false,
      ...props,
    },
    global: { plugins: [i18n, router] },
  });

describe('StageColumn (CONTRACT_M1B §2)', () => {
  it('exposes data-stage-id and data-stage-kind on the column root', () => {
    const wrapper = mountColumn({ stage: stage({ kind: 'won' }) });
    const col = wrapper.find('[data-testid="stage-column"]');
    expect(col.attributes('data-stage-id')).toBe('7');
    expect(col.attributes('data-stage-kind')).toBe('won');
  });

  it('renders stage-name + stage-count in header', () => {
    const wrapper = mountColumn({ leads: [lead()], boardHasAnyLead: true });
    expect(wrapper.find('[data-testid="stage-name"]').text()).toBe(
      'Qualificado'
    );
    expect(wrapper.find('[data-testid="stage-count"]').text()).toBe('1');
  });

  it('renders one LeadCard per lead inside stage-column-list', () => {
    const wrapper = mountColumn({
      leads: [lead({ id: 1 }), lead({ id: 2 })],
      boardHasAnyLead: true,
    });
    const list = wrapper.find('[data-testid="stage-column-list"]');
    expect(list.attributes('role')).toBe('list');
    expect(list.findAll('[data-testid="lead-card"]')).toHaveLength(2);
  });

  it('shows per-column empty state ONLY when board has leads but this column has none', () => {
    const empty = mountColumn({ leads: [], boardHasAnyLead: true });
    expect(empty.find('[data-testid="stage-empty-state"]').exists()).toBe(true);
    expect(empty.find('[data-testid="stage-empty-text"]').text()).toBe(
      'Nenhum lead aqui ainda'
    );
  });

  it('hides per-column empty when board is globally empty (global empty state owns that case)', () => {
    const wrapper = mountColumn({ leads: [], boardHasAnyLead: false });
    expect(wrapper.find('[data-testid="stage-empty-state"]').exists()).toBe(
      false
    );
  });

  it('exposes data-stage-id on the per-column empty element', () => {
    const wrapper = mountColumn({ leads: [], boardHasAnyLead: true });
    const empty = wrapper.find('[data-testid="stage-empty-state"]');
    expect(empty.attributes('data-stage-id')).toBe('7');
  });

  it('applies the stage accent as CSS custom properties + modifier class when present', () => {
    const wrapper = mountColumn({
      stage: stage({ accent: 'oklch(0.55 0.10 235)' }),
    });
    const col = wrapper.find('[data-testid="stage-column"]');
    expect(col.classes()).toContain('alg-stage-column--accented');
    const style = col.attributes('style') || '';
    expect(style).toContain('--alg-stage-accent: oklch(0.55 0.10 235)');
    expect(style).toContain('--alg-stage-accent-tint');
  });

  it('omits the accent class + vars for a stage with no accent (live stages)', () => {
    const wrapper = mountColumn({ stage: stage() });
    const col = wrapper.find('[data-testid="stage-column"]');
    expect(col.classes()).not.toContain('alg-stage-column--accented');
    const style = col.attributes('style') || '';
    expect(style).not.toContain('--alg-stage-accent');
  });

  it('emits drop with stage payload when drop event fires', async () => {
    const wrapper = mountColumn();
    await wrapper.find('[data-testid="stage-column"]').trigger('drop');
    const dropEvents = wrapper.emitted('drop');
    expect(dropEvents).toBeTruthy();
    expect(dropEvents[0][1]).toEqual({ stageId: 7, stageName: 'Qualificado' });
  });

  // Round-3 — per-column header actions (gear is the sole pipeline-config entry)
  describe('header actions (round-3)', () => {
    it('renders the gear config link to pipelineConfigPath when provided', () => {
      const wrapper = mountColumn({
        pipelineConfigPath: '/app/accounts/9/crm/pipeline',
      });
      const link = wrapper.find('[data-testid="pipeline-config-link"]');
      expect(link.exists()).toBe(true);
      expect(link.attributes('href')).toBe('/app/accounts/9/crm/pipeline');
      expect(link.attributes('aria-label')).toContain('Qualificado');
    });

    it('hides the gear when no pipelineConfigPath is provided (e.g. demo)', () => {
      const wrapper = mountColumn();
      expect(
        wrapper.find('[data-testid="pipeline-config-link"]').exists()
      ).toBe(false);
    });

    it('emits addLead with the stage payload when the + button is clicked', async () => {
      const wrapper = mountColumn();
      await wrapper.find('[data-testid="stage-add-lead"]').trigger('click');
      const events = wrapper.emitted('addLead');
      expect(events).toBeTruthy();
      expect(events[0][0]).toEqual({
        stageId: 7,
        stageName: 'Qualificado',
      });
    });
  });

  // v1.2.0 — observability chip (M1-D)
  describe('stage-metrics-chip (CONTRACT v1.2.0)', () => {
    it('renders the chip with avg time and conversion when metrics are provided', () => {
      const wrapper = mountColumn({
        metrics: {
          stage_id: 7,
          stage_kind: 'open',
          lead_count: 5,
          avg_time_in_stage_seconds: 14400, // 4h
          conversion_rate_to_next: 0.55,
        },
      });
      const chip = wrapper.find('[data-testid="stage-metrics-chip"]');
      expect(chip.exists()).toBe(true);
      expect(chip.attributes('data-stage-id')).toBe('7');
      expect(
        wrapper.find('[data-testid="stage-metrics-avg-time"]').text()
      ).toBe('4h');
      const conv = wrapper.find('[data-testid="stage-metrics-conversion"]');
      expect(conv.exists()).toBe(true);
      expect(conv.text()).toContain('55%');
    });

    it('hides the conversion span when conversion_rate_to_next is null (terminal stage)', () => {
      const wrapper = mountColumn({
        stage: stage({ kind: 'won' }),
        metrics: {
          stage_id: 7,
          stage_kind: 'won',
          lead_count: 3,
          avg_time_in_stage_seconds: 0,
          conversion_rate_to_next: null,
        },
      });
      expect(wrapper.find('[data-testid="stage-metrics-chip"]').exists()).toBe(
        true
      );
      expect(
        wrapper.find('[data-testid="stage-metrics-conversion"]').exists()
      ).toBe(false);
    });

    it('renders placeholder em-dash when metrics is null', () => {
      const wrapper = mountColumn({ metrics: null });
      const chip = wrapper.find('[data-testid="stage-metrics-chip"]');
      expect(chip.exists()).toBe(true);
      expect(
        wrapper.find('[data-testid="stage-metrics-avg-time"]').text()
      ).toBe('—');
      expect(
        wrapper.find('[data-testid="stage-metrics-conversion"]').exists()
      ).toBe(false);
    });

    it('renders 0s when avg_time_in_stage_seconds is exactly 0 (service contract: zero is real, not missing)', () => {
      const wrapper = mountColumn({
        metrics: {
          stage_id: 7,
          stage_kind: 'open',
          lead_count: 2,
          avg_time_in_stage_seconds: 0,
          conversion_rate_to_next: 0.0,
        },
      });
      expect(
        wrapper.find('[data-testid="stage-metrics-avg-time"]').text()
      ).not.toBe('—');
      expect(
        wrapper.find('[data-testid="stage-metrics-avg-time"]').text()
      ).toContain('0');
    });

    it('formats seconds under 1 minute as Xs', () => {
      const wrapper = mountColumn({
        metrics: {
          stage_id: 7,
          stage_kind: 'open',
          lead_count: 1,
          avg_time_in_stage_seconds: 30,
          conversion_rate_to_next: 0,
        },
      });
      expect(
        wrapper.find('[data-testid="stage-metrics-avg-time"]').text()
      ).toBe('30s');
    });

    it('sets an aria-label describing avg time and conversion together', () => {
      const wrapper = mountColumn({
        metrics: {
          stage_id: 7,
          stage_kind: 'open',
          lead_count: 5,
          avg_time_in_stage_seconds: 14400,
          conversion_rate_to_next: 0.55,
        },
      });
      const chip = wrapper.find('[data-testid="stage-metrics-chip"]');
      const label = chip.attributes('aria-label');
      expect(label).toContain('4h');
      expect(label).toContain('55%');
    });
  });
});
