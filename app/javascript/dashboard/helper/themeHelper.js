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
// algorythmo: operador-stock — two visual surfaces coexist on one build:
//   • 'algorythmo' (default, ADMIN) — the Cinematic OS chrome (dark-first).
//   • 'stock'      (OPERATOR / agent) — bare upstream Chatwoot, light, with the
//     entire Algorythmo chrome layer neutralized. Driven by a <html
//     data-surface='stock'> attribute that the scoped guards in _chrome.scss and
//     _woot.scss key off (:not([data-surface='stock'])). data-theme stays
//     'white' on the operator so OUR OWN components (CRM, Copiloto) keep the
//     coherent paper token set while the host chrome reverts to stock Chatwoot.
//   Only role 'administrator' keeps the Algorythmo surface; every other role
//   (agent, custom_role) renders stock Chatwoot.
// Persisted as a BARE primitive string (never an object): the pre-paint boot
// script in vueapp.html.erb reads it with `localStorage.getItem(...) === 'stock'`
// and getStoredSurface() relies on the raw value, so both ends must agree on a
// plain string. Do not wrap this in an object.
export const SURFACE = {
  STOCK: 'stock',
  ALGORYTHMO: 'algorythmo',
};

export const resolveSurfaceForRole = role =>
  role === 'administrator' ? SURFACE.ALGORYTHMO : SURFACE.STOCK;

export const getStoredSurface = () =>
  LocalStorage.get(LOCAL_STORAGE_KEYS.SURFACE) === SURFACE.STOCK
    ? SURFACE.STOCK
    : SURFACE.ALGORYTHMO;

// Persist the surface resolved for the active account role so the pre-paint boot
// script (vueapp.html.erb) can neutralize the dark-first boot before the SPA
// mounts — no dark→light flash for the operator after the first login.
export const persistSurfaceForRole = role => {
  const surface = resolveSurfaceForRole(role);
  LocalStorage.set(LOCAL_STORAGE_KEYS.SURFACE, surface);
  return surface;
};

export const setColorTheme = () => {
  const root = document.documentElement;

  // Operator surface: stock Chatwoot, light. The Algorythmo chrome overrides are
  // suppressed via data-surface='stock'; data-theme='white' keeps CRM/Copiloto
  // (our components) on the paper tokens so they stay coherent on the light shell.
  if (getStoredSurface() === SURFACE.STOCK) {
    document.body.classList.remove('dark');
    // Drop the dark-first boot background the server layout inlines on <body>
    // (vueapp.html.erb sets style="background-color:#111113" to avoid a white
    // flash for admins). On the operator surface that inline dark would sit
    // behind the light stock app (visible on overscroll), so clear it and let
    // the host light canvas show through.
    document.body.style.backgroundColor = '';
    root.setAttribute('data-surface', SURFACE.STOCK);
    root.setAttribute('data-theme', 'white');
    root.style.setProperty('color-scheme', 'light');
    return;
  }

  // Admin surface: unchanged Cinematic behavior (dark-first; explicit 'light'
  // opts into the paper variant). data-surface='algorythmo' is set explicitly so
  // switching back from an operator account in the same session clears 'stock'.
  root.setAttribute('data-surface', SURFACE.ALGORYTHMO);
  const selectedColorScheme =
    LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME) || 'auto';
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
