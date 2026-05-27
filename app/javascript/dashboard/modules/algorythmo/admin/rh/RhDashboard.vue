<script setup>
// algorythmo: M6.5 RH — derived sector dashboard. Same composition as M6.0
// canonical. Plan 0005 §M6.5.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import rhMock from '../mocks/sectors/rh';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="rhMock" />
    <SectorAgentChat :sector-name-key="rhMock.headingKey" />
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
