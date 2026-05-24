import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgAvatar from '../AlgAvatar.vue';

describe('AlgAvatar', () => {
  describe('with src', () => {
    it('renders an img element', () => {
      const wrapper = mount(AlgAvatar, {
        props: { src: 'https://example.com/photo.jpg', name: 'Maria Santos' },
      });
      expect(wrapper.find('img').exists()).toBe(true);
      expect(wrapper.find('img').attributes('src')).toBe(
        'https://example.com/photo.jpg'
      );
    });

    it('sets alt text to name', () => {
      const wrapper = mount(AlgAvatar, {
        props: { src: 'https://example.com/photo.jpg', name: 'João Silva' },
      });
      expect(wrapper.find('img').attributes('alt')).toBe('João Silva');
    });

    it('falls back to initials on img error', async () => {
      const wrapper = mount(AlgAvatar, {
        props: { src: 'bad-url.jpg', name: 'Ana Lima' },
      });
      await wrapper.find('img').trigger('error');
      expect(wrapper.find('img').exists()).toBe(false);
      expect(wrapper.find('span').text()).toBe('AL');
    });
  });

  describe('without src (initials fallback)', () => {
    it('renders initials for two-word name', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Carlos Mendes' },
      });
      expect(wrapper.find('span').text()).toBe('CM');
    });

    it('renders first two chars for single-word name', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Maria' },
      });
      expect(wrapper.find('span').text()).toBe('MA');
    });

    it('renders initials as uppercase', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'joana silva' },
      });
      expect(wrapper.find('span').text()).toBe('JS');
    });

    it('applies gradient background style', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Test User' },
      });
      expect(wrapper.element.style.background).toContain('linear-gradient');
    });

    it('has role=img and aria-label', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Test User' },
      });
      expect(wrapper.attributes('role')).toBe('img');
      expect(wrapper.attributes('aria-label')).toBe('Test User');
    });
  });

  describe('size variants', () => {
    it('applies alg-avatar--sm for size=sm', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Test', size: 'sm' },
      });
      expect(wrapper.classes()).toContain('alg-avatar--sm');
    });

    it('applies alg-avatar--lg for size=lg', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Test', size: 'lg' },
      });
      expect(wrapper.classes()).toContain('alg-avatar--lg');
    });

    it('applies no size class for size=md (default)', () => {
      const wrapper = mount(AlgAvatar, {
        props: { name: 'Test', size: 'md' },
      });
      expect(wrapper.classes()).not.toContain('alg-avatar--sm');
      expect(wrapper.classes()).not.toContain('alg-avatar--lg');
    });
  });

  describe('deterministic gradient', () => {
    it('produces same gradient for same name', () => {
      const w1 = mount(AlgAvatar, { props: { name: 'Fixed Name' } });
      const w2 = mount(AlgAvatar, { props: { name: 'Fixed Name' } });
      expect(w1.element.style.background).toBe(w2.element.style.background);
    });

    it('produces different gradients for different names', () => {
      const w1 = mount(AlgAvatar, { props: { name: 'Alice' } });
      const w2 = mount(AlgAvatar, { props: { name: 'Bob' } });
      // Very unlikely to be equal for different names.
      expect(w1.element.style.background).not.toBe(w2.element.style.background);
    });
  });
});
