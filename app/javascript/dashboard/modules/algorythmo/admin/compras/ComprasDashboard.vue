<script setup>
// algorythmo: M6.2 Compras — derived sector dashboard. Same composition as
// the M6.0 canonical (SectorDashboard + SectorAgentChat). Plan 0005 §M6.2.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import comprasMock from '../mocks/sectors/compras';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="comprasMock" />
    <SectorAgentChat :sector-name-key="comprasMock.headingKey" />
  </main>
</template>
