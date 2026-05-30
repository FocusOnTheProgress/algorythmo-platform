<script setup>
import { h, ref, computed, onMounted, watch } from 'vue';
import { provideSidebarContext, useSidebarResize } from './provider';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useMapGetter } from 'dashboard/composables/store';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { useSidebarKeyboardShortcuts } from './useSidebarKeyboardShortcuts';
import { vOnClickOutside } from '@vueuse/components';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';
import { ALGORYTHMO_CUT_FLAG_NAMES } from 'dashboard/constants/algorythmoCutFlags';
import { useWindowSize, useEventListener } from '@vueuse/core';

import SidebarGroup from './SidebarGroup.vue';
// algorythmo: M5 sidebar restructure — section header component
import SidebarSectionHeader from './SidebarSectionHeader.vue';
import SidebarProfileMenu from './SidebarProfileMenu.vue';
import SidebarChangelogCard from './SidebarChangelogCard.vue';
import SidebarChangelogButton from './SidebarChangelogButton.vue';
import ChannelLeaf from './ChannelLeaf.vue';
import ChannelIcon from 'next/icon/ChannelIcon.vue';
import SidebarAccountSwitcher from './SidebarAccountSwitcher.vue';
// algorythmo: A1 — use the always-rendering inline brand mark instead of
// next/icon/Logo (which silently fell back to an i-lucide-image placeholder when
// no account/installation logo was configured). A2 — the ComposeConversation
// (pencil) trigger is removed from the sidebar chrome entirely.
import AlgBrandMark from 'dashboard/components-next/algorythmo/AlgBrandMark.vue';

