// algorythmo: plan 0009 — Customer Support (D6) demo-data spec.
// The pane no longer fetches from the Help Center store; it renders fixed demo
// data (founder spec 2026-05-29): KPI tiles, Reclame Aqui list, open issues.
// Contract: renders key sections without any store dispatches.
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: key => key }),
}));

import CustomerSupportPane from '../CustomerSupportPane.vue';

function mountPane() {
  return mount(CustomerSupportPane);
}

describe('CustomerSupportPane (plan 0009 D6 — demo data)', () => {
  it('renders four KPI tiles', () => {
    const wrapper = mountPane();
    expect(wrapper.findAll('.alg-kpi-tile')).toHaveLength(4);
  });

  it('renders the editorial header', () => {
    const wrapper = mountPane();
    expect(wrapper.find('.alg-overview-title').exists()).toBe(true);
  });

  it('renders the Reclame Aqui panel with complaint rows', () => {
    const wrapper = mountPane();
    const rows = wrapper.findAll('.alg-issue-row');
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the open issues section', () => {
    const wrapper = mountPane();
    const cards = wrapper.findAll('.alg-subarea-card');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the demo watermark', () => {
    const wrapper = mountPane();
    expect(wrapper.find('.alg-sector__watermark').exists()).toBe(true);
  });

  it('makes no store dispatches — pure frontend demo', () => {
    // There is no store mock here by design. If the component tries to access
    // a store composable it would throw (no provider); the absence of an
    // error is the assertion.
    expect(() => mountPane()).not.toThrow();
  });
});
