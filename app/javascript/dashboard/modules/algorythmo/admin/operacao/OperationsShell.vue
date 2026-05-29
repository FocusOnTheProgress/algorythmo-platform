<script setup>
// algorythmo: plan 0007 M2-e — Operations sector on SectorShellV2.
// Migrates the M6.0 canonical dashboard (SectorDashboard + 360px agent rail) to
// the v2 shell: dense aggregated Overview (default tab) + six PT sub-tabs
// (Estoque / Reposição / Logística / Organização / Entrega / Expedição, D1) + a
// full-width agent chat at the foot (D4). Unlike Commercial/Marketing, none of
// these sub-tabs deep-link into a live upstream route — all are mocked deep
// views.
//
// Per-sub-tab cut-flags (D10) gate tab visibility here, not in the sidebar:
// these are tabs inside the shell, not sidebar entries. A cut ACTIVE
// (default OFF) hides the tab; the Overview tab is never cut.
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import SectorShellV2 from '../sectors/SectorShellV2.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import OperationsOverviewPane from './OperationsOverviewPane.vue';
import OperationsSubtabPane from './OperationsSubtabPane.vue';
import subtabViews from '../mocks/sectors/operations-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.HEADING';
const CHAT_HEADING_KEY =
  'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.AGENT_CHAT_HEADING';

const viewById = Object.fromEntries(subtabViews.map(view => [view.id, view]));

const route = useRoute();
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

// Cut semantic (inverted): flag ON = sub-tab HIDDEN. Default OFF = visible.
// Fail-open for visibility: a cut only hides when positively confirmed === true.
function isSubtabCut(subtabId) {
  try {
    const accountId = Number(route.params?.accountId);
    if (!accountId || !isFeatureEnabledonAccount.value) return false;
    return (
      isFeatureEnabledonAccount.value(
        accountId,
        `algorythmo_cut_sector_operations_${subtabId}`
      ) === true
    );
  } catch {
    return false;
  }
}

const SUBTAB_DESCRIPTORS = [
  {
    id: 'estoque',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ESTOQUE_LABEL',
  },
  {
    id: 'reposicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.REPOSICAO_LABEL',
  },
  {
    id: 'logistica',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.LOGISTICA_LABEL',
  },
  {
    id: 'organizacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ORGANIZACAO_LABEL',
  },
  {
    id: 'entrega',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.ENTREGA_LABEL',
  },
  {
    id: 'expedicao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.EXPEDICAO_LABEL',
  },
];

// Overview is always first and never cut (SectorShellV2 contract: tabs[0].id
// must be 'overview'). Each operational sub-tab is appended only when its cut
// flag is not active.
const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.OPERATIONS.OVERVIEW.TAB',
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
    planet-class="alg-planet--operations"
  >
    <template #overview>
      <OperationsOverviewPane />
    </template>

    <template v-if="isVisible('estoque')" #subtab-estoque>
      <OperationsSubtabPane :view="viewById.estoque" />
    </template>

    <template v-if="isVisible('reposicao')" #subtab-reposicao>
      <OperationsSubtabPane :view="viewById.reposicao" />
    </template>

    <template v-if="isVisible('logistica')" #subtab-logistica>
      <OperationsSubtabPane :view="viewById.logistica" />
    </template>

    <template v-if="isVisible('organizacao')" #subtab-organizacao>
      <OperationsSubtabPane :view="viewById.organizacao" />
    </template>

    <template v-if="isVisible('entrega')" #subtab-entrega>
      <OperationsSubtabPane :view="viewById.entrega" />
    </template>

    <template v-if="isVisible('expedicao')" #subtab-expedicao>
      <OperationsSubtabPane :view="viewById.expedicao" />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
