// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

// Stub the heavy AlgDrawer (teleport + focus trap) — we test its behavior in
// its own spec. Here we only care about the lead-specific content. The stub
// renders the slot inline and exposes the same close button so we can assert
// emit forwarding.
vi.mock('dashboard/components-next/algorythmo/AlgDrawer.vue', () => ({
  default: {
    name: 'AlgDrawer',
    props: [
      'open',
      'title',
      'closeLabel',
      'rootTestid',
      'titleTestid',
      'closeTestid',
      'rootDataset',
    ],
    emits: ['update:open', 'close'],
    template: `
      <div
        v-if="open"
        data-testid="alg-drawer-stub"
        :data-title="title"
        :data-root-testid="rootTestid"
        :data-title-testid="titleTestid"
        :data-close-testid="closeTestid"
        :data-root-lead-id="rootDataset && rootDataset['data-lead-id']"
      >
        <button
          type="button"
          data-testid="alg-drawer-close"
          :aria-label="closeLabel"
          @click="$emit('update:open', false); $emit('close')"
        />
        <slot />
      </div>
    `,
  },
}));

// Stub AlgAvatar to a deterministic shell so we can assert props without
// rendering the real gradient pipeline.
vi.mock('dashboard/components-next/algorythmo/AlgAvatar.vue', () => ({
  default: {
    name: 'AlgAvatar',
    props: ['src', 'name', 'size', 'ariaLabel'],
    template: `<span
      data-testid="alg-avatar-stub"
      :data-src="src"
      :data-name="name"
      :data-size="size"
      :aria-label="ariaLabel"
    />`,
  },
}));

// Control the composable surface from each test.
const stageHistoryState = {
  entries: ref([]),
  loading: ref(false),
  error: ref(null),
  truncated: ref(false),
  load: vi.fn(),
  reset: vi.fn(),
};

vi.mock('dashboard/composables/algorythmo/useStageHistory.js', () => ({
  useStageHistory: vi.fn(() => stageHistoryState),
}));

// Real i18n — we want to assert translated copy, not mocked keys.
const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
});

import LeadDetailDrawer from '../LeadDetailDrawer.vue';

const baseLead = (overrides = {}) => ({
  id: 42,
  name: 'Maria Santos',
  channel_origin: 'whatsapp',
  contact: {
    email: 'maria@example.com',
    phone_number: '+55 11 99999-0000',
  },
  owner: null,
  ...overrides,
});

const systemEntry = (id, overrides = {}) => ({
  id,
  from_stage_id: null,
  from_stage_name: null,
  from_stage_kind: null,
  to_stage_id: 1,
  to_stage_name: 'Novo',
  to_stage_kind: 'open',
  actor_type: 'system',
  actor_id: null,
  actor_summary: null,
  changed_at: '2026-05-24T10:00:00Z',
  ...overrides,
});

const personEntry = (id, overrides = {}) => ({
  id,
  from_stage_id: 1,
  from_stage_name: 'Novo',
  from_stage_kind: 'open',
  to_stage_id: 2,
  to_stage_name: 'Qualificado',
  to_stage_kind: 'open',
  actor_type: 'user',
  actor_id: 7,
  actor_summary: {
    id: 7,
    name: 'Carolina Lima',
    thumbnail: 'https://cdn.example/avatars/7.png',
  },
  changed_at: '2026-05-24T11:30:00Z',
  ...overrides,
});

function resetStageHistory() {
  stageHistoryState.entries.value = [];
  stageHistoryState.loading.value = false;
  stageHistoryState.error.value = null;
  stageHistoryState.truncated.value = false;
  stageHistoryState.load.mockReset();
  stageHistoryState.reset.mockReset();
}

function mountDrawer(props = {}) {
  return mount(LeadDetailDrawer, {
    props: {
      open: true,
      lead: baseLead(),
      accountId: '7',
      now: Date.parse('2026-05-24T12:00:00Z'),
      ...props,
    },
    global: {
      plugins: [i18n],
    },
  });
}

