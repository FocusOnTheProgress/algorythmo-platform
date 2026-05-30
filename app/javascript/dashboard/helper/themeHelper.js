import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';

// algorythmo: rebrand-m0 — Cinematic OS is dark-first (DESIGN.md §1, §3.1).
// The default register is the command-room dark canvas, not the OS preference.
// We only fall back to light when the user has EXPLICITLY chosen 'light'.
// 'auto' resolves to dark regardless of the OS setting, so a client on a
// light-mode laptop still opens Algorythmo OS in its intended dark identity.
//
// algorythmo: A4 — White Model wiring fix.
//   ROOT CAUSE of "light mode is broken": Chatwoot themes via Tailwind
//   `darkMode: 'class'` (toggling `.dark` on <body>), but the Algorythmo design
//   system keys its surfaces off the `data-theme` attribute on <html>
//   ([data-theme='white'] paper tokens in _tokens.scss, and the chrome-purge
//   guard `:root:not([data-theme='white'])` in _chrome.scss). This toggle only
//   ever flipped the `.dark` class and NEVER set `data-theme`, so picking
//   "light" turned Chatwoot's own chrome light while every `--alg-*` surface
//   stayed on the dark tokens — a half-broken, two-tone UI.
//
//   Fix: drive BOTH systems from one switch. Light → remove `.dark` AND set
//   `data-theme='white'` (the Cinematic OS paper variant). Dark/auto → add
//   `.dark` AND set `data-theme='dark'` so the white paper tokens are released
//   and the dark-first chrome guard re-engages.
export const setColorTheme = () => {
  const selectedColorScheme =
    LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || 'auto';
  const root = document.documentElement;
  if (selectedColorScheme === 'light') {
    document.body.classList.remove('dark');
    root.setAttribute('data-theme', 'white');
    root.style.setProperty('color-scheme', 'light');
  } else {
    document.body.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.setProperty('color-scheme', 'dark');
  }
};
