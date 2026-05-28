<script setup>
// algorythmo: M6.6 Marketing — derived sector dashboard. Same composition
// as M6.0 canonical. Plan 0005 §M6.6.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import marketingMock from '../mocks/sectors/marketing';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="marketingMock" />
    <SectorAgentChat :sector-name-key="marketingMock.headingKey" />
  </main>
</template>
