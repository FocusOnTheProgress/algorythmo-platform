<script setup>
// algorythmo: plan 0007 M2-d — Marketing sector on SectorShellV2.
// Migrates the M6.6 derived dashboard (SectorDashboard + 360px agent rail) to
// the v2 shell: dense aggregated Overview (default tab) + six PT sub-tabs
// (Branding / Campanhas / Redes Sociais / Tráfego / CRM / Retenção, D1) + a
// full-width agent chat at the foot (D4). Campanhas absorbs the former
// top-level Campaigns surface by linking its live routes (D8); the other five
// sub-tabs are mocked deep views.
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
import MarketingOverviewPane from './MarketingOverviewPane.vue';
import MarketingSubtabPane from './MarketingSubtabPane.vue';
import MarketingCampaignsPane from './MarketingCampaignsPane.vue';
import subtabViews from '../mocks/sectors/marketing-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.HEADING';
const CHAT_HEADING_KEY =
  'ALGORYTHMO_ADMIN.SECTORS.MARKETING.AGENT_CHAT_HEADING';

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
        `algorythmo_cut_sector_marketing_${subtabId}`
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
    id: 'branding',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.BRANDING_LABEL',
  },
  {
    id: 'campanhas',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.CAMPANHAS.TAB',
  },
  {
    id: 'redes_sociais',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.REDES_SOCIAIS_LABEL',
  },
  {
    id: 'trafego',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TRAFEGO_LABEL',
  },
  {
    id: 'crm',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.CRM_LABEL',
  },
  {
    id: 'retencao',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.RETENCAO_LABEL',
  },
];

const tabs = computed(() => [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.MARKETING.OVERVIEW.TAB',
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
      <MarketingOverviewPane />
    </template>

    <template v-if="isVisible('branding')" #subtab-branding>
      <MarketingSubtabPane :view="viewById.branding" />
    </template>

    <template v-if="isVisible('campanhas')" #subtab-campanhas>
      <MarketingCampaignsPane />
    </template>

    <template v-if="isVisible('redes_sociais')" #subtab-redes_sociais>
      <MarketingSubtabPane :view="viewById.redes_sociais" />
    </template>

    <template v-if="isVisible('trafego')" #subtab-trafego>
      <MarketingSubtabPane :view="viewById.trafego" />
    </template>

    <template v-if="isVisible('crm')" #subtab-crm>
      <MarketingSubtabPane :view="viewById.crm" />
    </template>

    <template v-if="isVisible('retencao')" #subtab-retencao>
      <MarketingSubtabPane :view="viewById.retencao" />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
