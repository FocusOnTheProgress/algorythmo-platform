<script setup>
// algorythmo: B3 — sector shell routes that set `meta.algFullscreen` must
// fill the viewport without the max-w-5xl centred column that this wrapper
// normally applies.  The commercial_reports route (CommercialShell via
// SectorShellV2) is one such route: it manages its own padding/layout
// identically to every other sector shell.  Other legacy report routes
// continue to render inside the constrained column.
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const isFullscreen = computed(() => !!route.meta?.algFullscreen);
</script>

<template>
  <!-- Full-screen pass-through: sector shells manage their own layout -->
  <div v-if="isFullscreen" class="flex flex-col flex-1 h-full overflow-hidden">
    <router-view />
  </div>
  <!-- Legacy report pages: centred column with standard padding -->
  <div v-else class="overflow-auto bg-n-surface-1 w-full px-6">
    <div class="max-w-5xl mx-auto pb-12">
      <router-view />
    </div>
  </div>
</template>
