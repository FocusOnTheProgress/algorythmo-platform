<script>
import { defineAsyncComponent, ref, computed } from 'vue';

import NextSidebar from 'next/sidebar/Sidebar.vue';
// algorythmo: operador — the operator (non-admin) gets the improved Chatwoot rail
// (faithful upstream sidebar + CRM + Copiloto); the admin keeps the customized
// NextSidebar (still evolving). Rendered by role below.
import OperatorSidebar from 'next/sidebar/OperatorSidebar.vue';
import WootKeyShortcutModal from 'dashboard/components/widgets/modal/WootKeyShortcutModal.vue';
import AddAccountModal from 'dashboard/components/app/AddAccountModal.vue';
import UpgradePage from 'dashboard/routes/dashboard/upgrade/UpgradePage.vue';

import { useUISettings } from 'dashboard/composables/useUISettings';
import { useAccount } from 'dashboard/composables/useAccount';
import { useAdmin } from 'dashboard/composables/useAdmin';
import { useWindowSize } from '@vueuse/core';
import { useMapGetter } from 'dashboard/composables/store';
import { FEATURE_FLAGS } from 'dashboard/featureFlags';

import wootConstants from 'dashboard/constants/globals';

const CommandBar = defineAsyncComponent(
  () => import('./commands/commandbar.vue')
);

const FloatingCallWidget = defineAsyncComponent(
  () => import('dashboard/components-next/call/FloatingCallWidget.vue')
);

import CopilotLauncher from 'dashboard/components-next/copilot/CopilotLauncher.vue';
import CopilotContainer from 'dashboard/components/copilot/CopilotContainer.vue';

import MobileSidebarLauncher from 'dashboard/components-next/sidebar/MobileSidebarLauncher.vue';
import { useCallsStore } from 'dashboard/stores/calls';

export default {
  components: {
    NextSidebar,
    OperatorSidebar,
    CommandBar,
    WootKeyShortcutModal,
    AddAccountModal,
    UpgradePage,
    CopilotLauncher,
    CopilotContainer,
    FloatingCallWidget,
    MobileSidebarLauncher,
  },
  setup() {
    const upgradePageRef = ref(null);
    const { uiSettings, updateUISettings } = useUISettings();
    const { accountId } = useAccount();
    // algorythmo: operador — pick the rail by role (admin → custom, else operator).
    const { isAdmin } = useAdmin();
    const { width: windowWidth } = useWindowSize();
    const callsStore = useCallsStore();

    // algorythmo: feature-gate algorythmo_show_captain
    // Both CopilotLauncher and CopilotContainer are mounted only when BOTH
    // captain_integration AND algorythmo_show_captain are enabled.
    // This prevents the panel from rendering even if is_copilot_panel_open
    // is persisted as true in a migrated user's uiSettings.
    const currentAccountId = useMapGetter('getCurrentAccountId');
    const isFeatureEnabledonAccount = useMapGetter(
      'accounts/isFeatureEnabledonAccount'
    );
    const hasCaptainFeature = computed(() =>
      isFeatureEnabledonAccount.value(
        currentAccountId.value,
        FEATURE_FLAGS.CAPTAIN
      )
    );
    const hasAlgorythmoCaptain = computed(() =>
      isFeatureEnabledonAccount.value(
        currentAccountId.value,
        FEATURE_FLAGS.ALGORYTHMO_SHOW_CAPTAIN
      )
    );
    const showCaptainUI = computed(
      () => hasCaptainFeature.value && hasAlgorythmoCaptain.value // algorythmo: feature-gate algorythmo_show_captain
    );

    return {
      uiSettings,
      updateUISettings,
      accountId,
      upgradePageRef,
      windowWidth,
      hasActiveCall: computed(() => callsStore.hasActiveCall),
      hasIncomingCall: computed(() => callsStore.hasIncomingCall),
      showCaptainUI, // algorythmo: feature-gate algorythmo_show_captain
      isAdmin, // algorythmo: operador — role-based sidebar selection
    };
  },
  data() {
    return {
      showAccountModal: false,
      showCreateAccountModal: false,
      showShortcutModal: false,
      isMobileSidebarOpen: false,
    };
  },
  computed: {
    isSmallScreen() {
      return this.windowWidth < wootConstants.SMALL_SCREEN_BREAKPOINT;
    },
    showUpgradePage() {
      return this.upgradePageRef?.shouldShowUpgradePage;
    },
    bypassUpgradePage() {
      return [
        'billing_settings_index',
        'settings_inbox_list',
        'general_settings_index',
        'agent_list',
      ].includes(this.$route.name);
    },
    previouslyUsedDisplayType() {
      const {
        previously_used_conversation_display_type: conversationDisplayType,
      } = this.uiSettings;
      return conversationDisplayType;
    },
  },
  watch: {
    isSmallScreen: {
      handler() {
        const { LAYOUT_TYPES } = wootConstants;
        if (window.innerWidth <= wootConstants.SMALL_SCREEN_BREAKPOINT) {
          this.updateUISettings({
            conversation_display_type: LAYOUT_TYPES.EXPANDED,
          });
        } else {
          this.updateUISettings({
            conversation_display_type: this.previouslyUsedDisplayType,
          });
        }
      },
      immediate: true,
    },
    // algorythmo: feature-gate algorythmo_show_captain
    // When the flag is off, force is_copilot_panel_open to false so that
    // any persisted storage value from a migrated user does not re-open the
    // panel if the flag is toggled back on mid-session.
    showCaptainUI: {
      handler(isOn) {
        if (!isOn && this.uiSettings.is_copilot_panel_open) {
          this.updateUISettings({ is_copilot_panel_open: false });
        }
      },
      immediate: true,
    },
  },
  methods: {
    toggleMobileSidebar() {
      this.isMobileSidebarOpen = !this.isMobileSidebarOpen;
    },
    closeMobileSidebar() {
      this.isMobileSidebarOpen = false;
    },
    openCreateAccountModal() {
      this.showAccountModal = false;
      this.showCreateAccountModal = true;
    },
    closeCreateAccountModal() {
      this.showCreateAccountModal = false;
    },
    toggleAccountModal() {
      this.showAccountModal = !this.showAccountModal;
    },
    toggleKeyShortcutModal() {
      this.showShortcutModal = true;
    },
    closeKeyShortcutModal() {
      this.showShortcutModal = false;
    },
  },
};
</script>

