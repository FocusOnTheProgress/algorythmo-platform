<script setup>
// algorythmo: plan 0007 M2-e — Procurement route entry.
// Kept at this path because routes.js loads `algorythmo_admin_compras` from
// here; it now delegates to ProcurementShell (SectorShellV2). The previous M6.2
// composition (SectorDashboard + 360px SectorAgentChat rail) is superseded by
// the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import ProcurementShell from './ProcurementShell.vue';
</script>

<template>
  <ProcurementShell />
</template>
