import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';

// algorythmo: rebrand-m0 — Cinematic OS is dark-first (DESIGN.md §1, §3.1).
// The default register is the command-room dark canvas, not the OS preference.
// We only fall back to light when the user has EXPLICITLY chosen 'light'.
// 'auto' resolves to dark regardless of the OS setting, so a client on a
// light-mode laptop still opens Algorythmo OS in its intended dark identity.
export const setColorTheme = () => {
  const selectedColorScheme =
    LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || 'auto';
  if (selectedColorScheme === 'light') {
    document.body.classList.remove('dark');
    document.documentElement.style.setProperty('color-scheme', 'light');
  } else {
    document.body.classList.add('dark');
    document.documentElement.style.setProperty('color-scheme', 'dark');
  }
};