const props = defineProps({
  isMobileSidebarOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits([
  'closeKeyShortcutModal',
  'openKeyShortcutModal',
  'showCreateAccountModal',
  'closeMobileSidebar',
]);

const { accountScopedRoute, isOnChatwootCloud } = useAccount();
// algorythmo: M5 — gate Admin OS section headers so agents don't see orphans
const { isAdmin } = useAdmin();
const store = useStore();
const { t } = useI18n();

const isACustomBrandedInstance = useMapGetter(
  'globalConfig/isACustomBrandedInstance'
);
const isRTL = useMapGetter('accounts/isRTL');

const { width: windowWidth } = useWindowSize();
const isMobile = computed(() => windowWidth.value < 768);

const accountId = useMapGetter('getCurrentAccountId');
const isFeatureEnabledonAccount = useMapGetter(
  'accounts/isFeatureEnabledonAccount'
);

const hasAdvancedAssignment = computed(() => {
  return isFeatureEnabledonAccount.value(
    accountId.value,
    FEATURE_FLAGS.ADVANCED_ASSIGNMENT
  );
});

// algorythmo: feature-gate algorythmo_show_captain
// Captain sidebar section is hidden unless this flag is explicitly enabled.
// Default in config/features.yml: algorythmo_show_captain: false.
const hasCaptain = computed(() => {
  return isFeatureEnabledonAccount.value(
    accountId.value,
    FEATURE_FLAGS.ALGORYTHMO_SHOW_CAPTAIN
  );
});

// algorythmo: feature-gate algorythmo_crm
// CRM sidebar entry + /crm route are hidden until algorythmo_crm flips on.
// The route itself stays registered so deep-links keep resolving once enabled.
const hasAlgorythmoCrm = computed(() => {
  return isFeatureEnabledonAccount.value(
    accountId.value,
    FEATURE_FLAGS.ALGORYTHMO_CRM
  );
});

// algorythmo: feature-gate algorythmo_cut_*
// Cut flags use inverted semantic: when enabled, the surface is HIDDEN.
// All cut flags default false → upstream surfaces remain visible until a
// super-admin enables the cut for a specific tenant via the Algorythmo flags UI.
// Current count: 28 flags (see algorythmoCutFlags.js + feature_flag_bits.rb).
// The set of cut flag names lives in `constants/algorythmoCutFlags.js` and is
// mirrored from `Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES`. Adding a new
// cut here requires updating both the constant and the Ruby bit-map; the
// coverage spec asserts the two ends agree.
const algorythmoCutHidden = computed(() => {
  const id = accountId.value;
  return Object.fromEntries(
    ALGORYTHMO_CUT_FLAG_NAMES.map(name => [
      name,
      isFeatureEnabledonAccount.value(id, `algorythmo_cut_${name}`) === true,
    ])
  );
});

// Even when the upstream ADVANCED_ASSIGNMENT capability is present, the cut
// suppresses the sidebar item so PME tenants never see capacity-planning UI.
const showAdvancedAssignment = computed(
  () =>
    hasAdvancedAssignment.value &&
    !algorythmoCutHidden.value.advanced_assignment
);

const hasConversationUnreadCounts = computed(() => {
  return isFeatureEnabledonAccount.value(
    accountId.value,
    FEATURE_FLAGS.CONVERSATION_UNREAD_COUNTS
  );
});

const fetchConversationUnreadCounts = ([currentAccountId, isEnabled]) => {
  if (!currentAccountId) return;

  if (!isEnabled) {
    store.dispatch('conversationUnreadCounts/clear');
    return;
  }

  store.dispatch('conversationUnreadCounts/get');
};

const toggleShortcutModalFn = show => {
  if (show) {
    emit('openKeyShortcutModal');
  } else {
    emit('closeKeyShortcutModal');
  }
};

useSidebarKeyboardShortcuts(toggleShortcutModalFn);

// algorythmo: M2-a — D6: sidebar expanded state persists per user in localStorage.
// Key: `algorythmo:sidebar:expanded:{userId}`. Value: JSON string of expanded item name or null.
// Falls back gracefully to in-memory ref when localStorage is unavailable (SSR / private mode).
const currentUser = useMapGetter('auth/getCurrentUser');

const readExpandedFromStorage = userId => {
  try {
    const raw = localStorage.getItem(
      `algorythmo:sidebar:expanded:${userId ?? 'anonymous'}`
    );
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeExpandedToStorage = (userId, value) => {
  try {
    localStorage.setItem(
      `algorythmo:sidebar:expanded:${userId ?? 'anonymous'}`,
      JSON.stringify(value)
    );
  } catch {
    // localStorage unavailable — state degrades to in-memory only
  }
};

const expandedItem = ref(null);

// algorythmo: M2-a — D6: restore persisted expanded item once currentUser is available.
watch(
  () => currentUser.value?.id,
  userId => {
    if (userId) {
      expandedItem.value = readExpandedFromStorage(userId);
    }
  },
  { immediate: true }
);

const setExpandedItem = name => {
  // algorythmo: M2-a — D6: toggle collapsed/expanded; persist choice for this user.
  expandedItem.value = expandedItem.value === name ? null : name;
  writeExpandedToStorage(currentUser.value?.id, expandedItem.value);
};

const {
  sidebarWidth,
  isCollapsed,
  setSidebarWidth,
  saveWidth,
  snapToCollapsed,
  snapToExpanded,
  COLLAPSED_THRESHOLD,
} = useSidebarResize();

// On mobile, sidebar is always expanded (flyout mode)
const isEffectivelyCollapsed = computed(
  () => !isMobile.value && isCollapsed.value
);

// Resize handle logic
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

provideSidebarContext({
  expandedItem,
  setExpandedItem,
  isCollapsed: isEffectivelyCollapsed,
  sidebarWidth,
  isResizing,
});

// Get clientX from mouse or touch event
const getClientX = event =>
  event.touches ? event.touches[0].clientX : event.clientX;

const onResizeStart = event => {
  isResizing.value = true;
  startX.value = getClientX(event);
  startWidth.value = sidebarWidth.value;
  Object.assign(document.body.style, {
    cursor: 'col-resize',
    userSelect: 'none',
  });
  // Prevent default to avoid scrolling on touch
  event.preventDefault();
};

const onResizeMove = event => {
  if (!isResizing.value) return;

  const delta = isRTL.value
    ? startX.value - getClientX(event)
    : getClientX(event) - startX.value;
  setSidebarWidth(startWidth.value + delta);
};

const onResizeEnd = () => {
  if (!isResizing.value) return;

  isResizing.value = false;
  Object.assign(document.body.style, { cursor: '', userSelect: '' });

  // Snap to collapsed state if below threshold
  if (sidebarWidth.value < COLLAPSED_THRESHOLD) {
    snapToCollapsed();
  } else {
    saveWidth();
  }
};

const onResizeHandleDoubleClick = () => {
  if (isCollapsed.value) snapToExpanded();
  else snapToCollapsed();
};

// Support both mouse and touch events
useEventListener(document, 'mousemove', onResizeMove);
useEventListener(document, 'mouseup', onResizeEnd);
useEventListener(document, 'touchmove', onResizeMove, { passive: false });
useEventListener(document, 'touchend', onResizeEnd);

const inboxes = useMapGetter('inboxes/getInboxes');
const labels = useMapGetter('labels/getLabelsOnSidebar');
const getInboxUnreadCount = useMapGetter(
  'conversationUnreadCounts/getInboxUnreadCount'
);
const getLabelUnreadCount = useMapGetter(
  'conversationUnreadCounts/getLabelUnreadCount'
);
const getTeamUnreadCount = useMapGetter(
  'conversationUnreadCounts/getTeamUnreadCount'
);
const teams = useMapGetter('teams/getMyTeams');
const contactCustomViews = useMapGetter('customViews/getContactCustomViews');
const conversationCustomViews = useMapGetter(
  'customViews/getConversationCustomViews'
);

onMounted(() => {
  store.dispatch('labels/get');
  store.dispatch('inboxes/get');
  store.dispatch('notifications/unReadCount');
  store.dispatch('teams/get');
  store.dispatch('attributes/get');
  store.dispatch('customViews/get', 'conversation');
  store.dispatch('customViews/get', 'contact');
});

watch([accountId, hasConversationUnreadCounts], fetchConversationUnreadCounts, {
  immediate: true,
});

const normalizeUnreadCount = count => {
  const unreadCount = Number(count);
  return Number.isFinite(unreadCount) && unreadCount > 0 ? unreadCount : 0;
};

const sortByUnreadCount = (items, labelKey, unreadCountKey) =>
  items.slice().sort((a, b) => {
    const unreadCountDiff =
      normalizeUnreadCount(unreadCountKey(b)) -
      normalizeUnreadCount(unreadCountKey(a));

    if (unreadCountDiff !== 0) return unreadCountDiff;

    return labelKey(a).localeCompare(labelKey(b));
  });

const sortedTeams = computed(() =>
  sortByUnreadCount(
    teams.value,
    team => team.name,
    team => getTeamUnreadCount.value(team.id)
  )
);

const sortedInboxes = computed(() =>
  sortByUnreadCount(
    inboxes.value,
    inbox => inbox.name,
    inbox => getInboxUnreadCount.value(inbox.id)
  )
);

const sortedLabels = computed(() =>
  sortByUnreadCount(
    labels.value,
    label => label.title,
    label => getLabelUnreadCount.value(label.id)
  )
);

const closeMobileSidebar = () => {
  if (!props.isMobileSidebarOpen) return;
  emit('closeMobileSidebar');
};

// algorythmo: rodada 3 — F-C: the Commercial sector was flattened into a single
// flat sidebar entry (the report sub-areas now live as in-page SectorShellV2
// tabs), so the newReportRoutes()/reportRoutes helpers that fed the old
// expandable Commercial group were removed. The underlying report routes
// (agent/label/inbox/team) stay registered and URL-reachable.

// algorythmo: M5 sidebar restructure
// menuItems arranged into 4 blocks: Operacional (no header) / GESTÃO / ESTRATÉGIA / INTELIGÊNCIA.
// Brain entry MOVED from its original position into INTELIGÊNCIA (D1: one entry point only).
// Section headers use type:'section' discriminator — rendered as SidebarSectionHeader,
// skipped by SidebarGroup. All edits in this computed are marked algorythmo: M5.
const menuItems = computed(() => {
  return [
    // ── OPERACIONAL block (no section header) ────────────────────────────────
    // algorythmo: M5 sidebar restructure — Operacional block: Contacts, Companies, Conversations, CRM
    // algorythmo: rodada 3 — CRM-6: CRM entry MOVED below Conversation (was head of block).
    {
      name: 'Contacts',
      label: t('SIDEBAR.CONTACTS'),
      icon: 'i-lucide-contact',
      children: [
        {
          name: 'All Contacts',
          label: t('SIDEBAR.ALL_CONTACTS'),
          to: accountScopedRoute(
            'contacts_dashboard_index',
            {},
            { page: 1, search: undefined }
          ),
          activeOn: ['contacts_dashboard_index', 'contacts_edit'],
        },
        {
          name: 'Active',
          label: t('SIDEBAR.ACTIVE'),
          to: accountScopedRoute('contacts_dashboard_active'),
          activeOn: ['contacts_dashboard_active'],
        },
        {
          name: 'Segments',
          icon: 'i-lucide-group',
          label: t('SIDEBAR.CUSTOM_VIEWS_SEGMENTS'),
          children: contactCustomViews.value.map(view => ({
            name: `${view.name}-${view.id}`,
            label: view.name,
            to: accountScopedRoute(
              'contacts_dashboard_segments_index',
              { segmentId: view.id },
              { page: 1 }
            ),
            activeOn: [
              'contacts_dashboard_segments_index',
              'contacts_edit_segment',
            ],
          })),
        },
        {
          name: 'Tagged With',
          icon: 'i-lucide-tag',
          label: t('SIDEBAR.TAGGED_WITH'),
          children: labels.value.map(label => ({
            name: `${label.title}-${label.id}`,
            label: label.title,
            icon: h('span', {
              class: `size-[8px] rounded-sm`,
              style: { backgroundColor: label.color },
            }),
            to: accountScopedRoute(
              'contacts_dashboard_labels_index',
              { label: label.title },
              { page: 1, search: undefined }
            ),
            activeOn: [
              'contacts_dashboard_labels_index',
              'contacts_edit_label',
            ],
          })),
        },
      ],
    },
    {
      name: 'Companies',
      label: t('SIDEBAR.COMPANIES'),
      icon: 'i-lucide-building-2',
      children: [
        {
          name: 'All Companies',
          label: t('SIDEBAR.ALL_COMPANIES'),
          to: accountScopedRoute(
            'companies_dashboard_index',
            {},
            { page: 1, search: undefined }
          ),
          activeOn: ['companies_dashboard_index', 'companies_dashboard_show'],
        },
      ],
    },
    {
      name: 'Inbox',
      label: t('SIDEBAR.INBOX'),
      icon: 'i-lucide-inbox',
      to: accountScopedRoute('inbox_view'),
      activeOn: ['inbox_view', 'inbox_view_conversation'],
      getterKeys: {
        count: 'notifications/getUnreadCount',
      },
    },
    {
      name: 'Conversation',
      label: t('SIDEBAR.CONVERSATIONS'),
      icon: 'i-lucide-message-circle',
      children: [
        {
          name: 'All',
          label: t('SIDEBAR.ALL_CONVERSATIONS'),
          activeOn: ['inbox_conversation'],
          to: accountScopedRoute('home'),
        },
        {
          name: 'Mentions',
          label: t('SIDEBAR.MENTIONED_CONVERSATIONS'),
          activeOn: ['conversation_through_mentions'],
          to: accountScopedRoute('conversation_mentions'),
        },
        {
          name: 'Participating',
          label: t('SIDEBAR.PARTICIPATING_CONVERSATIONS'),
          activeOn: ['conversation_through_participating'],
          to: accountScopedRoute('conversation_participating'),
        },
        {
          name: 'Unattended',
          activeOn: ['conversation_through_unattended'],
          label: t('SIDEBAR.UNATTENDED_CONVERSATIONS'),
          to: accountScopedRoute('conversation_unattended'),
        },
        {
          name: 'Folders',
          label: t('SIDEBAR.CUSTOM_VIEWS_FOLDER'),
          icon: 'i-lucide-folder',
          activeOn: ['conversations_through_folders'],
          children: conversationCustomViews.value.map(view => ({
            name: `${view.name}-${view.id}`,
            label: view.name,
            to: accountScopedRoute('folder_conversations', { id: view.id }),
          })),
        },
        {
          name: 'Teams',
          label: t('SIDEBAR.TEAMS'),
          icon: 'i-lucide-users',
          activeOn: ['conversations_through_team'],
          children: sortedTeams.value.map(team => ({
            name: `${team.name}-${team.id}`,
            label: team.name,
            badgeCount: getTeamUnreadCount.value(team.id),
            to: accountScopedRoute('team_conversations', { teamId: team.id }),
          })),
        },
        {
          name: 'Channels',
          label: t('SIDEBAR.CHANNELS'),
          icon: 'i-lucide-mailbox',
          activeOn: ['conversation_through_inbox'],
          children: sortedInboxes.value.map(inbox => ({
            name: `${inbox.name}-${inbox.id}`,
            label: inbox.name,
            badgeCount: getInboxUnreadCount.value(inbox.id),
            icon: h(ChannelIcon, { inbox, class: 'size-[16px]' }),
            to: accountScopedRoute('inbox_dashboard', { inbox_id: inbox.id }),
            component: leafProps =>
              h(ChannelLeaf, {
                label: leafProps.label,
                active: leafProps.active,
                inbox,
                badgeCount: leafProps.badgeCount,
              }),
          })),
        },
        {
          name: 'Labels',
          label: t('SIDEBAR.LABELS'),
          icon: 'i-lucide-tag',
          activeOn: ['conversations_through_label'],
          children: sortedLabels.value.map(label => ({
            name: `${label.title}-${label.id}`,
            label: label.title,
            badgeCount: getLabelUnreadCount.value(label.id),
            icon: h('span', {
              class: `size-[8px] rounded-sm`,
              style: { backgroundColor: label.color },
            }),
            to: accountScopedRoute('label_conversations', {
              label: label.title,
            }),
          })),
        },
      ],
    },

    // algorythmo: rodada 3 — CRM-6: CRM lives directly below Conversation, as a
    // pipeline/funnel surface for the operational team. Icon is a funnel glyph
    // (i-lucide-filter) to read as "pipeline", not a generic kanban board.
    // Gate (hasAlgorythmoCrm) and route are unchanged.
    // algorythmo: feature-gate algorythmo_crm
    ...(hasAlgorythmoCrm.value
      ? [
          {
            name: 'AlgorythmoCrm',
            icon: 'i-lucide-filter',
            label: t('ALGORYTHMO_CRM.SIDEBAR.CRM'),
            activeOn: ['algorythmo_crm_kanban'],
            to: accountScopedRoute('algorythmo_crm_kanban'),
          },
        ]
      : []),

    // ── GESTÃO / MANAGEMENT block ─────────────────────────────────────────────
    // algorythmo: M2-a — D1 order: Commercial / Marketing / Operations / Procurement
    //             / HR / Facilities / Finance / Administration.
    //             D11: sidebar labels in English (new SIDEBAR.ALG_SECTOR_* keys).
    //             D10: per-sector cut-flags (default OFF = sector visible).
    //             D6: chevron + collapse fix handled in SidebarGroup.vue.
    // algorythmo: M5 sidebar restructure — GESTÃO header (admin-only to avoid orphan for agents)
    ...(isAdmin.value
      ? [
          {
            type: 'section',
            name: 'section-gestao',
            label: t('SIDEBAR.ALGORYTHMO_SECTION_GESTAO'),
            isFirst: true,
          },
        ]
      : []),

    // ── 1. Commercial (was "Relatórios Comerciais") ───────────────────────────
    // algorythmo: M2-a — D1: Commercial is 1st in Management. D10: cut-flag gates entire sector.
    // algorythmo: rodada 3 — F-C: FLATTENED. The Commercial sector is now a single
    // flat entry that lands on the in-page Commercial shell (commercial_reports),
    // where the former sub-areas (Overview / Conversation / Agents / Teams / SLA /
    // CSAT / Customer Support) already live as SectorShellV2 tabs. Flattening folds
    // those duplicate sidebar children into the page, gives the entry the active
    // (white inverse-tab) fill that the other flat sectors have, and drops the
    // Bot / Labels / Inbox sidebar leaves (their routes stay live). The legacy
    // Commercial Overview alias key is preserved in the i18n overrides; the
    // sidebar label uses the standard sector key like its sibling sectors.
    ...(algorythmoCutHidden.value.sector_commercial
      ? []
      : [
          {
            name: 'Commercial',
            icon: 'i-lucide-chart-spline',
            label: t('SIDEBAR.ALG_SECTOR_COMMERCIAL'),
            activeOn: ['commercial_reports'],
            to: accountScopedRoute('commercial_reports'),
          },
        ]),

    // ── 2. Marketing ──────────────────────────────────────────────────────────
    // algorythmo: M2-a — D1: 2nd in Management. D10: sector cut-flag.
    // D11: label "Marketing" (English). Sub-tabs in PT delivered in M2-d.
    ...(algorythmoCutHidden.value.sector_marketing
      ? []
      : [
          {
            name: 'AdminMarketing',
            icon: 'i-lucide-megaphone',
            label: t('SIDEBAR.ALG_SECTOR_MARKETING'),
            activeOn: ['algorythmo_admin_marketing'],
            to: accountScopedRoute('algorythmo_admin_marketing'),
          },
        ]),

    // ── 3. Operations (was "Operação") ────────────────────────────────────────
    // algorythmo: M2-a — D1: 3rd. D11: "Operations". D10: sector cut-flag.
    ...(algorythmoCutHidden.value.sector_operations
      ? []
      : [
          {
            name: 'AdminOperacao',
            icon: 'i-lucide-factory',
            label: t('SIDEBAR.ALG_SECTOR_OPERATIONS'),
            activeOn: ['algorythmo_admin_operacao'],
            to: accountScopedRoute('algorythmo_admin_operacao'),
          },
        ]),

    // ── 4. Procurement (was "Compras") ────────────────────────────────────────
    // algorythmo: M2-a — D1: 4th. D11: "Procurement". D10: sector cut-flag.
    ...(algorythmoCutHidden.value.sector_procurement
      ? []
      : [
          {
            name: 'AdminCompras',
            icon: 'i-lucide-shopping-cart',
            label: t('SIDEBAR.ALG_SECTOR_PROCUREMENT'),
            activeOn: ['algorythmo_admin_compras'],
            to: accountScopedRoute('algorythmo_admin_compras'),
          },
        ]),

    // ── 5. HR (was "RH") ─────────────────────────────────────────────────────
    // algorythmo: M2-a — D1: 5th. D11: "HR". D10: sector cut-flag.
    ...(algorythmoCutHidden.value.sector_hr
      ? []
      : [
          {
            name: 'AdminRh',
            icon: 'i-lucide-users-round',
            label: t('SIDEBAR.ALG_SECTOR_HR'),
            activeOn: ['algorythmo_admin_rh'],
            to: accountScopedRoute('algorythmo_admin_rh'),
          },
        ]),

    // ── 6. Facilities (NOVO) ──────────────────────────────────────────────────
    // algorythmo: M2-g — D1: 6th. D11: "Facilities". D10: sector cut-flag.
    // The route ships in M2-g, so the entry now follows the standard convention:
    // cut-flag `algorythmo_cut_sector_facilities` default OFF = sector visible.
    // (The M2-a inverted carve-out — held hidden while the route was missing — is
    // retired now that `algorythmo_admin_facilities` exists.)
    ...(algorythmoCutHidden.value.sector_facilities
      ? []
      : [
          {
            name: 'AdminFacilities',
            icon: 'i-lucide-building',
            label: t('SIDEBAR.ALG_SECTOR_FACILITIES'),
            activeOn: ['algorythmo_admin_facilities'],
            to: accountScopedRoute('algorythmo_admin_facilities'),
          },
        ]),

    // ── 7. Finance (was "Financeiro") ─────────────────────────────────────────
    // algorythmo: M2-a — D1: 7th. D11: "Finance". D10: sector cut-flag.
    ...(algorythmoCutHidden.value.sector_finance
      ? []
      : [
          {
            name: 'AdminFinanceiro',
            icon: 'i-lucide-landmark',
            label: t('SIDEBAR.ALG_SECTOR_FINANCE'),
            activeOn: ['algorythmo_admin_financeiro'],
            to: accountScopedRoute('algorythmo_admin_financeiro'),
          },
        ]),

    // ── 8. Administration (was "Administração") ───────────────────────────────
    // algorythmo: M2-a — D1: 8th. D11: "Administration". D10: sector cut-flag.
    ...(algorythmoCutHidden.value.sector_administration
      ? []
      : [
          {
            name: 'AdminAdministracao',
            icon: 'i-lucide-briefcase',
            label: t('SIDEBAR.ALG_SECTOR_ADMINISTRATION'),
            activeOn: ['algorythmo_admin_administracao'],
            to: accountScopedRoute('algorythmo_admin_administracao'),
          },
        ]),

    // algorythmo: M2-a — D8: Campaigns top-level entry intentionally omitted.
    // Routes remain live — accessed via URL or via Marketing > Campanhas once M2-d ships.
    // Flag `algorythmo_cut_campaigns_top_level` exists in registry for future restore path.

    // ── ESTRATÉGIA block ──────────────────────────────────────────────────────
    // algorythmo: M5 sidebar restructure — ESTRATÉGIA header (admin-only)
    ...(isAdmin.value
      ? [
          {
            type: 'section',
            name: 'section-estrategia',
            label: t('SIDEBAR.ALGORYTHMO_SECTION_ESTRATEGIA'),
            isFirst: false,
          },
        ]
      : []),
    // algorythmo: M5 sidebar restructure — C-Levels placeholder (M7 ships atmospheric UI)
    {
      name: 'AdminCLevels',
      icon: 'i-lucide-crown',
      label: t('ALGORYTHMO_ADMIN.C_LEVELS.SIDEBAR_LABEL'),
      activeOn: ['algorythmo_admin_c_levels'],
      to: accountScopedRoute('algorythmo_admin_c_levels'),
    },

    // ── INTELIGÊNCIA block ────────────────────────────────────────────────────
    // algorythmo: M5 sidebar restructure — INTELIGÊNCIA header (admin-only)
    ...(isAdmin.value
      ? [
          {
            type: 'section',
            name: 'section-inteligencia',
            label: t('SIDEBAR.ALGORYTHMO_SECTION_INTELIGENCIA'),
            isFirst: false,
          },
        ]
      : []),
    // algorythmo: M5 sidebar restructure — Brain MOVED from original position (D1: one entry point)
    // Brain is ungated for this single-tenant instance — shown to admins,
    // consistent with the INTELIGÊNCIA section + the route's administrator
    // permission. "Brain" is the product name (Algorythmo Brain) — untranslated.
    ...(isAdmin.value
      ? [
          {
            name: 'AlgorythmoBrain',
            icon: 'i-lucide-brain',
            label: t('ALGORYTHMO_BRAIN.SIDEBAR.BRAIN'),
            activeOn: ['algorythmo_brain_viewer'],
            to: accountScopedRoute('algorythmo_brain_viewer'),
          },
        ]
      : []),
    // algorythmo: M5 sidebar restructure — Marketplace placeholder (M8c ships catalog UI)
    {
      name: 'AdminMarketplace',
      icon: 'i-lucide-store',
      label: t('ALGORYTHMO_ADMIN.MARKETPLACE.TITLE'),
      activeOn: ['algorythmo_admin_marketplace'],
      to: accountScopedRoute('algorythmo_admin_marketplace'),
    },

    // ── Remaining upstream surfaces ───────────────────────────────────────────
    // algorythmo: rodada 3 — P-3: the top-level Help Center ("Portals") sidebar
    // block was hard-deleted. Help Center content is surfaced as the Customer
    // Support tab inside the Commercial sector. The route-level
    // `algorythmo_cut_help_center` flag and helpcenter.routes.js are intentionally
    // left untouched — Customer Support depends on those routes staying alive.
    // algorythmo: feature-gate algorythmo_show_captain
    // Captain section only rendered when algorythmo_show_captain flag is true.
    // Default: false — PME clients never see Captain UI.
    ...(hasCaptain.value
      ? [
          {
            name: 'Captain',
            icon: 'i-woot-captain',
            label: t('SIDEBAR.CAPTAIN'),
            activeOn: ['captain_assistants_create_index'],
            children: [
              {
                name: 'FAQs',
                label: t('SIDEBAR.CAPTAIN_RESPONSES'),
                activeOn: [
                  'captain_assistants_responses_index',
                  'captain_assistants_responses_pending',
                ],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_responses_index',
                }),
              },
              {
                name: 'Documents',
                label: t('SIDEBAR.CAPTAIN_DOCUMENTS'),
                activeOn: ['captain_assistants_documents_index'],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_documents_index',
                }),
              },
              {
                name: 'Scenarios',
                label: t('SIDEBAR.CAPTAIN_SCENARIOS'),
                activeOn: ['captain_assistants_scenarios_index'],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_scenarios_index',
                }),
              },
              {
                name: 'Playground',
                label: t('SIDEBAR.CAPTAIN_PLAYGROUND'),
                activeOn: ['captain_assistants_playground_index'],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_playground_index',
                }),
              },
              {
                name: 'Inboxes',
                label: t('SIDEBAR.CAPTAIN_INBOXES'),
                activeOn: ['captain_assistants_inboxes_index'],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_inboxes_index',
                }),
              },
              {
                name: 'Tools',
                label: t('SIDEBAR.CAPTAIN_TOOLS'),
                activeOn: ['captain_tools_index'],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_tools_index',
                }),
              },
              {
                name: 'Settings',
                label: t('SIDEBAR.CAPTAIN_SETTINGS'),
                activeOn: [
                  'captain_assistants_settings_index',
                  'captain_assistants_guidelines_index',
                  'captain_assistants_guardrails_index',
                ],
                to: accountScopedRoute('captain_assistants_index', {
                  navigationPath: 'captain_assistants_settings_index',
                }),
              },
            ],
          },
        ]
      : []),
    {
      name: 'Settings',
      label: t('SIDEBAR.SETTINGS'),
      icon: 'i-lucide-bolt',
      children: [
        {
          name: 'Settings Account Settings',
          label: t('SIDEBAR.ACCOUNT_SETTINGS'),
          icon: 'i-lucide-briefcase',
          to: accountScopedRoute('general_settings_index'),
        },
        // {
        //   name: 'Settings Captain',
        //   label: t('SIDEBAR.CAPTAIN_AI'),
        //   icon: 'i-woot-captain',
        //   to: accountScopedRoute('captain_settings_index'),
        // },
        {
          name: 'Settings Agents',
          label: t('SIDEBAR.AGENTS'),
          icon: 'i-lucide-square-user',
          to: accountScopedRoute('agent_list'),
        },
        {
          name: 'Settings Teams',
          label: t('SIDEBAR.TEAMS'),
          icon: 'i-lucide-users',
          activeOn: [
            'settings_teams_list',
            'settings_teams_new',
            'settings_teams_finish',
            'settings_teams_add_agents',
            'settings_teams_show',
            'settings_teams_edit',
            'settings_teams_edit_members',
            'settings_teams_edit_finish',
          ],
          to: accountScopedRoute('settings_teams_list'),
        },
        // algorythmo: feature-gate algorythmo_cut_advanced_assignment
        // Upstream capability AND cut must both allow the item.
        ...(showAdvancedAssignment.value
          ? [
              {
                name: 'Settings Agent Assignment',
                label: t('SIDEBAR.AGENT_ASSIGNMENT'),
                icon: 'i-lucide-user-cog',
                activeOn: [
                  'assignment_policy_index',
                  'agent_assignment_policy_index',
                  'agent_assignment_policy_create',
                  'agent_assignment_policy_edit',
                  'agent_capacity_policy_index',
                  'agent_capacity_policy_create',
                  'agent_capacity_policy_edit',
                ],
                to: accountScopedRoute('assignment_policy_index'),
              },
            ]
          : []),
        {
          name: 'Settings Inboxes',
          label: t('SIDEBAR.INBOXES'),
          icon: 'i-lucide-inbox',
          activeOn: [
            'settings_inbox_list',
            'settings_inbox_show',
            'settings_inbox_new',
            'settings_inbox_finish',
            'settings_inboxes_page_channel',
            'settings_inboxes_add_agents',
          ],
          to: accountScopedRoute('settings_inbox_list'),
        },
        {
          name: 'Settings Labels',
          label: t('SIDEBAR.LABELS'),
          icon: 'i-lucide-tags',
          to: accountScopedRoute('labels_list'),
        },
        {
          name: 'Settings Custom Attributes',
          label: t('SIDEBAR.CUSTOM_ATTRIBUTES'),
          icon: 'i-lucide-code',
          to: accountScopedRoute('attributes_list'),
        },
        {
          name: 'Settings Automation',
          label: t('SIDEBAR.AUTOMATION'),
          icon: 'i-lucide-repeat',
          to: accountScopedRoute('automation_list'),
        },
        // algorythmo: feature-gate algorythmo_cut_agent_bots
        ...(algorythmoCutHidden.value.agent_bots
          ? []
          : [
              {
                name: 'Settings Agent Bots',
                label: t('SIDEBAR.AGENT_BOTS'),
                icon: 'i-lucide-bot',
                to: accountScopedRoute('agent_bots'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_macros
        ...(algorythmoCutHidden.value.macros
          ? []
          : [
              {
                name: 'Settings Macros',
                label: t('SIDEBAR.MACROS'),
                icon: 'i-lucide-toy-brick',
                to: accountScopedRoute('macros_wrapper'),
              },
            ]),
        {
          name: 'Settings Canned Responses',
          label: t('SIDEBAR.CANNED_RESPONSES'),
          icon: 'i-lucide-message-square-quote',
          to: accountScopedRoute('canned_list'),
        },
        {
          name: 'Settings Integrations',
          label: t('SIDEBAR.INTEGRATIONS'),
          icon: 'i-lucide-blocks',
          to: accountScopedRoute('settings_applications'),
        },
        // algorythmo: feature-gate algorythmo_cut_audit_logs
        ...(algorythmoCutHidden.value.audit_logs
          ? []
          : [
              {
                name: 'Settings Audit Logs',
                label: t('SIDEBAR.AUDIT_LOGS'),
                icon: 'i-lucide-briefcase',
                to: accountScopedRoute('auditlogs_list'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_custom_roles
        ...(algorythmoCutHidden.value.custom_roles
          ? []
          : [
              {
                name: 'Settings Custom Roles',
                label: t('SIDEBAR.CUSTOM_ROLES'),
                icon: 'i-lucide-shield-plus',
                to: accountScopedRoute('custom_roles_list'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_sla
        ...(algorythmoCutHidden.value.sla
          ? []
          : [
              {
                name: 'Settings Sla',
                label: t('SIDEBAR.SLA'),
                icon: 'i-lucide-clock-alert',
                to: accountScopedRoute('sla_list'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_conversation_workflow
        ...(algorythmoCutHidden.value.conversation_workflow
          ? []
          : [
              {
                name: 'Conversation Workflow',
                label: t('SIDEBAR.CONVERSATION_WORKFLOW'),
                icon: 'i-lucide-workflow',
                to: accountScopedRoute('conversation_workflow_index'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_security_settings
        ...(algorythmoCutHidden.value.security_settings
          ? []
          : [
              {
                name: 'Settings Security',
                label: t('SIDEBAR.SECURITY'),
                icon: 'i-lucide-shield',
                to: accountScopedRoute('security_settings_index'),
              },
            ]),
        // algorythmo: feature-gate algorythmo_cut_billing_settings
        ...(algorythmoCutHidden.value.billing_settings
          ? []
          : [
              {
                name: 'Settings Billing',
                label: t('SIDEBAR.BILLING'),
                icon: 'i-lucide-credit-card',
                to: accountScopedRoute('billing_settings_index'),
              },
            ]),
      ],
    },
  ];
});
</script>

<template>
  <aside
    v-on-click-outside="[
      closeMobileSidebar,
      {
        ignore: [
          '#mobile-sidebar-launcher',
          '[data-popover-content]',
          '[data-popover-backdrop]',
        ],
      },
    ]"
    class="bg-n-background flex flex-col text-sm pb-px fixed top-0 ltr:left-0 rtl:right-0 h-full z-40 w-[200px] md:w-auto md:relative md:flex-shrink-0 md:ltr:translate-x-0 md:rtl:translate-x-0 ltr:border-r rtl:border-l border-n-weak"
    :class="[
      {
        'shadow-lg md:shadow-none': isMobileSidebarOpen,
        'ltr:-translate-x-full rtl:translate-x-full': !isMobileSidebarOpen,
        'transition-transform duration-200 ease-out md:transition-[width]':
          !isResizing,
      },
    ]"
    :style="isMobile ? undefined : { width: `${sidebarWidth}px` }"
  >
    <section
      class="grid"
      :class="isEffectivelyCollapsed ? 'mt-3 mb-6 gap-4' : 'mt-1 mb-4 gap-2'"
    >
      <div
        class="flex gap-2 items-center min-w-0"
        :class="{
          'justify-center px-1': isEffectivelyCollapsed,
          'px-2': !isEffectivelyCollapsed,
        }"
      >
        <template v-if="isEffectivelyCollapsed">
          <SidebarAccountSwitcher
            is-collapsed
            @show-create-account-modal="emit('showCreateAccountModal')"
          />
        </template>
        <template v-else>
          <div
            class="grid flex-shrink-0 place-content-center size-7 rounded-[7px] bg-n-alpha-1 text-n-brand"
          >
            <AlgBrandMark class="size-4" decorative />
          </div>
          <SidebarAccountSwitcher
            class="flex-grow min-w-0"
            @show-create-account-modal="emit('showCreateAccountModal')"
          />
        </template>
      </div>
      <!-- algorythmo: A2 — the ComposeConversation (pencil/compose) trigger is
           removed from the sidebar chrome. Conversations are created from the
           inbox surfaces; the sidebar stays an editorial nav rail (Ref 1), no
           floating compose affordance. P-2 already dropped the search pill. -->
    </section>
    <nav
      class="grid overflow-y-scroll flex-grow gap-2 pb-5 no-scrollbar min-w-0"
      :class="isEffectivelyCollapsed ? 'px-1' : 'px-2'"
    >
      <ul
        class="flex flex-col gap-1 m-0 list-none min-w-0"
        :class="{ 'items-center': isEffectivelyCollapsed }"
      >
        <!-- algorythmo: M5 sidebar restructure — type discriminator for section headers -->
        <template v-for="item in menuItems" :key="item.name">
          <SidebarSectionHeader
            v-if="item.type === 'section'"
            :label="item.label"
            :is-first="item.isFirst"
          />
          <SidebarGroup v-else v-bind="item" />
        </template>
      </ul>
    </nav>
    <section
      class="flex relative flex-col flex-shrink-0 gap-1 justify-between items-center"
    >
      <div
        class="pointer-events-none absolute inset-x-0 -top-[1.938rem] h-8 bg-gradient-to-t from-n-background to-transparent"
      />
      <SidebarChangelogCard
        v-if="
          isOnChatwootCloud &&
          !isACustomBrandedInstance &&
          !isEffectivelyCollapsed
        "
      />
      <SidebarChangelogButton
        v-if="
          isOnChatwootCloud &&
          !isACustomBrandedInstance &&
          isEffectivelyCollapsed
        "
      />
      <div
        class="px-1 py-1.5 flex-shrink-0 flex w-full z-50 gap-2 items-center border-t border-n-weak shadow-[0px_-2px_4px_0px_rgba(27,28,29,0.02)]"
        :class="isEffectivelyCollapsed ? 'justify-center' : 'justify-between'"
      >
        <SidebarProfileMenu
          :is-collapsed="isEffectivelyCollapsed"
          @open-key-shortcut-modal="emit('openKeyShortcutModal')"
        />
      </div>
    </section>
    <!-- Resize Handle (desktop only) -->
    <div
      class="hidden md:block absolute top-0 h-full w-1 cursor-col-resize z-40 ltr:right-0 rtl:left-0 group"
      @mousedown="onResizeStart"
      @touchstart="onResizeStart"
      @dblclick="onResizeHandleDoubleClick"
    >
      <div
        class="absolute top-0 h-full w-px ltr:right-0 rtl:left-0 bg-transparent group-hover:bg-n-brand transition-colors"
        :class="{ 'bg-n-brand': isResizing }"
      />
    </div>
  </aside>
</template>
