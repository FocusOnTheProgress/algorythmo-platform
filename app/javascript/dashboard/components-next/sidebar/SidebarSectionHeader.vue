<script setup>
// algorythmo: M5 sidebar section header component
// Renders uppercase section labels between sidebar groups.
// Spec locked in plan 0005 §M5.3: 10px InterDisplay, weight 560,
// letter-spacing 0.08em, slate-9 @ 55% opacity, no divider line.
// Token precedent from BrainViewer.vue:395-402 (alg-brain-timeline__heading).
// Hidden when sidebar is collapsed (icons-only mode).
import { useSidebarContext } from './provider';

defineProps({
  label: {
    type: String,
    required: true,
  },
  isFirst: {
    type: Boolean,
    default: false,
  },
});

const { isCollapsed } = useSidebarContext();
</script>

<template>
  <li
    v-if="!isCollapsed"
    class="list-none min-w-0 px-3 pb-1.5 uppercase text-[10px] font-[560] tracking-[0.08em] font-interDisplay text-n-slate-9/55 select-none"
    :class="isFirst ? 'pt-2' : 'pt-4'"
    aria-hidden="true"
  >
    {{ label }}
  </li>
</template>
