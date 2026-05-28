<script setup>
// algorythmo: M6.1-c — Reports Commercial overlay, full composition.
// Replaces the M6.1-b placeholder. Pattern: 1:1 copy of MarketingDashboard.vue
// convention (adversarial-accepted in M6.2-M6.6). Do NOT fork SectorDashboard.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import commercialMock from '../mocks/sectors/commercial';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="commercialMock" />
    <SectorAgentChat :sector-name-key="commercialMock.headingKey" />
  </main>
</template>

<style scoped lang="scss">
.alg-sector-layout {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
</style>
