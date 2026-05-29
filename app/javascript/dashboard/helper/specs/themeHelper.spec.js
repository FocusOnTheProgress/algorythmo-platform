import { setColorTheme } from 'dashboard/helper/themeHelper.js';
import { LocalStorage } from 'shared/helpers/localStorage';

vi.mock('shared/helpers/localStorage');

// algorythmo: rebrand-m0 — Cinematic OS is dark-first (DESIGN.md §1).
// The boot theme defaults to dark. Only an EXPLICIT 'light' preference opts out;
// 'auto' resolves to dark regardless of the OS color scheme. These specs assert
// that dark-first contract.
describe('setColorTheme', () => {
  it('should set body class to dark if selectedColorScheme is dark', () => {
    LocalStorage.get.mockReturnValue('dark');
    setColorTheme();
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('should set body class to dark if selectedColorScheme is auto (dark-first, OS ignored)', () => {
    LocalStorage.get.mockReturnValue('auto');
    setColorTheme();
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('should keep body dark when selectedColorScheme is auto even on a light OS', () => {
    LocalStorage.get.mockReturnValue('auto');
    setColorTheme();
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('should not set body class to dark if selectedColorScheme is light', () => {
    LocalStorage.get.mockReturnValue('light');
    setColorTheme();
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('should set body class to dark if selectedColorScheme is undefined (default dark-first)', () => {
    LocalStorage.get.mockReturnValue(undefined);
    setColorTheme();
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('should set documentElement style to dark if selectedColorScheme is dark', () => {
    LocalStorage.get.mockReturnValue('dark');
    setColorTheme();
    expect(document.documentElement.getAttribute('style')).toBe(
      'color-scheme: dark;'
    );
  });

  it('should set documentElement style to dark if selectedColorScheme is auto', () => {
    LocalStorage.get.mockReturnValue('auto');
    setColorTheme();
    expect(document.documentElement.getAttribute('style')).toBe(
      'color-scheme: dark;'
    );
  });

  it('should set documentElement style to light only if selectedColorScheme is light', () => {
    LocalStorage.get.mockReturnValue('light');
    setColorTheme();
    expect(document.documentElement.getAttribute('style')).toBe(
      'color-scheme: light;'
    );
  });

  it('should set documentElement style to dark if selectedColorScheme is undefined', () => {
    LocalStorage.get.mockReturnValue(undefined);
    setColorTheme();
    expect(document.documentElement.getAttribute('style')).toBe(
      'color-scheme: dark;'
    );
  });
});
