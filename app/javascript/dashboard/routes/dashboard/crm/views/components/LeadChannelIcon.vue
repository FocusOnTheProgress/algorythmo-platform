<script setup>
// algorythmo: feature-gate algorythmo_crm
//
// Renders a channel / research-source glyph from an ALLOWLISTED name — never
// from raw markup. Adversarial review #111: the lead-intelligence panel is
// explicitly designed to be filled by a future agent scraping LinkedIn /
// Instagram / web, and `v-html="agentSuppliedSvg"` there is a latent XSS
// landmine. This component takes a `source` STRING, normalises it, and looks up
// a frozen dictionary of SVG primitives that it draws with real Vue elements
// (`<path :d>`, `<circle>`, `<rect>`). An unknown/agent-supplied source can only
// ever resolve to the generic glyph — it can never inject markup.
import { computed } from 'vue';

const props = defineProps({
  // Channel or research source: whatsapp / email / instagram / tiktok /
  // linkedin / facebook / web / … Unknown values render the generic glyph.
  source: { type: String, default: '' },
  size: { type: [Number, String], default: 13 },
});

// SVG primitives per source, expressed as plain data (not markup). Each entry is
// an array of { tag, attrs } drawn as real elements — XSS-proof by construction.
const ICONS = Object.freeze({
  whatsapp: [
    {
      tag: 'path',
      attrs: {
        d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
      },
    },
  ],
  email: [
    { tag: 'rect', attrs: { x: 2, y: 4, width: 20, height: 16, rx: 2 } },
    { tag: 'path', attrs: { d: 'm2 7 10 6 10-6' } },
  ],
  instagram: [
    { tag: 'rect', attrs: { x: 2, y: 2, width: 20, height: 20, rx: 5 } },
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 4 } },
    { tag: 'circle', attrs: { cx: 17.5, cy: 6.5, r: 1 } },
  ],
  tiktok: [
    { tag: 'path', attrs: { d: 'M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5' } },
  ],
  linkedin: [
    {
      tag: 'path',
      attrs: {
        d: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z',
      },
    },
    { tag: 'rect', attrs: { x: 2, y: 9, width: 4, height: 12 } },
    { tag: 'circle', attrs: { cx: 4, cy: 4, r: 2 } },
  ],
  facebook: [
    {
      tag: 'path',
      attrs: {
        d: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
      },
    },
  ],
  web: [
    { tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: 'path', attrs: { d: 'M2 12h20' } },
    {
      tag: 'path',
      attrs: {
        d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
      },
    },
  ],
  generic: [
    { tag: 'path', attrs: { d: 'M22 12h-6l-2 3h-4l-2-3H2' } },
    {
      tag: 'path',
      attrs: {
        d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
      },
    },
  ],
});

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^channel::/, '')
    .replace(/[-\s]/g, '');
}

const primitives = computed(
  () => ICONS[normalize(props.source)] ?? ICONS.generic
);
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-for="(p, i) in primitives" :key="i">
      <path v-if="p.tag === 'path'" :d="p.attrs.d" />
      <circle
        v-else-if="p.tag === 'circle'"
        :cx="p.attrs.cx"
        :cy="p.attrs.cy"
        :r="p.attrs.r"
      />
      <rect
        v-else-if="p.tag === 'rect'"
        :x="p.attrs.x"
        :y="p.attrs.y"
        :width="p.attrs.width"
        :height="p.attrs.height"
        :rx="p.attrs.rx"
      />
    </template>
  </svg>
</template>
