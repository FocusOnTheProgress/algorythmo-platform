<script setup>
// algorythmo: Cinematic OS pattern — Sector Agent Chat trigger (DESIGN.md G5)
//
// Top-of-page affordance that smooth-scrolls to the sector's agent chat block
// at the bottom of the page. Carries the agent's Planet Avatar so the user
// recognises *who* they will talk to before they get there.
import AlgPlanetAvatar from './AlgPlanetAvatar.vue';
import {
  sectorAgentChatAnchorId,
  scrollToSectorAgentChat,
} from './sectorAgentChat';

const props = defineProps({
  sector: {
    type: String,
    required: true,
  },
  agentName: {
    type: String,
    default: 'Manu',
  },
  label: {
    type: String,
    default: 'Falar com o agente',
  },
});

function activate() {
  scrollToSectorAgentChat(props.sector);
}
</script>

<template>
  <button
    type="button"
    class="alg-btn alg-btn--secondary alg-sector-agent-chat-trigger"
    :aria-label="`${label} do setor ${sector}`"
    :aria-controls="sectorAgentChatAnchorId(sector)"
    @click="activate"
  >
    <AlgPlanetAvatar :name="agentName" size="sm" />
    <span>{{ label }}</span>
  </button>
</template>

<style lang="scss" scoped>
.alg-sector-agent-chat-trigger {
  gap: var(--alg-space-2);
}
</style>
