import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import AlgBrandLogo from '../AlgBrandLogo.vue';
import { useMapGetter } from 'dashboard/composables/store';

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: vi.fn(),
}));

// Drives the four getters AlgBrandLogo reads. Pass the account object and the
// installation thumbnail; the component resolves the logo from these.
const wireGetters = ({ account = {}, logoThumbnail = '' } = {}) => {
  useMapGetter.mockImplementation(key => {
    switch (key) {
      case 'accounts/getAccount':
        return ref(() => account);
      case 'getCurrentAccountId':
        return ref(1);
      case 'globalConfig/get':
        return ref({ logoThumbnail });
      default:
        return ref(undefined);
    }
  });
};

describe('AlgBrandLogo — configured-logo resolution (Item 2 contract)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the UPLOADED account logo (logo_url) above everything else', () => {
    wireGetters({
      account: {
        logo_url: 'https://cdn/uploaded.svg',
        logo: 'https://cdn/enriched.png',
      },
      logoThumbnail: 'https://cdn/installation.png',
    });
    const wrapper = mount(AlgBrandLogo);
    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://cdn/uploaded.svg');
  });

  it('falls back to the enrichment logo when no upload exists', () => {
    wireGetters({
      account: { logo: 'https://cdn/enriched.png' },
      logoThumbnail: 'https://cdn/installation.png',
    });
    expect(mount(AlgBrandLogo).find('img').attributes('src')).toBe(
      'https://cdn/enriched.png'
    );
  });

  it('falls back to the installation logoThumbnail when the account has none', () => {
    wireGetters({ account: {}, logoThumbnail: 'https://cdn/installation.png' });
    expect(mount(AlgBrandLogo).find('img').attributes('src')).toBe(
      'https://cdn/installation.png'
    );
  });

  it('renders the AlgBrandMark fallback (no img) only when NO logo is configured', () => {
    wireGetters({ account: {}, logoThumbnail: '' });
    const wrapper = mount(AlgBrandLogo);
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('svg.alg-brand-mark').exists()).toBe(true);
  });

  it('marks the logo image decorative (empty alt, aria-hidden) when decorative', () => {
    wireGetters({ account: { logo_url: 'https://cdn/uploaded.svg' } });
    const img = mount(AlgBrandLogo, { props: { decorative: true } }).find(
      'img'
    );
    expect(img.attributes('alt')).toBe('');
    expect(img.attributes('aria-hidden')).toBe('true');
  });

  it('uses the label as alt text when not decorative', () => {
    wireGetters({ account: { logo_url: 'https://cdn/uploaded.svg' } });
    const img = mount(AlgBrandLogo, { props: { label: 'Acme Co' } }).find(
      'img'
    );
    expect(img.attributes('alt')).toBe('Acme Co');
  });
});
