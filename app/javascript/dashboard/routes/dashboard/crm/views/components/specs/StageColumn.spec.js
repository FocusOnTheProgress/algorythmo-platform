// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import StageColumn from '../StageColumn.vue';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
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
    global: { plugins: [i18n] },
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

  it('emits drop with stage payload when drop event fires', async () => {
    const wrapper = mountColumn();
    await wrapper.find('[data-testid="stage-column"]').trigger('drop');
    const dropEvents = wrapper.emitted('drop');
    expect(dropEvents).toBeTruthy();
    expect(dropEvents[0][1]).toEqual({ stageId: 7, stageName: 'Qualificado' });
  });
});
