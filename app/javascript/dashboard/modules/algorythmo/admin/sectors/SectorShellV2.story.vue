<script setup>
// algorythmo: plan 0007 M2-b — SectorShellV2 isolated demo (histoire).
// Shows the shell with a dense Overview grid, two operational sub-tabs, and a
// full-width agent chat anchored at the foot. Keys render verbatim under the
// dashboard (en) i18n bundle — this is a structural demo, not a translation
// preview.
import SectorShellV2 from './SectorShellV2.vue';

const tabs = [
  { id: 'overview', labelKey: 'Overview' },
  { id: 'estoque', labelKey: 'Estoque' },
  { id: 'logistica', labelKey: 'Logística' },
];

const overviewCards = [
  { label: 'Estoque atual', value: 'R$ 487.300', delta: '▲ +4,1%' },
  { label: 'Giro médio', value: '42 dias', delta: '▼ 3 dias' },
  { label: 'SKUs ativos', value: '1.247', delta: '▲ 12' },
  { label: 'Ruptura', value: '3,8%', delta: '▼ 0,4pp' },
];
</script>

<template>
  <Story
    title="Algorythmo/SectorShellV2"
    :layout="{ type: 'single', iframe: true }"
  >
    <Variant title="Operações — Overview + sub-tabs + agent chat">
      <SectorShellV2
        title-key="Operações"
        chat-heading-key="Fale com o agente do setor Operações"
        :tabs="tabs"
      >
        <template #overview>
          <div class="demo-grid">
            <article
              v-for="card in overviewCards"
              :key="card.label"
              class="alg-card demo-card"
            >
              <span class="demo-card__value">{{ card.value }}</span>
              <span class="demo-card__label">{{ card.label }}</span>
              <span class="demo-card__delta">{{ card.delta }}</span>
            </article>
          </div>
        </template>

        <template #subtab-estoque>
          <p class="demo-prose">
            Visão aprofundada de Estoque — tabelas e séries por SKU.
          </p>
        </template>

        <template #subtab-logistica>
          <p class="demo-prose">
            Visão aprofundada de Logística — rotas, prazos e custo de frete.
          </p>
        </template>

        <template #agentChat>
          <div class="alg-card alg-card--glass demo-chat">
            O agente do setor opera com dados reais da empresa em breve.
          </div>
        </template>
      </SectorShellV2>
    </Variant>
  </Story>
</template>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: var(--alg-border);
  border: 1px solid var(--alg-border);
}

.demo-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--alg-bg);
  padding: 24px;
}

.demo-card__value {
  font-family: var(--alg-font-display);
  font-size: 28px;
  color: var(--alg-fg-primary);
}

.demo-card__label {
  font-family: var(--alg-font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--alg-fg-tertiary);
}

.demo-card__delta {
  font-size: 12px;
  color: var(--alg-fg-secondary);
}

.demo-prose {
  color: var(--alg-fg-secondary);
}

.demo-chat {
  padding: 24px;
  color: var(--alg-fg-secondary);
}
</style>
