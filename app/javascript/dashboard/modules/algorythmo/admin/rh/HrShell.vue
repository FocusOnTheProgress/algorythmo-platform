<script setup>
// algorythmo: plan 0007 M2-f — HR sector on SectorShellV2.
// Migrates the M6.5 derived dashboard (SectorDashboard + 360px agent rail) to
// the v2 shell: dense aggregated Overview (default tab) + four PT sub-tabs
// (Contratação / Treinamento / Cultura / Produtividade, D1) + a full-width
// agent chat at the foot (D4). The sub-tabs are mocked deep views — HR has no
// live upstream report to compose.
//
// Per-sub-tab cut-flags (D10) gate tab visibility here, not in the sidebar:
// these sub-tabs are tabs inside the shell, not sidebar entries. A cut ACTIVE
// (default OFF) hides the tab; the Overview tab is never cut. Slots are
// enumerated explicitly (small, fixed set — easier to read and review than
// computed slot names).
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import SectorShellV2 from '../sectors/SectorShellV2.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import HrOverviewPane from './HrOverviewPane.vue';
import HrSubtabPane from './HrSubtabPane.vue';
import subtabViews from '../mocks/sectors/hr-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.HR.HEADING';
const CHAT_HEADING_KEY = 'ALGORYTHMO_ADMIN.SECTORS.HR.AGENT_CHAT_HEADING';

const viewById = Object.fromEntries(subtabViews.map(view => [view.id, view]));

const route = useRoute();
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

// Cut semantic (inverted): flag ON = sub-tab HIDDEN. Default OFF = visible.
// Fail-open for visibility is the established sidebar behavior: a cut only
// hides when positively confirmed === true.
function isSubtabCut(subtabId) {
  try {
    const accountId = Number(route.params?.accountId);
    if (!accountId || !isFeatureEnabledonAccount.value) return false;
    return (
      isFeatureEnabledonAccount.value(
        accountId,
        `algorythmo_cut_sector_hr_${subtabId}`
      ) === true
    );
  } catch {
    return false;
  }
}

// Overview is always first and never cut (SectorShellV2 contract: tabs[0].id
// must be 'overview'). Each operational sub-tab is appended only when its cut
// flag is not active.
const SUBTAB_DESCRIPTORS = [
  {
    id: 'contratacao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CONTRATACAO_LABEL',
  },
  {
    id: 'treinamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TREINAMENTO_LABEL',
  },
  {
    id: 'cultura',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.CULTURA_LABEL',
  },
  {
    id: 'produtividade',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.PRODUTIVIDADE_LABEL',
  },
];

const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.HR.OVERVIEW.TAB',
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
    planet-class="alg-planet--hr"
  >
    <template #overview>
      <HrOverviewPane />
    </template>

    <template v-if="isVisible('contratacao')" #subtab-contratacao>
      <HrSubtabPane :view="viewById.contratacao" />
    </template>

    <template v-if="isVisible('treinamento')" #subtab-treinamento>
      <HrSubtabPane :view="viewById.treinamento" />
    </template>

    <template v-if="isVisible('cultura')" #subtab-cultura>
      <HrSubtabPane :view="viewById.cultura" />
    </template>

    <template v-if="isVisible('produtividade')" #subtab-produtividade>
      <HrSubtabPane :view="viewById.produtividade" />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
