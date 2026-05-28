<script setup>
// algorythmo: M6.4 Financeiro — derived sector dashboard. Same composition
// as M6.0 canonical. Plan 0005 §M6.4.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import financeiroMock from '../mocks/sectors/financeiro';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="financeiroMock" />
    <SectorAgentChat :sector-name-key="financeiroMock.headingKey" />
  </main>
</template>
