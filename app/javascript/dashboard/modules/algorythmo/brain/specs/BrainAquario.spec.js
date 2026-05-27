// algorythmo: M8a — BrainAquario unit spec
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainAquario from '../BrainAquario.vue';

function mountAquario() {
  return mount(BrainAquario);
}

describe('BrainAquario', () => {
  it('renders the aquário root with aria-label', () => {
    const wrapper = mountAquario();
    const root = wrapper.find('.alg-aquario');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBeTruthy();
  });

  it('renders the decorative strata layer', () => {
    const wrapper = mountAquario();
    const strata = wrapper.find('.alg-aquario__strata');
    expect(strata.exists()).toBe(true);
    expect(strata.attributes('aria-hidden')).toBe('true');
  });

  it('renders exactly 2 anchor columns', () => {
    const wrapper = mountAquario();
    expect(wrapper.findAll('.alg-aquario__column--anchor')).toHaveLength(2);
  });

  it('renders exactly 4 secondary columns', () => {
    const wrapper = mountAquario();
    expect(wrapper.findAll('.alg-aquario__column--secondary')).toHaveLength(4);
  });

  it('renders 6 column labels total with non-empty text', () => {
    const wrapper = mountAquario();
    const labels = wrapper.findAll('.alg-aquario__column-label');
    expect(labels).toHaveLength(6);
    labels.forEach(l => expect(l.text().trim().length).toBeGreaterThan(0));
  });

  it('each anchor column has 3 specimens', () => {
    const wrapper = mountAquario();
    const anchors = wrapper.findAll('.alg-aquario__column--anchor');
    anchors.forEach(col => {
      expect(col.findAll('.alg-aquario__specimen')).toHaveLength(3);
    });
  });

  it('each secondary column has at least 2 specimens', () => {
    const wrapper = mountAquario();
    const secondary = wrapper.findAll('.alg-aquario__column--secondary');
    secondary.forEach(col => {
      expect(
        col.findAll('.alg-aquario__specimen').length
      ).toBeGreaterThanOrEqual(2);
    });
  });

  it('only the leftmost column per row drops its left border', () => {
    const wrapper = mountAquario();
    const leftmost = wrapper.findAll('.alg-aquario__column--leftmost');
    expect(leftmost).toHaveLength(2);
  });
});
