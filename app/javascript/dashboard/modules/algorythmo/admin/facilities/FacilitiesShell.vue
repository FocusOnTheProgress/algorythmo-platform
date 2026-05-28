<script setup>
// algorythmo: plan 0007 M2-g — Facilities sector on SectorShellV2 (D9).
// A new sector (no v1 to migrate): dense aggregated Overview (default tab) of
// consolidated facility spend + a single operational Controle tab (client-side
// units + expenses tables) + a full-width agent chat at the foot (D4).
//
// Per-sub-tab cut-flags (D10) gate Controle visibility here, not in the sidebar
// (it is a shell tab, not a sidebar entry). A cut ACTIVE (default OFF) hides the
// tab; the Overview tab is never cut (SectorShellV2 contract: tabs[0].id must be
// 'overview').
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMapGetter } from 'dashboard/composables/store';
import SectorShellV2 from '../sectors/SectorShellV2.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import FacilitiesOverviewPane from './FacilitiesOverviewPane.vue';
import FacilitiesControlePane from './FacilitiesControlePane.vue';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.HEADING';
const CHAT_HEADING_KEY =
  'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.AGENT_CHAT_HEADING';

const route = useRoute();
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

// Cut semantic (inverted): flag ON = sub-tab HIDDEN. Default OFF = visible.
// Fail-open for visibility (matches MarketingShell): a cut only hides when
// positively confirmed === true.
function isSubtabCut(subtabId) {
  try {
    const accountId = Number(route.params?.accountId);
    if (!accountId || !isFeatureEnabledonAccount.value) return false;
    return (
      isFeatureEnabledonAccount.value(
        accountId,
        `algorythmo_cut_sector_facilities_${subtabId}`
      ) === true
    );
  } catch {
    return false;
  }
}

const SUBTAB_DESCRIPTORS = [
  {
    id: 'controle',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.TAB',
  },
];

const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.OVERVIEW.TAB',
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
      <FacilitiesOverviewPane />
    </template>

    <template v-if="isVisible('controle')" #subtab-controle>
      <FacilitiesControlePane />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
