// algorythmo: M8b — BrainDocumentUpload unit spec
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BrainDocumentUpload from '../BrainDocumentUpload.vue';

function mountUpload() {
  return mount(BrainDocumentUpload);
}

describe('BrainDocumentUpload', () => {
  it('renders the root section with aria-label', () => {
    const wrapper = mountUpload();
    const root = wrapper.find('.alg-upload');
    expect(root.exists()).toBe(true);
    expect(root.attributes('aria-label')).toBeTruthy();
  });

  it('renders 6 category filter chips', () => {
    const wrapper = mountUpload();
    const filters = wrapper.findAll('.alg-upload__filter');
    expect(filters).toHaveLength(6);
  });

  it('the "All" filter is active by default', () => {
    const wrapper = mountUpload();
    const active = wrapper.findAll('.alg-upload__filter--active');
    expect(active).toHaveLength(1);
    expect(active[0].attributes('aria-pressed')).toBe('true');
  });

  it('renders the dropzone with the spec microcopy', () => {
    const wrapper = mountUpload();
    const dropzone = wrapper.find('.alg-upload__dropzone');
    expect(dropzone.exists()).toBe(true);
    expect(dropzone.attributes('role')).toBe('button');
    expect(dropzone.attributes('tabindex')).toBe('0');
    const copy = wrapper.find('.alg-upload__copy');
    expect(copy.text().trim().length).toBeGreaterThan(0);
  });

  it('renders an empty-state message when no files were uploaded', () => {
    const wrapper = mountUpload();
    expect(wrapper.find('.alg-upload__empty').exists()).toBe(true);
    expect(wrapper.find('.alg-upload__file').exists()).toBe(false);
  });

  it('clicking a category filter switches the active state', async () => {
    const wrapper = mountUpload();
    const filters = wrapper.findAll('.alg-upload__filter');
    await filters[2].trigger('click');
    expect(filters[2].classes()).toContain('alg-upload__filter--active');
    expect(filters[0].classes()).not.toContain('alg-upload__filter--active');
  });
});