describe('LeadDetailDrawer (CONTRACT_M1B §7 v1.1.0)', () => {
  beforeEach(() => {
    resetStageHistory();
  });

  describe('lifecycle', () => {
    it('calls stageHistory.load with the lead id when opened', () => {
      mountDrawer({ open: true, lead: baseLead({ id: 91 }) });
      expect(stageHistoryState.load).toHaveBeenCalledWith(91);
    });

    it('does not load when mounted closed', () => {
      mountDrawer({ open: false });
      expect(stageHistoryState.load).not.toHaveBeenCalled();
    });

    it('resets state when the drawer is closed after being open', async () => {
      const wrapper = mountDrawer({ open: true });
      stageHistoryState.reset.mockReset();
      await wrapper.setProps({ open: false });
      expect(stageHistoryState.reset).toHaveBeenCalled();
    });

    it('reloads when the lead id changes while open', async () => {
      const wrapper = mountDrawer({ open: true, lead: baseLead({ id: 1 }) });
      stageHistoryState.load.mockReset();
      await wrapper.setProps({ lead: baseLead({ id: 2 }) });
      expect(stageHistoryState.load).toHaveBeenCalledWith(2);
    });
  });

  describe('header & title', () => {
    it('uses the lead name as drawer title', () => {
      const wrapper = mountDrawer({ lead: baseLead({ name: 'Pedro Alves' }) });
      expect(
        wrapper.find('[data-testid="alg-drawer-stub"]').attributes('data-title')
      ).toBe('Pedro Alves');
    });

    it('falls back to "Detalhes do lead" when name is missing', () => {
      const wrapper = mountDrawer({ lead: baseLead({ name: '' }) });
      expect(
        wrapper.find('[data-testid="alg-drawer-stub"]').attributes('data-title')
      ).toBe('Detalhes do lead');
    });

    it('forwards close from AlgDrawer', async () => {
      const wrapper = mountDrawer();
      await wrapper.find('[data-testid="alg-drawer-close"]').trigger('click');
      expect(wrapper.emitted('update:open')).toEqual([[false]]);
      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('forwards root/title/close testids and data-lead-id to AlgDrawer', () => {
      // Adversarial review PR #56 H1/H2 — CONTRACT_M1B §7 v1.1.0 requires
      // [data-testid="lead-detail-drawer"][data-lead-id=...] on the dialog
      // root, plus drawer-title and drawer-close on header bits.
      const wrapper = mountDrawer({ lead: baseLead({ id: 91 }) });
      const stub = wrapper.find('[data-testid="alg-drawer-stub"]');
      expect(stub.attributes('data-root-testid')).toBe('lead-detail-drawer');
      expect(stub.attributes('data-title-testid')).toBe('drawer-title');
      expect(stub.attributes('data-close-testid')).toBe('drawer-close');
      expect(stub.attributes('data-root-lead-id')).toBe('91');
    });
  });

  describe('CONTATO block', () => {
    it('renders email and phone when present', () => {
      const wrapper = mountDrawer();
      expect(wrapper.find('[data-testid="drawer-contact-email"]').text()).toBe(
        'maria@example.com'
      );
      expect(wrapper.find('[data-testid="drawer-contact-phone"]').text()).toBe(
        '+55 11 99999-0000'
      );
    });

    it('shows "não informado" when email is missing', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ contact: { phone_number: '+55 11 1' } }),
      });
      const email = wrapper.find('[data-testid="drawer-contact-email"]');
      expect(email.text()).toBe('não informado');
      expect(email.classes()).toContain('is-missing');
    });

    it('shows "não informado" when phone is missing', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ contact: { email: 'a@b.com' } }),
      });
      const phone = wrapper.find('[data-testid="drawer-contact-phone"]');
      expect(phone.text()).toBe('não informado');
      expect(phone.classes()).toContain('is-missing');
    });

    it('accepts legacy "phone" field when phone_number is absent', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ contact: { phone: '+55 21 22222-1111' } }),
      });
      expect(wrapper.find('[data-testid="drawer-contact-phone"]').text()).toBe(
        '+55 21 22222-1111'
      );
    });
  });

  describe('CANAL block', () => {
    it('renders translated channel label (whatsapp → WhatsApp)', () => {
      const wrapper = mountDrawer();
      const channel = wrapper.find('[data-testid="drawer-channel-origin"]');
      expect(channel.text()).toBe('WhatsApp');
      expect(channel.attributes('data-channel')).toBe('whatsapp');
    });

    it('normalizes Channel::WebWidget to "Chat no site"', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ channel_origin: 'Channel::WebWidget' }),
      });
      expect(wrapper.find('[data-testid="drawer-channel-origin"]').text()).toBe(
        'Chat no site'
      );
    });

    it('falls back to "Outro canal" on unknown origin', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ channel_origin: 'mystery-bus' }),
      });
      expect(wrapper.find('[data-testid="drawer-channel-origin"]').text()).toBe(
        'Outro canal'
      );
    });
  });

  describe('DONO block', () => {
    it('renders assigned owner with name and avatar', () => {
      const wrapper = mountDrawer({
        lead: baseLead({
          owner: {
            id: 11,
            name: 'Gustavo Bittencourt',
            thumbnail: 'https://cdn.example/avatars/11.png',
          },
        }),
      });
      const name = wrapper.find('[data-testid="drawer-owner-name"]');
      expect(name.text()).toBe('Gustavo Bittencourt');
      expect(name.attributes('data-owner-state')).toBe('assigned');
      const avatar = wrapper.find('[data-testid="drawer-owner-avatar"]');
      expect(avatar.attributes('data-owner-state')).toBe('assigned');
      expect(avatar.attributes('data-owner-id')).toBe('11');
      expect(
        wrapper
          .find(
            '[data-testid="drawer-owner-avatar"] [data-testid="alg-avatar-stub"]'
          )
          .attributes('data-name')
      ).toBe('Gustavo Bittencourt');
    });

    it('renders the "Sem dono" placeholder when lead.owner is null', () => {
      const wrapper = mountDrawer({ lead: baseLead({ owner: null }) });
      const name = wrapper.find('[data-testid="drawer-owner-name"]');
      expect(name.text()).toBe('Sem dono');
      expect(name.attributes('data-owner-state')).toBe('unassigned');
      const placeholder = wrapper.find(
        '[data-testid="drawer-owner-unassigned-placeholder"]'
      );
      expect(placeholder.exists()).toBe(true);
      expect(placeholder.text()).toBe(
        'Disponível — primeiro a responder vira o dono'
      );
      const avatar = wrapper.find('[data-testid="drawer-owner-avatar"]');
      expect(avatar.attributes('data-owner-state')).toBe('unassigned');
      expect(avatar.attributes('role')).toBe('img');
      expect(avatar.attributes('aria-label')).toBe(
        'Lead disponível, sem dono atribuído'
      );
    });
  });

  describe('ATIVIDADE — loading state', () => {
    it('renders skeleton rows while loading', () => {
      stageHistoryState.loading.value = true;
      const wrapper = mountDrawer();
      const loader = wrapper.find(
        '[data-testid="drawer-stage-history-loading"]'
      );
      expect(loader.exists()).toBe(true);
      expect(loader.attributes('role')).toBe('status');
      expect(loader.attributes('aria-label')).toBe(
        'Carregando atividade do lead'
      );
      expect(
        wrapper.find('[data-testid="drawer-stage-history-list"]').exists()
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="drawer-stage-history-empty"]').exists()
      ).toBe(false);
    });
  });

  describe('ATIVIDADE — error state', () => {
    it('renders error block and retry button', () => {
      stageHistoryState.error.value = 'boom';
      const wrapper = mountDrawer();
      const err = wrapper.find('[data-testid="drawer-stage-history-error"]');
      expect(err.exists()).toBe(true);
      expect(err.attributes('role')).toBe('alert');
      expect(err.text()).toContain('Não foi possível carregar a atividade');
      expect(
        wrapper.find('[data-testid="drawer-stage-history-retry"]').exists()
      ).toBe(true);
    });

    it('retry button calls stageHistory.load with the current lead id', async () => {
      stageHistoryState.error.value = 'boom';
      const wrapper = mountDrawer({ lead: baseLead({ id: 555 }) });
      stageHistoryState.load.mockReset();
      await wrapper
        .find('[data-testid="drawer-stage-history-retry"]')
        .trigger('click');
      expect(stageHistoryState.load).toHaveBeenCalledWith(555);
    });
  });

  describe('ATIVIDADE — empty state', () => {
    it('renders the empty message when entries are []', () => {
      stageHistoryState.entries.value = [];
      const wrapper = mountDrawer();
      const empty = wrapper.find('[data-testid="drawer-stage-history-empty"]');
      expect(empty.exists()).toBe(true);
      expect(empty.text()).toBe('Sem atividade registrada');
      expect(
        wrapper.find('[data-testid="drawer-stage-history-list"]').exists()
      ).toBe(false);
    });
  });

  describe('ATIVIDADE — data state', () => {
    it('renders the entries list with data-stage-history-id + data-actor-type', () => {
      stageHistoryState.entries.value = [systemEntry(1), personEntry(2)];
      const wrapper = mountDrawer();
      const list = wrapper.find('[data-testid="drawer-stage-history-list"]');
      expect(list.exists()).toBe(true);
      const items = wrapper.findAll(
        '[data-testid="drawer-stage-history-item"]'
      );
      expect(items).toHaveLength(2);
      expect(items[0].attributes('data-stage-history-id')).toBe('1');
      expect(items[0].attributes('data-actor-type')).toBe('system');
      expect(items[1].attributes('data-stage-history-id')).toBe('2');
      expect(items[1].attributes('data-actor-type')).toBe('user');
    });

    it('uses "Algorythmo" as the actor for system entries (no actor_summary)', () => {
      stageHistoryState.entries.value = [systemEntry(10)];
      const wrapper = mountDrawer();
      const item = wrapper.find('[data-testid="drawer-stage-history-item"]');
      expect(item.text()).toContain('Algorythmo criou em Novo');
    });

    it('uses actor_summary.name for person entries (user or bot)', () => {
      stageHistoryState.entries.value = [personEntry(20)];
      const wrapper = mountDrawer();
      const item = wrapper.find('[data-testid="drawer-stage-history-item"]');
      expect(item.text()).toContain('Carolina Lima moveu para Qualificado');
      // Bot and user must render identically (Manu indistinguible).
      const personAvatar = item.find('[data-testid="alg-avatar-stub"]');
      expect(personAvatar.exists()).toBe(true);
      expect(personAvatar.attributes('data-name')).toBe('Carolina Lima');
    });

    it('renders agent_bot entries with AlgAvatar (same shell as user)', () => {
      stageHistoryState.entries.value = [
        personEntry(30, { actor_type: 'agent_bot' }),
      ];
      const wrapper = mountDrawer();
      const item = wrapper.find('[data-testid="drawer-stage-history-item"]');
      expect(item.attributes('data-actor-type')).toBe('agent_bot');
      expect(item.find('[data-testid="alg-avatar-stub"]').exists()).toBe(true);
    });

    it('does not render empty/loading/error blocks when data is present', () => {
      stageHistoryState.entries.value = [systemEntry(1)];
      const wrapper = mountDrawer();
      expect(
        wrapper.find('[data-testid="drawer-stage-history-loading"]').exists()
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="drawer-stage-history-error"]').exists()
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="drawer-stage-history-empty"]').exists()
      ).toBe(false);
    });
  });

  describe('ATIVIDADE — truncated footer', () => {
    it('renders the truncated footer when truncated=true and entries exist', () => {
      stageHistoryState.entries.value = Array.from({ length: 100 }, (_, i) =>
        systemEntry(i + 1)
      );
      stageHistoryState.truncated.value = true;
      const wrapper = mountDrawer();
      const footer = wrapper.find(
        '[data-testid="drawer-stage-history-truncated"]'
      );
      expect(footer.exists()).toBe(true);
      expect(footer.text()).toBe(
        'Mostrando últimos 100 — histórico mais antigo omitido'
      );
    });

    it('does not render the footer when truncated=false', () => {
      stageHistoryState.entries.value = [systemEntry(1)];
      stageHistoryState.truncated.value = false;
      const wrapper = mountDrawer();
      expect(
        wrapper.find('[data-testid="drawer-stage-history-truncated"]').exists()
      ).toBe(false);
    });

    it('does not render the footer in empty state even if truncated flips', () => {
      stageHistoryState.entries.value = [];
      stageHistoryState.truncated.value = true;
      const wrapper = mountDrawer();
      expect(
        wrapper.find('[data-testid="drawer-stage-history-truncated"]').exists()
      ).toBe(false);
    });
  });
});
