<script setup>
// algorythmo: M6.0 Operação — canonical sector dashboard (designer-locked).
// Wires the PR-6b skeleton + founder-locked mock into the existing /operacao
// route. The 6 derived sectors (M6.1-M6.6) follow this exact composition.
// Plan 0005 §M6.0.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import operacaoMock from '../mocks/sectors/operacao';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="operacaoMock" />
    <SectorAgentChat :sector-name-key="operacaoMock.headingKey" />
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
