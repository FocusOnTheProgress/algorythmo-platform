<script setup>
// algorythmo: Cinematic OS v2 — sector shell (plan 0007, M2-b).
// Single source of truth for the sector page pattern: dense data Overview
// (default tab) + operational sub-tabs + a full-width agent chat anchored at
// the page foot. Replaces the single-view SectorDashboard (now @deprecated).
//
// Three named slots feed the shell:
//   #overview     — the dense data central (responsive grid of anchors)
//   #subtab-<id>  — one slot per non-overview tab (deep view of that item)
//   #agentChat    — the agent conversation surface (SectorAgentChat or peer)
//
// The agent chat sits at the bottom in full width (NOT a 360px right rail —
// that was the M6.0 pattern). A jump-to-chat affordance in the header scrolls
// the chat into view. Tabs are native ARIA tabs with full keyboard support.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Icon from 'next/icon/Icon.vue';

const props = defineProps({
  // i18n key for the sector title shown in the header.
  titleKey: {
    type: String,
    required: true,
  },
  // i18n key for the agent chat heading. Resolves to
  // "Fale com o agente do setor {nome}" (D4).
  chatHeadingKey: {
    type: String,
    required: true,
  },
  // Ordered tab descriptors. `id` keys both the panel slot (`subtab-<id>`)
  // and the aria wiring; `labelKey` is an i18n key. The first tab is the
  // Overview and renders the `#overview` slot rather than a `#subtab-*` slot.
  tabs: {
    type: Array,
    required: true,
    validator: tabs =>
      Array.isArray(tabs) &&
      tabs.length > 0 &&
      tabs.every(
        tab => typeof tab.id === 'string' && typeof tab.labelKey === 'string'
      ),
  },
});

const { t } = useI18n();

const activeTabId = ref(props.tabs[0].id);
const isOverviewActive = computed(() => activeTabId.value === props.tabs[0].id);

const chatAnchor = ref(null);
// One ref per tab button so keyboard nav can move focus, not just selection.
const tabButtons = ref([]);

function tabId(id) {
  return `alg-sector-tab-${id}`;
}
function panelId(id) {
  return `alg-sector-panel-${id}`;
}

function selectTab(id) {
  activeTabId.value = id;
}

function focusTab(index) {
  const button = tabButtons.value[index];
  if (button) {
    button.focus();
    selectTab(props.tabs[index].id);
  }
}

// Roving keyboard model (WAI-ARIA tabs): arrows move and activate, Home/End
// jump to the ends. Selection follows focus so a screen reader announces the
// panel as the user arrows through.
function onTabKeydown(event, index) {
  const lastIndex = props.tabs.length - 1;
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      event.preventDefault();
      focusTab(index === lastIndex ? 0 : index + 1);
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      event.preventDefault();
      focusTab(index === 0 ? lastIndex : index - 1);
      break;
    case 'Home':
      event.preventDefault();
      focusTab(0);
      break;
    case 'End':
      event.preventDefault();
      focusTab(lastIndex);
      break;
    default:
      break;
  }
}

function jumpToChat() {
  chatAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <div class="alg-shell">
    <header class="alg-shell__header">
      <h1 class="alg-shell__title">{{ t(titleKey) }}</h1>
      <button
        type="button"
        class="alg-shell__jump"
        :aria-label="
          t('ALGORYTHMO_ADMIN.SECTORS.JUMP_TO_CHAT', { name: t(titleKey) })
        "
        @click="jumpToChat"
      >
        <Icon icon="i-lucide-arrow-down-circle" class="alg-shell__jump-icon" />
      </button>
    </header>

    <div
      class="alg-shell__tablist"
      role="tablist"
      :aria-label="
        t('ALGORYTHMO_ADMIN.SECTORS.TABLIST_ARIA', { name: t(titleKey) })
      "
    >
      <button
        v-for="(tab, index) in tabs"
        :id="tabId(tab.id)"
        :key="tab.id"
        ref="tabButtons"
        type="button"
        role="tab"
        class="alg-shell__tab"
        :class="{ 'alg-shell__tab--active': activeTabId === tab.id }"
        :aria-selected="activeTabId === tab.id"
        :aria-controls="panelId(tab.id)"
        :tabindex="activeTabId === tab.id ? 0 : -1"
        @click="selectTab(tab.id)"
        @keydown="onTabKeydown($event, index)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </div>

    <section
      v-show="isOverviewActive"
      :id="panelId(tabs[0].id)"
      class="alg-shell__panel"
      role="tabpanel"
      :aria-labelledby="tabId(tabs[0].id)"
      :tabindex="isOverviewActive ? 0 : -1"
    >
      <slot name="overview" />
    </section>

    <template v-for="tab in tabs.slice(1)" :key="tab.id">
      <section
        v-show="activeTabId === tab.id"
        :id="panelId(tab.id)"
        class="alg-shell__panel"
        role="tabpanel"
        :aria-labelledby="tabId(tab.id)"
        :tabindex="activeTabId === tab.id ? 0 : -1"
      >
        <slot :name="`subtab-${tab.id}`" />
      </section>
    </template>

    <section
      ref="chatAnchor"
      class="alg-shell__chat"
      :aria-label="t(chatHeadingKey)"
    >
      <h2 class="alg-shell__chat-heading">{{ t(chatHeadingKey) }}</h2>
      <slot name="agentChat" />
    </section>
  </div>
</template>
