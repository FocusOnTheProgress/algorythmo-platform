<script setup>
// algorythmo: plan 0007 M2-e — Operations route entry.
// Kept at this path because routes.js loads `algorythmo_admin_operacao` from
// here; it now delegates to OperationsShell (SectorShellV2). The previous M6.0
// composition (SectorDashboard + 360px SectorAgentChat rail) is superseded by
// the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import OperationsShell from './OperationsShell.vue';
</script>

<template>
  <OperationsShell />
</template>
