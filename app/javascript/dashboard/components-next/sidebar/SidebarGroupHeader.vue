<script setup>
import { computed } from 'vue';
import { useMapGetter } from 'dashboard/composables/store.js';
import Icon from 'next/icon/Icon.vue';

const props = defineProps({
  to: { type: [Object, String], default: '' },
  label: { type: String, default: '' },
  icon: { type: [String, Object], default: '' },
  // algorythmo: M2-a — D6 chevron: name threads through to aria-controls
  name: { type: String, default: '' },
  expandable: { type: Boolean, default: false },
  isExpanded: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  hasActiveChild: { type: Boolean, default: false },
  getterKeys: { type: Object, default: () => ({}) },
});

const emit = defineEmits(['toggle']);

const showBadge = useMapGetter(props.getterKeys.badge);
const dynamicCount = useMapGetter(props.getterKeys.count);
const count = computed(() =>
  dynamicCount.value > 99 ? '99+' : dynamicCount.value
);
</script>

<template>
  <component
    :is="expandable ? 'button' : to ? 'router-link' : 'div'"
    class="flex items-center gap-2 px-1.5 py-1 rounded-xl h-8 min-w-0 w-full text-left"
    :type="expandable ? 'button' : undefined"
    draggable="false"
    :to="!expandable && to ? to : undefined"
    :title="label"
    :class="{
      // algorythmo: cinematic-os DELTA-0009 — active sidebar item = inverse-tab.
      // Fill: white (--alg-fg-primary). Text: near-black (--alg-black-1).
      // Radius: --alg-radius-md (12 px) — NOT pill (9999 px). Matches Ref 1.
      // Tailwind arbitrary-value syntax reaches the design-system tokens without
      // introducing a new CSS class or scoped style. shadow-sm adds elevation-1
      // to sell the lifted-object look against the dark canvas.
      '[background-color:var(--alg-fg-primary)] [color:var(--alg-black-1)] font-medium shadow-sm':
        isActive && !hasActiveChild,
      'text-n-slate-12 font-medium': hasActiveChild,
      'text-n-slate-11 hover:bg-n-alpha-2': !isActive && !hasActiveChild,
    }"
    :aria-expanded="expandable ? isExpanded : undefined"
    :aria-controls="expandable && name ? `sidebar-children-${name}` : undefined"
    @click.stop="emit('toggle')"
  >
    <div v-if="icon" class="relative flex items-center gap-2">
      <Icon v-if="icon" :icon="icon" class="size-4" />
      <span
        v-if="showBadge"
        class="size-2 -top-px ltr:-right-px rtl:-left-px bg-n-brand absolute rounded-full border border-n-solid-2"
      />
    </div>
    <div class="flex items-center gap-1.5 flex-grow min-w-0 flex-1">
      <span
        class="truncate"
        :class="{
          'text-body-main': !isActive,
          'font-medium text-sm': isActive || hasActiveChild,
        }"
      >
        {{ label }}
      </span>
      <span
        v-if="dynamicCount && !expandable"
        class="rounded-md capitalize text-xs leading-5 font-medium text-center outline outline-1 px-1 flex-shrink-0"
        :class="{
          'text-n-slate-12 outline-n-slate-6': isActive,
          'text-n-slate-11 outline-n-strong': !isActive,
        }"
      >
        {{ count }}
      </span>
    </div>
    <!-- algorythmo: M2-a — D6 chevron indicator: always visible when expandable.
         Rotates 180deg when expanded (down→up). Uses opacity swap under reduced-motion.
         Was previously `v-show="isExpanded"` which made it invisible when collapsed. -->
    <span
      v-if="expandable"
      class="i-lucide-chevron-down size-3 flex-shrink-0 transition-transform duration-200 motion-reduce:transition-none"
      :class="[isExpanded ? 'rotate-180' : 'rotate-0']"
      aria-hidden="true"
    />
  </component>
</template>
