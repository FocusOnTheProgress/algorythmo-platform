<script setup>
// algorythmo: Cinematic OS v3 — sector shell (plan 0009, RODADA 3, F-B).
// Single source of truth for the sector page pattern. The sector's specialist
// agent is no longer a footer afterthought: it is a SOLID HERO band at the TOP
// of every sector — the orchestrator that speaks for the sector. Below it sits
// the dense data Overview (default tab) + operational sub-tabs.
//
// Layout (top → bottom):
//   1. <header>           — sector title
//   2. HERO (in-flow)     — Aurora-bordered agent band: planet identity +
//                           heading + typed opening line + composer. Solid
//                           (opaque elevated bg), never floating glass. It is
//                           IN-FLOW (not sticky) so it never covers the data
//                           grid as the page scrolls (Brief v3, Stream C #1).
//   3. ARIA tablist       — Overview + operational sub-tabs
//   4. tab panels         — the dense data central + deep sub-views
//
// Three named slots feed the shell:
//   #overview     — the dense data central (responsive grid of anchors)
//   #subtab-<id>  — one slot per non-overview tab (deep view of that item)
//   #agentChat    — the agent conversation surface (SectorAgentChat or peer),
//                   rendered INSIDE the hero band under the heading
//
// The hero is a SANCTIONED Aurora signature surface (the intelligence speaks
// here): AlgAuroraBorder frames it, AlgPlanetAvatar gives it a per-sector
// identity, AlgTypewriter (inside SectorAgentChat) voices its opening line.
// No AlgAuroraOrb here — the orb belongs to Brain (max one per screen).
//
// Tabs are native ARIA tabs with full keyboard support.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  AlgAuroraBorder,
  AlgPlanetAvatar,
} from 'dashboard/components-next/algorythmo';

const props = defineProps({
  // i18n key for the sector title shown in the header.
  titleKey: {
    type: String,
    required: true,
  },
  // i18n key for the agent chat heading. Resolves to
  // "Fale com o agente do setor {nome}" (D4) and labels the hero band.
  chatHeadingKey: {
    type: String,
    required: true,
  },
  // Per-sector planet seed for the hero agent avatar (AlgPlanetAvatar). The
  // legacy CSS-class form (e.g. 'alg-planet--operations') is accepted and used
  // verbatim as a deterministic seed, so each sector keeps a stable, distinct
  // planet across sessions. If omitted the hero renders without a planet.
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

// algorythmo: per-sector accent (founder decision 2026-05-31). Derive the sector
// slug from the planet-class ('alg-planet--commercial' → 'commercial') and expose
// it as a root class `alg-shell--<sector>`, which sets `--alg-sector-hue` (see
// engines/.../\_components.scss → SECTOR ACCENTS). That hue tints the Aurora beam
// for this sector and is available to descendants via var(--alg-sector-hue) for
// the sector-coloured figures (.alg-sector-ink). One hue per sector, no repeats.
const sectorClass = computed(() => {
  const slug = props.planetClass?.replace('alg-planet--', '').trim();
  return slug ? `alg-shell--${slug}` : null;
});

const activeTabId = ref(props.tabs[0].id);
const isOverviewActive = computed(() => activeTabId.value === props.tabs[0].id);

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
</script>

<template>
  <div class="alg-shell" :class="sectorClass">
    <header class="alg-shell__header">
      <h1 class="alg-shell__title">{{ t(titleKey) }}</h1>
    </header>

    <!-- HERO: the sector's specialist orchestrator. In-flow + opaque so it
         scrolls away with the page and never covers the data grid below.
         Aurora Border marks it as a sanctioned surface where the intelligence
         speaks. -->
    <AlgAuroraBorder
      as="section"
      class="alg-shell__chat"
      radius="var(--alg-radius-2xl)"
      thickness="2px"
      intensity="normal"
      glow
      elevation="var(--alg-elevation-2)"
      aria-labelledby="alg-shell-chat-heading"
    >
      <div class="alg-shell__hero">
        <AlgPlanetAvatar
          v-if="planetClass"
          class="alg-shell__hero-planet"
          :seed="planetClass"
          :name="t(titleKey)"
          size="lg"
          aria-hidden="true"
        />
        <div class="alg-shell__hero-body">
          <h2 id="alg-shell-chat-heading" class="alg-shell__chat-heading">
            {{ t(chatHeadingKey) }}
          </h2>
          <slot name="agentChat" />
        </div>
      </div>
    </AlgAuroraBorder>

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
  </div>
</template>
