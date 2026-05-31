<script setup>
// algorythmo: Cinematic OS — Theme control (Stream E, plan 0011).
//
// A segmented control to switch the OS register: Claro (paper) / Escuro (command
// room) / Auto. Lives in the account branding settings, next to the logo + name,
// where the founder expects it. It owns its own persistence — mirroring
// useAppearanceHotKeys — writing LOCAL_STORAGE_KEYS.COLOR_SCHEME and calling the
// shared setColorTheme() so BOTH the host Chatwoot `.dark` class AND the
// Algorythmo `data-theme` paper tokens flip from one switch.
//
// Design notes:
//   - NO glass on the control. A settings form control needs crisp legibility;
//     glass here would muddy the segment labels. Solid token-backed surface.
//   - Monochrome Lucide glyphs (no coloured icons — Cinematic OS doctrine).
//   - The active segment uses a sliding "thumb" with the cinematic spring curve.
//     The thumb position animates via transform; prefers-reduced-motion collapses
//     the transition (global kill-switch) so it snaps instead of sliding.
//   - Applies on mount: reads the stored choice so the visible selection matches
//     the live theme even on first paint.
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { LocalStorage } from 'shared/helpers/localStorage';
import { LOCAL_STORAGE_KEYS } from 'dashboard/constants/localStorage';
import { setColorTheme } from 'dashboard/helper/themeHelper.js';

const { t } = useI18n();

const OPTIONS = [
  { key: 'light', icon: 'i-lucide-sun' },
  { key: 'dark', icon: 'i-lucide-moon' },
  { key: 'auto', icon: 'i-lucide-monitor' },
];

const selected = ref('auto');

const applyTheme = scheme => {
  LocalStorage.set(LOCAL_STORAGE_KEYS.COLOR_SCHEME, scheme);
  setColorTheme();
};

const select = scheme => {
  if (selected.value === scheme) return;
  selected.value = scheme;
  applyTheme(scheme);
};

// Thumb offset — 0/1/2 maps to the active segment so the slider lands under it.
const activeIndex = computed(() =>
  Math.max(
    0,
    OPTIONS.findIndex(o => o.key === selected.value)
  )
);

onMounted(() => {
  const stored = LocalStorage.get(LOCAL_STORAGE_KEYS.COLOR_SCHEME);
  selected.value = OPTIONS.some(o => o.key === stored) ? stored : 'auto';
});
</script>

<template>
  <div
    class="alg-theme-control"
    role="radiogroup"
    :aria-label="t('GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.LABEL')"
  >
    <span
      class="alg-theme-control__thumb"
      :style="{ transform: `translateX(${activeIndex * 100}%)` }"
      aria-hidden="true"
    />
    <button
      v-for="option in OPTIONS"
      :key="option.key"
      type="button"
      role="radio"
      :aria-checked="selected === option.key"
      class="alg-theme-control__segment"
      :class="{
        'alg-theme-control__segment--active': selected === option.key,
      }"
      @click="select(option.key)"
    >
      <span :class="option.icon" class="alg-theme-control__icon" />
      <span class="alg-theme-control__text">
        {{
          t(`GENERAL_SETTINGS.FORM.APPEARANCE_SECTION.OPTIONS.${option.key}`)
        }}
      </span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.alg-theme-control {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  width: 100%;
  max-width: 360px;
  padding: var(--alg-space-1);
  background: var(--alg-bg-raised);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-md);
  box-shadow: var(--alg-elevation-1);
}

// Sliding thumb under the active segment. One column wide; translated by
// activeIndex * 100%. Spring curve for the slide; the global reduced-motion
// kill-switch collapses it to an instant snap.
.alg-theme-control__thumb {
  position: absolute;
  top: var(--alg-space-1);
  left: var(--alg-space-1);
  width: calc((100% - var(--alg-space-2)) / 3);
  height: calc(100% - var(--alg-space-2));
  border-radius: calc(var(--alg-radius-md) - 3px);
  background: var(--alg-bg-elevated);
  border: 1px solid var(--alg-border-strong);
  box-shadow: var(--alg-elevation-2);
  transition: transform var(--alg-duration-base) var(--alg-ease-spring);
  pointer-events: none;
}

.alg-theme-control__segment {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-2);
  min-height: 36px;
  padding: var(--alg-space-2) var(--alg-space-3);
  border: 0;
  background: transparent;
  border-radius: calc(var(--alg-radius-md) - 3px);
  cursor: pointer;
  font-family: var(--alg-font-sans);
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-tertiary);
  transition: color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    color: var(--alg-fg-secondary);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--alg-ring-focus);
  }
}

.alg-theme-control__segment--active {
  color: var(--alg-fg-primary);
}

.alg-theme-control__icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  color: currentColor;
}

.alg-theme-control__text {
  white-space: nowrap;
}

// Below ~420px the labels would crowd; keep the glyphs, hide the text.
@media (max-width: 420px) {
  .alg-theme-control__text {
    display: none;
  }
}
</style>
