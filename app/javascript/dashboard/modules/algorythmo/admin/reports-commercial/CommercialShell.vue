<script setup>
// algorythmo: plan 0007 M2-c — Commercial sector on SectorShellV2.
// Migrates the M6.1-c overlay (SectorDashboard + 360px agent rail) to the v2
// shell: dense aggregated Overview (default tab) + legacy Chatwoot report
// sub-tabs (Operations / Conversation / Agents / Teams / SLA / CSAT) + a
// read-only Customer Support tab (D7) + a full-width agent chat at the foot
// (D4). Bot / Labels / Inbox are dropped from the sidebar via cut-flags (D10),
// not here — their routes stay live.
//
// Slots are enumerated explicitly (not a dynamic-slot v-for): the set is small,
// fixed, and far easier to read and review than computed slot names.
import SectorShellV2 from '../sectors/SectorShellV2.vue';
import SectorAgentChat from '../sectors/SectorAgentChat.vue';
import CommercialOverviewPane from './CommercialOverviewPane.vue';
import CommercialSubtabPane from './CommercialSubtabPane.vue';
import CustomerSupportPane from './CustomerSupportPane.vue';
import subtabViews from '../mocks/sectors/commercial-subtabs';

const TITLE_KEY = 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.HEADING';
const CHAT_HEADING_KEY =
  'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.AGENT_CHAT_HEADING';

const viewById = Object.fromEntries(subtabViews.map(view => [view.id, view]));

// Overview is always first (SectorShellV2 contract). The six legacy reports
// derive their tab descriptors from the shared deep-view mock so tab ids stay
// 1:1 with the panels; Customer Support closes the set.
const tabs = [
  {
    id: 'overview',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.OVERVIEW.TAB',
  },
  ...subtabViews.map(view => ({ id: view.id, labelKey: view.labelKey })),
  {
    id: 'customer_support',
    labelKey: 'ALGORYTHMO_ADMIN.SECTORS.COMMERCIAL.CUSTOMER_SUPPORT.TAB',
  },
];
</script>

<template>
  <SectorShellV2
    :title-key="TITLE_KEY"
    :chat-heading-key="CHAT_HEADING_KEY"
    :tabs="tabs"
  >
    <template #overview>
      <CommercialOverviewPane />
    </template>

    <template #subtab-operations>
      <CommercialSubtabPane :view="viewById.operations" />
    </template>

    <template #subtab-conversation>
      <CommercialSubtabPane :view="viewById.conversation" />
    </template>

    <template #subtab-agents>
      <CommercialSubtabPane :view="viewById.agents" />
    </template>

    <template #subtab-teams>
      <CommercialSubtabPane :view="viewById.teams" />
    </template>

    <template #subtab-sla>
      <CommercialSubtabPane :view="viewById.sla" />
    </template>

    <template #subtab-csat>
      <CommercialSubtabPane :view="viewById.csat" />
    </template>

    <template #subtab-customer_support>
      <CustomerSupportPane />
    </template>

    <template #agentChat>
      <SectorAgentChat :sector-name-key="TITLE_KEY" />
    </template>
  </SectorShellV2>
</template>