<template>
  <div class="flex flex-grow overflow-hidden text-n-slate-12">
    <!-- algorythmo: operador — admin keeps the customized NextSidebar; the
         operator (non-admin) gets the improved Chatwoot rail (OperatorSidebar:
         faithful upstream v4.14.0 sidebar + CRM + Copiloto + Modeloja brand). -->
    <NextSidebar
      v-if="isAdmin"
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @toggle-account-modal="toggleAccountModal"
      @open-key-shortcut-modal="toggleKeyShortcutModal"
      @close-key-shortcut-modal="closeKeyShortcutModal"
      @show-create-account-modal="openCreateAccountModal"
      @close-mobile-sidebar="closeMobileSidebar"
    />
    <OperatorSidebar
      v-else
      :is-mobile-sidebar-open="isMobileSidebarOpen"
      @open-key-shortcut-modal="toggleKeyShortcutModal"
      @close-key-shortcut-modal="closeKeyShortcutModal"
      @show-create-account-modal="openCreateAccountModal"
      @close-mobile-sidebar="closeMobileSidebar"
    />

    <main
      class="flex flex-1 h-full w-full min-h-0 px-0 overflow-hidden bg-n-surface-1"
    >
      <UpgradePage
        v-show="showUpgradePage"
        ref="upgradePageRef"
        :bypass-upgrade-page="bypassUpgradePage"
      >
        <MobileSidebarLauncher
          :is-mobile-sidebar-open="isMobileSidebarOpen"
          @toggle="toggleMobileSidebar"
        />
      </UpgradePage>
      <template v-if="!showUpgradePage">
        <router-view />
        <CommandBar />
        <!-- algorythmo: feature-gate algorythmo_show_captain -->
        <CopilotLauncher v-if="showCaptainUI" />
        <MobileSidebarLauncher
          :is-mobile-sidebar-open="isMobileSidebarOpen"
          @toggle="toggleMobileSidebar"
        />
        <!-- algorythmo: feature-gate algorythmo_show_captain -->
        <CopilotContainer v-if="showCaptainUI" />
        <FloatingCallWidget v-if="hasActiveCall || hasIncomingCall" />
      </template>
      <AddAccountModal
        :show="showCreateAccountModal"
        @close-account-create-modal="closeCreateAccountModal"
      />
      <WootKeyShortcutModal
        v-model:show="showShortcutModal"
        @close="closeKeyShortcutModal"
        @clickaway="closeKeyShortcutModal"
      />
    </main>
  </div>
</template>
