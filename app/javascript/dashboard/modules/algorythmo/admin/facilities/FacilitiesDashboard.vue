<script setup>
// algorythmo: plan 0007 M2-g — Facilities route entry.
// New sector (no M5 placeholder Dashboard to migrate). The route
// `algorythmo_admin_facilities` loads this entry, which delegates to
// FacilitiesShell (SectorShellV2): Overview + Controle + full-width agent chat.
import FacilitiesShell from './FacilitiesShell.vue';
</script>

<template>
  <FacilitiesShell />
</template>
