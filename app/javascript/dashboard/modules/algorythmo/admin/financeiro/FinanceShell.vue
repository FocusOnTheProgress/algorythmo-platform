<script setup>
// algorythmo: plan 0007 M2-f — Finance sector on SectorShellV2.
// Migrates the M6.4 derived dashboard (SectorDashboard + 360px agent rail) to
// the v2 shell: dense aggregated Overview (default tab) + six PT sub-tabs
// (Contas a Pagar / Contas a Receber / Fluxo de Caixa / Margem / Lucro /
// Planejamento, D1) + a full-width agent chat at the foot (D4). The sub-tabs
// are mocked deep views — Finance has no live upstream report to compose.
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
import FinanceOverviewPane from './FinanceOverviewPane.vue';
import FinanceSubtabPane from './FinanceSubtabPane.vue';
import subtabViews from '../mocks/sectors/finance-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.HEADING';
const CHAT_HEADING_KEY = 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.AGENT_CHAT_HEADING';

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
        `algorythmo_cut_sector_finance_${subtabId}`
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
    id: 'a_pagar',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_PAGAR_LABEL',
  },
  {
    id: 'a_receber',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.A_RECEBER_LABEL',
  },
  {
    id: 'fluxo',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.FLUXO_LABEL',
  },
  {
    id: 'margem',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.MARGEM_LABEL',
  },
  {
    id: 'lucro',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.LUCRO_LABEL',
  },
  {
    id: 'planejamento',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.PLANEJAMENTO_LABEL',
  },
];

const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.FINANCE.OVERVIEW.TAB',
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
      <FinanceOverviewPane />
    </template>

    <template v-if="isVisible('a_pagar')" #subtab-a_pagar>
      <FinanceSubtabPane :view="viewById.a_pagar" />
    </template>

    <template v-if="isVisible('a_receber')" #subtab-a_receber>
      <FinanceSubtabPane :view="viewById.a_receber" />
    </template>

    <template v-if="isVisible('fluxo')" #subtab-fluxo>
      <FinanceSubtabPane :view="viewById.fluxo" />
    </template>

    <template v-if="isVisible('margem')" #subtab-margem>
      <FinanceSubtabPane :view="viewById.margem" />
    </template>

    <template v-if="isVisible('lucro')" #subtab-lucro>
      <FinanceSubtabPane :view="viewById.lucro" />
    </template>

    <template v-if="isVisible('planejamento')" #subtab-planejamento>
      <FinanceSubtabPane :view="viewById.planejamento" />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
