// algorythmo: Stream E (plan 0011) — AlgThemeControl unit spec.
//
// The theme control is the founder-facing switch for the light ("paper") /
// dark ("command room") / auto register. We lock the contract that selecting a
// segment (1) persists to LOCAL_STORAGE_KEYS.COLOR_SCHEME and (2) calls the
// shared setColorTheme() so BOTH the host `.dark` class and the Algorythmo
// `data-theme` paper tokens flip from one switch. We also lock that the control
// reflects the stored choice on mount (the visible selection must match the
// live theme on first paint).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AlgThemeControl from '../AlgThemeControl.vue';
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { setColorTheme } from 'dashboard/helper/themeHelper.js';

vi.mock('shared/helpers/localStorage');
vi.mock('dashboard/helper/themeHelper.js', () => ({
  setColorTheme: vi.fn(),
}));

describe('AlgThemeControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    LocalStorage.get.mockReturnValue('auto');
  });

  it('renders the three segments (light / dark / auto)', () => {
    const wrapper = mount(AlgThemeControl);
    const segments = wrapper.findAll('.alg-theme-control__segment');
    expect(segments).toHaveLength(3);
  });

  it('reflects the stored choice on mount (selection matches live theme)', async () => {
    LocalStorage.get.mockReturnValue('light');
    const wrapper = mount(AlgThemeControl);
    await wrapper.vm.$nextTick();
    // The single checked radio must be the Light segment (first option).
    const checked = wrapper
      .findAll('[role="radio"]')
      .filter(n => n.attributes('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
    expect(checked[0].text()).toContain('Light');
  });

  it('falls back to auto when the stored value is unknown', () => {
    LocalStorage.get.mockReturnValue('banana');
    const wrapper = mount(AlgThemeControl);
    const segments = wrapper.findAll('.alg-theme-control__segment');
    // Auto is the third segment.
    expect(segments[2].classes()).toContain(
      'alg-theme-control__segment--active'
    );
  });

  it('persists the chosen scheme and applies it via setColorTheme', async () => {
    const wrapper = mount(AlgThemeControl);
    const segments = wrapper.findAll('.alg-theme-control__segment');
    await segments[0].trigger('click'); // light
    expect(LocalStorage.set).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.COLOR_SCHEME,
      'light'
    );
    expect(setColorTheme).toHaveBeenCalled();
  });

  it('drives dark when the dark segment is chosen', async () => {
    const wrapper = mount(AlgThemeControl);
    const segments = wrapper.findAll('.alg-theme-control__segment');
    await segments[1].trigger('click'); // dark
    expect(LocalStorage.set).toHaveBeenCalledWith(
      LOCAL_STORAGE_KEYS.COLOR_SCHEME,
      'dark'
    );
  });

  it('does not re-persist when the active segment is clicked again', async () => {
    LocalStorage.get.mockReturnValue('auto');
    const wrapper = mount(AlgThemeControl);
    const segments = wrapper.findAll('.alg-theme-control__segment');
    await segments[2].trigger('click'); // auto — already active
    expect(LocalStorage.set).not.toHaveBeenCalled();
    expect(setColorTheme).not.toHaveBeenCalled();
  });

  it('exposes a radiogroup with checked state for accessibility', () => {
    LocalStorage.get.mockReturnValue('dark');
    const wrapper = mount(AlgThemeControl);
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true);
    const checked = wrapper
      .findAll('[role="radio"]')
      .filter(n => n.attributes('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });
});
