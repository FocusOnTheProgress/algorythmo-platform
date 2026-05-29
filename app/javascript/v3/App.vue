<script>
import SnackbarContainer from './components/SnackBar/Container.vue';

export default {
  components: { SnackbarContainer },
  // algorythmo: rebrand-m0 — Cinematic OS is dark-first (DESIGN.md §1).
  // The v3 shell (login / onboarding / auth) opens dark by default instead of
  // following the OS color scheme. This is the surface the founder sees first,
  // so it must carry the command-room identity, never the light Chatwoot look.
  data() {
    return { theme: 'dark' };
  },
  mounted() {
    this.setColorTheme();
    this.setLocale(window.chatwootConfig.selectedLocale);
  },
  methods: {
    // algorythmo: rebrand-m0 — force dark; OS preference no longer downgrades
    // the auth shell to light. A light variant is an explicit opt-in (C7+).
    setColorTheme() {
      this.theme = 'dark';
      document.documentElement.classList.add('dark');
    },
    setLocale(locale) {
      if (locale) {
        this.$root.$i18n.locale = locale;
      }
    },
  },
};
</script>

<template>
  <div class="h-full min-h-screen w-full antialiased" :class="theme">
    <router-view />
    <SnackbarContainer />
  </div>
</template>

<style lang="scss">
@tailwind base;
@tailwind components;
@tailwind utilities;

@import '../dashboard/assets/scss/next-colors';

// algorythmo: design-system-import — Cinematic OS dark-first chrome overrides.
// The v3 auth/login shell has its own SCSS island (separate from _woot.scss),
// so the Algorythmo design system + chrome purge layer must be imported here
// too, otherwise the login page renders the bare Chatwoot light/blue theme.
@import '../../../engines/algorythmo/app/assets/stylesheets/algorythmo';

html,
body {
  // algorythmo: rebrand-m0 — Inter (host self-hosted) instead of the system
  // stack; kills any Lato / Open Sans fallback on the auth shell.
  font-family: var(--alg-font-sans);
  @apply h-full w-full;

  input,
  select {
    outline: none;
  }
}

// algorythmo: rebrand-m0 — links use the Cinematic brand cyan-teal, not the
// Chatwoot blue `n-brand`.
.text-link {
  color: var(--alg-color-brand-primary);
  @apply font-medium;

  &:hover {
    color: var(--alg-color-brand-primary-hover);
  }
}

.v-popper--theme-tooltip .v-popper__inner {
  background: black !important;
  font-size: 0.75rem;
  padding: 4px 8px !important;
  border-radius: 6px;
  font-weight: 400;
}

.v-popper--theme-tooltip .v-popper__arrow-container {
  display: none;
}
</style>
