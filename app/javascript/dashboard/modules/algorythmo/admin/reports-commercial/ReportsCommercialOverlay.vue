<script setup>
// algorythmo: M6.1-c — Reports Commercial overlay, full composition.
// Cinematic OS v1 is forward-only. Reverting the visual register requires
// deploying a revert branch — there is no runtime toggle.
// Pattern: 1:1 copy of MarketingDashboard.vue convention (adversarial-accepted
// in M6.2-M6.6). Do NOT fork SectorDashboard.
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
