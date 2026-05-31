// algorythmo: stream-a — Nav + Conversas restructure (behavioral).
//
// These tests exercise real behavior, not source-string matching:
//   1. useReadOnlyView derives read-only from route.meta.isReadOnly (the durable
//      source that makes the aquarium read-only TOTAL).
//   2. conversationUrl builds the read-only aquarium path when isReadOnly — so a
//      card clicked in "Operação ao vivo" cannot route to the editable inbox path.
//   3. MessagesView, mounted with read-only true, does NOT render the ReplyBox and
//      DOES render the read-only notice; with read-only false it renders ReplyBox.
//   4. useSidebarResize collapse/expand toggle (snapToCollapsed/snapToExpanded)
//      crosses the collapse threshold in both directions — the resize handle was
//      removed but the two states stay reachable.

import { ref } from 'vue';
import { shallowMount } from '@vue/test-utils';
import { createStore } from 'vuex';

import { useReadOnlyView } from 'dashboard/composables/algorythmo/useReadOnlyView';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { useSidebarResize } from 'dashboard/components-next/sidebar/provider';
import MessagesView from 'dashboard/components/widgets/conversation/MessagesView.vue';

import { useRoute } from 'vue-router';
import { useUISettings } from 'dashboard/composables/useUISettings';

vi.mock('vue-router', () => ({ useRoute: vi.fn() }));
vi.mock('dashboard/composables/useUISettings', () => ({
  useUISettings: vi.fn(),
}));
// MessagesView pulls in label-suggestion machinery (route + integrations +
// captain) that is irrelevant to the read-only reply-box contract. Stub it to a
// disabled, no-op surface so the mount stays focused and side-effect free.
vi.mock('dashboard/composables/useLabelSuggestions', () => ({
  useLabelSuggestions: () => ({
    captainTasksEnabled: ref(false),
    isLabelSuggestionFeatureEnabled: ref(false),
    getLabelSuggestions: vi.fn().mockResolvedValue([]),
  }),
}));

describe('stream-a: useReadOnlyView (durable read-only source)', () => {
  it('is read-only when route.meta.isReadOnly is true', () => {
    useRoute.mockReturnValue({ meta: { isReadOnly: true } });
    expect(useReadOnlyView().isReadOnly.value).toBe(true);
  });

  it('is editable when route.meta.isReadOnly is absent', () => {
    useRoute.mockReturnValue({ meta: {} });
    expect(useReadOnlyView().isReadOnly.value).toBe(false);
  });

  it('is editable when there is no route meta at all', () => {
    useRoute.mockReturnValue(undefined);
    expect(useReadOnlyView().isReadOnly.value).toBe(false);
  });
});

describe('stream-a: conversationUrl preserves read-only for aquarium cards', () => {
  it('builds the operacao-ao-vivo conversation path when isReadOnly', () => {
    const url = conversationUrl({ accountId: 7, id: 42, isReadOnly: true });
    expect(url).toBe('accounts/7/operacao-ao-vivo/conversations/42');
  });

  it('read-only wins even if an inbox/label context is present', () => {
    const url = conversationUrl({
      accountId: 7,
      id: 42,
      activeInbox: 3,
      label: 'vip',
      isReadOnly: true,
    });
    expect(url).toBe('accounts/7/operacao-ao-vivo/conversations/42');
  });

  it('falls back to the editable inbox path when not read-only', () => {
    const url = conversationUrl({ accountId: 7, id: 42, isReadOnly: false });
    expect(url).toBe('accounts/7/conversations/42');
  });
});

describe('stream-a: sidebar collapse/expand toggle still works', () => {
  // The free-drag resize handle was removed; the collapse/expand TOGGLE must
  // remain so a previously-collapsed user is never frozen icon-only.
  const COLLAPSED_THRESHOLD = 160;

  beforeEach(() => {
    useUISettings.mockReturnValue({
      uiSettings: ref({ sidebar_width: 200 }),
      updateUISettings: vi.fn(),
    });
  });

  it('snapToCollapsed drops below the collapse threshold', () => {
    const { snapToCollapsed, sidebarWidth, isCollapsed } = useSidebarResize();
    snapToCollapsed();
    expect(sidebarWidth.value).toBeLessThan(COLLAPSED_THRESHOLD);
    expect(isCollapsed.value).toBe(true);
  });

  it('snapToExpanded raises back above the collapse threshold', () => {
    const { snapToCollapsed, snapToExpanded, sidebarWidth, isCollapsed } =
      useSidebarResize();
    snapToCollapsed();
    snapToExpanded();
    expect(sidebarWidth.value).toBeGreaterThanOrEqual(COLLAPSED_THRESHOLD);
    expect(isCollapsed.value).toBe(false);
  });

  it('persists the chosen width through updateUISettings', () => {
    const updateUISettings = vi.fn();
    useUISettings.mockReturnValue({
      uiSettings: ref({ sidebar_width: 200 }),
      updateUISettings,
    });
    const { snapToCollapsed } = useSidebarResize();
    snapToCollapsed();
    expect(updateUISettings).toHaveBeenCalledWith(
      expect.objectContaining({ sidebar_width: expect.any(Number) })
    );
  });
});

describe('stream-a: MessagesView read-only suppresses the reply box', () => {
  const baseChat = {
    id: 1,
    inbox_id: 10,
    can_reply: true,
    status: 'open',
    messages: [],
    agent_last_seen_at: 0,
  };

  const buildStore = () =>
    createStore({
      getters: {
        getSelectedChat: () => baseChat,
        getCurrentUserID: () => 99,
        getAllMessagesLoaded: () => true,
        getCurrentAccountId: () => 1,
        'inboxes/getInbox': () => () => ({ channel_type: 'Channel::Api' }),
        'inboxes/getInstagramInboxByInstagramId': () => () => null,
        'conversationTypingStatus/getUserList': () => () => [],
      },
      actions: {
        fetchAllAttachments: vi.fn(),
        markMessagesRead: vi.fn(),
      },
    });

  // MessageList is stubbed but must expose `.conversation-panel` so the mounted
  // scroll-listener setup doesn't throw on a null element.
  const stubs = {
    MessageList: {
      template: '<div class="conversation-panel"><slot /></div>',
    },
    Banner: true,
    Spinner: true,
    ConversationLabelSuggestion: true,
    ResizableEditorWrapper: {
      template: '<div class="resizable-stub"><slot /></div>',
    },
  };

  const mountView = isReadOnly =>
    shallowMount(MessagesView, {
      props: { isReadOnly },
      global: {
        plugins: [buildStore()],
        mocks: { $route: { query: {}, params: {} } },
        stubs,
      },
    });

  it('does NOT render the ReplyBox and shows the notice when read-only', () => {
    const wrapper = mountView(true);
    expect(wrapper.find('[data-testid="readonly-notice"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'ReplyBox' }).exists()).toBe(false);
    wrapper.unmount();
  });

  it('renders the ReplyBox and no notice when not read-only', () => {
    const wrapper = mountView(false);
    expect(wrapper.find('[data-testid="readonly-notice"]').exists()).toBe(
      false
    );
    expect(wrapper.findComponent({ name: 'ReplyBox' }).exists()).toBe(true);
    wrapper.unmount();
  });
});
