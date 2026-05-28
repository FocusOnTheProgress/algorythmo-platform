<script setup>
// algorythmo: plan 0007 M2-d — Marketing route entry.
// Kept at this path because routes.js loads `algorythmo_admin_marketing` from
// here; it now delegates to MarketingShell (SectorShellV2). The previous M6.6
// composition (SectorDashboard + 360px SectorAgentChat rail) is superseded by
// the v2 shell (Overview + sub-tabs + full-width agent chat, D4).
import MarketingShell from './MarketingShell.vue';
</script>

<template>
  <MarketingShell />
</template>
