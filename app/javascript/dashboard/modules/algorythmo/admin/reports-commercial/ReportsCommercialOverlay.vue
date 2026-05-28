<script setup>
// algorythmo: M6.1-c — Reports Commercial overlay, full composition.
// Cinematic OS v1 — applies the new design system. The `data-alg-cinematic`
// attribute on the layout root signals to the design system which visual
// register is active. v1 = Cinematic (default, LIGADO). Setting v0 reverts
// the subtree to the previous visual without a deploy.
// Pattern: 1:1 copy of MarketingDashboard.vue convention (adversarial-accepted
// in M6.2-M6.6). Do NOT fork SectorDashboard.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import commercialMock from '../mocks/sectors/commercial';
</script>

<template>
  <main class="alg-sector-layout" data-alg-cinematic="v1">
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
