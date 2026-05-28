<script setup>
// algorythmo: M6.3 Administração — derived sector dashboard. Same composition
// as M6.0 canonical. Plan 0005 §M6.3.
import SectorDashboard from '../sectors/SectorDashboard.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import administracaoMock from '../mocks/sectors/administracao';
</script>

<template>
  <main class="alg-sector-layout">
    <SectorDashboard :mock="administracaoMock" />
    <SectorAgentChat :sector-name-key="administracaoMock.headingKey" />
  </main>
</template>
