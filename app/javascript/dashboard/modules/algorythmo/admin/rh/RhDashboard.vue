<script setup>
// algorythmo: plan 0007 M2-f — HR route entry.
// Kept at this path because routes.js loads `algorythmo_admin_rh` from here; it
// now delegates to HrShell (SectorShellV2). The previous M6.5 composition
// (SectorDashboard + 360px SectorAgentChat rail) is superseded by the v2 shell
// (Overview + sub-tabs + full-width agent chat, D4).
import HrShell from './HrShell.vue';
</script>

<template>
  <HrShell />
</template>
