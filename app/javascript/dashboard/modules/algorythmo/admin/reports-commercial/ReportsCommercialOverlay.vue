<script setup>
// algorythmo: plan 0007 M2-c — Commercial route entry.
// Kept at this path because reports.routes.js loads `commercial_reports` from
// here; it now delegates to CommercialShell (SectorShellV2). The previous
// M6.1-c composition (SectorDashboard + 360px SectorAgentChat rail) is
// superseded by the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import CommercialShell from './CommercialShell.vue';
</script>

<template>
  <CommercialShell />
</template>
