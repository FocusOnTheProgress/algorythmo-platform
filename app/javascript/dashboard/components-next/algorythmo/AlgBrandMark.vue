<script setup>
// algorythmo: Cinematic OS — inline brand mark (A1).
//
// ROOT CAUSE of "sidebar logo not rendering": the sidebar used next/icon/Logo,
// which renders ONLY when an account `logo_url` or the installation
// `logoThumbnail` is configured. In this environment neither is set, so Logo
// fell through to a neutral `i-lucide-image` placeholder glyph — the logo was
// "missing". The engine brand SVGs (engines/algorythmo/.../logo-mark.svg) live in
// the Rails asset pipeline and are not importable into the Vite dashboard bundle.
//
// Fix: the brand mark is inlined here as a self-contained SVG component, so the
// Algorythmo identity ALWAYS renders in chrome regardless of runtime config. It
// inherits currentColor (brand teal in chrome) and carries no gradient / AI tell.
// Geometry mirrors logo-mark.svg: a precise gauge ring interrupted by a single
// notch (the "signal"), with the operative centre dot (the "OS").
defineProps({
  // Accessible label; aria-hidden when used purely decoratively beside a name.
  label: {
    type: String,
    default: 'Algorythmo',
  },
  decorative: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <svg
    viewBox="0 0 32 32"
    fill="none"
    class="alg-brand-mark"
    :role="decorative ? undefined : 'img'"
    :aria-label="decorative ? undefined : label"
    :aria-hidden="decorative ? 'true' : undefined"
  >
    <title v-if="!decorative">{{ label }}</title>
    <!-- Gauge ring -->
    <circle
      cx="16"
      cy="16"
      r="13"
      fill="none"
      stroke="currentColor"
      stroke-width="2.25"
    />
    <!-- Notch: a wedge at ~1 o'clock breaking the circular symmetry. Painted in
         the canvas colour so it reads as a cut in the ring. -->
    <path
      d="M 24.66 8.5 L 28.8 4.6 L 23.3 5.4 Z"
      fill="var(--alg-bg, #18181b)"
    />
    <!-- Operative centre — the "OS" -->
    <circle cx="16" cy="16" r="3" fill="currentColor" />
  </svg>
</template>

<style lang="scss" scoped>
.alg-brand-mark {
  display: block;
  width: 100%;
  height: 100%;
  // Brand teal in chrome; falls back to currentColor where no brand var exists.
  color: var(--alg-color-brand-primary, currentColor);
}
</style>
