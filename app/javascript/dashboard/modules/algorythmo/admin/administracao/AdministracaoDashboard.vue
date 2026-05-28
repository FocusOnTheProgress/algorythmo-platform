<script setup>
// algorythmo: plan 0007 M2-e — Administration route entry.
// Kept at this path because routes.js loads `algorythmo_admin_administracao`
// from here; it now delegates to AdministrationShell (SectorShellV2). The
// previous M6.3 composition (SectorDashboard + 360px SectorAgentChat rail) is
// superseded by the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import AdministrationShell from './AdministrationShell.vue';
</script>

<template>
  <AdministrationShell />
</template>
