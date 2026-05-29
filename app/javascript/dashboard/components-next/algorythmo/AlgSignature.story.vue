<script setup>
// algorythmo: Histoire showcase for the Cinematic OS signature components.
// Renders the orbs, planet avatars, glass primitives, and the sector agent
// chat so they can be screenshotted in the real app build (story:dev).
import AlgAuroraOrb from './AlgAuroraOrb.vue';
import AlgSunburstOrb from './AlgSunburstOrb.vue';
import AlgPlanetAvatar from './AlgPlanetAvatar.vue';
import AlgGlassCard from './AlgGlassCard.vue';
import AlgGlassTile from './AlgGlassTile.vue';
import AlgSectorAgentChat from './AlgSectorAgentChat.vue';
import AlgSectorAgentChatTrigger from './AlgSectorAgentChatTrigger.vue';

const agents = ['Manu', 'Cortex', 'Atlas', 'Vega', 'Nova', 'Orion'];
</script>

<template>
  <Story
    title="Algorythmo/Cinematic Signature"
    :layout="{ type: 'single', iframe: true }"
  >
    <Variant title="Aurora Orb">
      <div class="alg-stage alg-stage--centered">
        <AlgAuroraOrb :size="220" :conduits="6" />
      </div>
    </Variant>

    <Variant title="Aurora Orb — active (processing)">
      <div class="alg-stage alg-stage--centered">
        <AlgAuroraOrb :size="220" :conduits="4" active />
      </div>
    </Variant>

    <Variant title="Sunburst Orb">
      <div class="alg-stage alg-stage--centered">
        <AlgSunburstOrb :size="280" />
      </div>
    </Variant>

    <Variant title="Planet Avatars (deterministic per agent)">
      <div class="alg-stage alg-stage--row">
        <div v-for="name in agents" :key="name" class="alg-stage__planet">
          <AlgPlanetAvatar :name="name" size="lg" />
          <span class="alg-stage__caption">{{ name }}</span>
        </div>
      </div>
    </Variant>

    <Variant title="Glass primitives — card + KPI tiles">
      <div class="alg-stage">
        <div class="alg-stage__grid">
          <AlgGlassTile
            label="Receita do mês"
            value="R$ 482k"
            caption="+12% vs. anterior"
            tone="success"
          />
          <AlgGlassTile
            label="Leads em aberto"
            value="318"
            caption="−4% vs. anterior"
            tone="danger"
          />
          <AlgGlassTile
            label="Taxa de conversão"
            value="24%"
            caption="estável"
            tone="neutral"
          />
        </div>
        <AlgGlassCard tier="medium" class="alg-stage__card">
          <p class="alg-stage__prose">
            Glass card (medium tier) com grain, hairline e inset highlight.
          </p>
        </AlgGlassCard>
      </div>
    </Variant>

    <Variant title="Sector Agent Chat (bottom-of-page block + trigger)">
      <div class="alg-stage alg-density-operational">
        <AlgSectorAgentChatTrigger sector="Comercial" agent-name="Manu" />
        <AlgSectorAgentChat sector="Comercial" agent-name="Manu">
          <p class="alg-stage__prose">
            As mensagens da conversa entram aqui (slot do parent).
          </p>
        </AlgSectorAgentChat>
      </div>
    </Variant>
  </Story>
</template>

<style lang="scss" scoped>
.alg-stage {
  background: var(--alg-bg);
  min-height: 100%;
  padding: var(--alg-space-12);
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-8);
}

.alg-stage--centered {
  align-items: center;
  justify-content: center;
  min-height: 480px;
}

.alg-stage--row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--alg-space-8);
}

.alg-stage__planet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--alg-space-2);
}

.alg-stage__prose {
  margin: 0;
  color: var(--alg-fg-secondary);
}

.alg-stage__caption {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-stage__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--alg-space-4);
}

.alg-stage__card {
  max-width: 480px;
}
</style>
