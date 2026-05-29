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
  // CSS modifier class on .alg-planet for the sector agent avatar in the
  // jump-to-chat button (e.g. 'alg-planet--operations'). If omitted the
  // button renders without a planet avatar.
  planetClass: {
    type: String,
    default: null,
  },
  // Ordered tab descriptors. `id` keys both the panel slot (`subtab-<id>`)
  // and the aria wiring; `labelKey` is an i18n key.
  //
  // CONTRACT (enforced by the validator below — fail-fast in dev):
  //   1. tabs[0].id MUST be 'overview'. The first tab always renders the
  //      #overview slot; any other id produces a silent blank panel for
  //      every sector page that uses this shell.
  //   2. All ids MUST be unique — duplicate ids produce ambiguous
  //      aria-controls/aria-labelledby and an axe-core critical violation.
  //
  // DOM ids (`alg-sector-tab-*` / `alg-sector-panel-*`) are route-scoped:
  // only one SectorShellV2 is mounted at a time, so they are unique in the
  // live document even though they are not globally namespaced by sector.
  tabs: {
    type: Array,
    required: true,
    validator: tabs => {
      if (!Array.isArray(tabs) || tabs.length === 0) return false;
      if (tabs[0].id !== 'overview') return false;
      if (new Set(tabs.map(t => t.id)).size !== tabs.length) return false;
      return tabs.every(
        tab => typeof tab.id === 'string' && typeof tab.labelKey === 'string'
      );
    },
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
  // Respect prefers-reduced-motion for the programmatic scroll — the CSS
  // transitions are already gated, but scrollIntoView behavior is JS-only.
  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  chatAnchor.value?.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  });
}
</script>

<template>
  <div class="alg-shell">
    <header class="alg-shell__header">
      <h1 class="alg-shell__title">{{ t(titleKey) }}</h1>
      <button
        type="button"
        class="alg-agent-anchor"
        :aria-label="
          t('ALGORYTHMO_ADMIN.SECTORS.JUMP_TO_CHAT', { name: t(titleKey) })
        "
        @click="jumpToChat"
      >
        <span
          v-if="planetClass"
          class="alg-planet alg-planet--sm"
          :class="planetClass"
          aria-hidden="true"
        />
        <span class="alg-agent-anchor__label">{{
          t('ALGORYTHMO_ADMIN.SECTORS.AGENT_CTA')
        }}</span>
        <svg
          class="alg-agent-anchor__arrow"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
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
