<script setup>
// algorythmo: plan 0007 M2-f — Finance route entry.
// Kept at this path because routes.js loads `algorythmo_admin_financeiro` from
// here; it now delegates to FinanceShell (SectorShellV2). The previous M6.4
// composition (SectorDashboard + 360px SectorAgentChat rail) is superseded by
// the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import FinanceShell from './FinanceShell.vue';
</script>

<template>
  <FinanceShell />
</template>
