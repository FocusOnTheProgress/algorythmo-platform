<script setup>
// algorythmo: plan 0007 M2-e — Procurement sector on SectorShellV2.
// Migrates the M6.2 derived dashboard (SectorDashboard + 360px agent rail) to
// the v2 shell: dense aggregated Overview (default tab) + four PT sub-tabs
// (Fornecedores / Reposição / Custo de Mercadoria / Análise de Giro, D1) + a
// full-width agent chat at the foot (D4). All sub-tabs are mocked deep views —
// none deep-link into a live upstream route.
//
// Per-sub-tab cut-flags (D10) gate tab visibility here, not in the sidebar.
// A cut ACTIVE (default OFF) hides the tab; the Overview tab is never cut.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import SectorShellV2 from '../sectors/SectorShellV2.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import ProcurementOverviewPane from './ProcurementOverviewPane.vue';
import ProcurementSubtabPane from './ProcurementSubtabPane.vue';
import subtabViews from '../mocks/sectors/procurement-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.HEADING';
const CHAT_HEADING_KEY =
  'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.AGENT_CHAT_HEADING';

const viewById = Object.fromEntries(subtabViews.map(view => [view.id, view]));

const route = useRoute();
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

// Cut semantic (inverted): flag ON = sub-tab HIDDEN. Default OFF = visible.
function isSubtabCut(subtabId) {
  try {
    const accountId = Number(route.params?.accountId);
    if (!accountId || !isFeatureEnabledonAccount.value) return false;
    return (
      isFeatureEnabledonAccount.value(
        accountId,
        `algorythmo_cut_sector_procurement_${subtabId}`
      ) === true
    );
  } catch {
    return false;
  }
}

const SUBTAB_DESCRIPTORS = [
  {
    id: 'fornecedores',
    labelKey:
      'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.FORNECEDORES_LABEL',
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.REPOSICAO_LABEL',
  },
  {
    id: 'custo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.CUSTO_LABEL',
  },
  {
    id: 'giro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.GIRO_LABEL',
  },
];

// Overview is always first and never cut (SectorShellV2 contract: tabs[0].id
// must be 'overview'). Each operational sub-tab is appended only when its cut
// flag is not active.
const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.PROCUREMENT.OVERVIEW.TAB',
  },
  ...SUBTAB_DESCRIPTORS.filter(tab => !isSubtabCut(tab.id)),
]);

const isVisible = id => tabs.value.some(tab => tab.id === id);
</script>

<template>
  <SectorShellV2
    :title-key="TITLE_KEY"
    :chat-heading-key="CHAT_HEADING_KEY"
    :tabs="tabs"
  >
    <template #overview>
      <ProcurementOverviewPane />
    </template>

    <template v-if="isVisible('fornecedores')" #subtab-fornecedores>
      <ProcurementSubtabPane :view="viewById.fornecedores" />
    </template>

    <template v-if="isVisible('reposicao')" #subtab-reposicao>
      <ProcurementSubtabPane :view="viewById.reposicao" />
    </template>

    <template v-if="isVisible('custo')" #subtab-custo>
      <ProcurementSubtabPane :view="viewById.custo" />
    </template>

    <template v-if="isVisible('giro')" #subtab-giro>
      <ProcurementSubtabPane :view="viewById.giro" />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
