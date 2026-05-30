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
    // Renders both the default slot (body) and the named "footer" slot so the
    // round-3 "Ver conversa" CTA (which lives in the footer) is testable here.
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
        <div data-testid="alg-drawer-footer-stub"><slot name="footer" /></div>
      </div>
    `,
  },
}));

// Router mock — the drawer's "Ver conversa" CTA calls router.push. We capture
// the call to assert the route name + params without a real router.
const routerPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
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
    routerPush.mockReset();
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

  // -------------------------------------------------------------------------
  // Round-3 — full lead profile
  // -------------------------------------------------------------------------
  describe('IDENTITY + profile blocks (round-3)', () => {
    it('renders company · role under the name when present', () => {
      const wrapper = mountDrawer({
        lead: baseLead({ company: 'Nimbus Co.', role: 'Gerente' }),
      });
      const meta = wrapper.find('[data-testid="drawer-identity-meta"]');
      expect(meta.exists()).toBe(true);
      expect(meta.text()).toContain('Gerente');
      expect(meta.text()).toContain('Nimbus Co.');
    });

    it('renders RESUMO when summary is present and omits it otherwise', () => {
      const withSummary = mountDrawer({
        lead: baseLead({ summary: 'Cliente quente, fechar este mês.' }),
      });
      expect(
        withSummary.find('[data-testid="drawer-summary-text"]').text()
      ).toBe('Cliente quente, fechar este mês.');

      const without = mountDrawer({ lead: baseLead() });
      expect(
        without.find('[data-testid="drawer-summary-block"]').exists()
      ).toBe(false);
    });

    it('renders the QUALIFICAÇÃO pairs when provided', () => {
      const wrapper = mountDrawer({
        lead: baseLead({
          qualification: [
            { label: 'Orçamento', value: 'Aprovado' },
            { label: 'Prazo', value: 'Este mês' },
          ],
        }),
      });
      const block = wrapper.find('[data-testid="drawer-qualification-block"]');
      expect(block.exists()).toBe(true);
      expect(block.text()).toContain('Orçamento');
      expect(block.text()).toContain('Aprovado');
      expect(block.text()).toContain('Prazo');
    });

    it('renders SOCIAL links with target=_blank + rel noopener', () => {
      const wrapper = mountDrawer({
        lead: baseLead({
          social: [
            {
              platform: 'instagram',
              handle: '@maria',
              url: 'https://instagram.com/maria',
            },
          ],
        }),
      });
      const links = wrapper.find('[data-testid="drawer-social-links"]');
      expect(links.exists()).toBe(true);
      const anchor = links.find('a');
      expect(anchor.attributes('href')).toBe('https://instagram.com/maria');
      expect(anchor.attributes('target')).toBe('_blank');
      expect(anchor.attributes('rel')).toContain('noopener');
    });

    it('omits the SOCIAL block when there are no social links', () => {
      const wrapper = mountDrawer({ lead: baseLead({ social: [] }) });
      expect(wrapper.find('[data-testid="drawer-social-block"]').exists()).toBe(
        false
      );
    });
  });

  describe('CANAIS block (multi-channel, round-3)', () => {
    it('lists every reachable channel from lead.channels[]', () => {
      const wrapper = mountDrawer({
        lead: baseLead({
          channels: [
            { origin: 'whatsapp', handle: '+55 11 90000-0000' },
            { origin: 'email', handle: 'maria@example.com' },
          ],
        }),
      });
      const rows = wrapper
        .find('[data-testid="drawer-channels"]')
        .findAll('.alg-lead-drawer__channel-row');
      expect(rows).toHaveLength(2);
      expect(rows[0].text()).toContain('WhatsApp');
      expect(rows[0].text()).toContain('+55 11 90000-0000');
      // pt_BR label for the email channel is "E-mail".
      expect(rows[1].text()).toContain('E-mail');
    });

    it('falls back to a single channel derived from channel_origin', () => {
      // baseLead has channel_origin but no channels[] — the CANAIS block must
      // still show the inbound channel (keeps the legacy drawer-channel-origin
      // contract intact).
      const wrapper = mountDrawer();
      const origin = wrapper.find('[data-testid="drawer-channel-origin"]');
      expect(origin.exists()).toBe(true);
      expect(origin.text()).toBe('WhatsApp');
      expect(origin.attributes('data-channel')).toBe('whatsapp');
    });
  });

  describe('ATIVIDADE — inline demo timeline (round-3)', () => {
    it('renders lead.timeline directly and ignores the fetched history', () => {
      // Even with the composable in an error state, an inline timeline wins and
      // the network error block must not show.
      stageHistoryState.error.value = 'boom';
      const wrapper = mountDrawer({
        lead: baseLead({
          timeline: [
            {
              id: 't1',
              from_stage_id: null,
              from_stage_name: null,
              from_stage_kind: null,
              to_stage_id: 1,
              to_stage_name: 'Novo',
              to_stage_kind: 'open',
              actor_type: 'system',
              actor_summary: null,
              changed_at: '2026-05-24T10:00:00Z',
            },
          ],
        }),
      });
      const list = wrapper.find('[data-testid="drawer-stage-history-list"]');
      expect(list.exists()).toBe(true);
      expect(
        wrapper.find('[data-testid="drawer-stage-history-error"]').exists()
      ).toBe(false);
      expect(
        wrapper.find('[data-testid="drawer-stage-history-item"]').text()
      ).toContain('Algorythmo criou em Novo');
    });
  });

  describe('Ver conversa CTA (round-3)', () => {
    it('routes to the inbox conversation with accountId + conversation_id', async () => {
      const wrapper = mountDrawer({
        lead: baseLead({ conversation_id: 90123 }),
        accountId: '7',
      });
      const cta = wrapper.find('[data-testid="drawer-open-conversation"]');
      expect(cta.exists()).toBe(true);
      expect(cta.attributes('disabled')).toBeUndefined();
      await cta.trigger('click');
      expect(routerPush).toHaveBeenCalledWith({
        name: 'inbox_conversation',
        params: { accountId: '7', conversation_id: 90123 },
      });
    });

    it('stays enabled and falls back to the conversations view when conversation_id is absent', async () => {
      // C3: the action is never dead. With no concrete thread linked yet (live
      // leads pre lead→conversation join), it routes to the conversations view
      // instead of disabling. See TODO(lead-linkage) in the component.
      const wrapper = mountDrawer({ lead: baseLead(), accountId: '7' });
      const cta = wrapper.find('[data-testid="drawer-open-conversation"]');
      expect(cta.attributes('disabled')).toBeUndefined();
      expect(cta.attributes('data-has-conversation')).toBe('false');
      await cta.trigger('click');
      expect(routerPush).toHaveBeenCalledWith({
        name: 'home',
        params: { accountId: '7' },
      });
    });
  });

  // -------------------------------------------------------------------------
  // Round-4 (C2) — lead-intelligence shell (future lead-nurturing agent)
  // -------------------------------------------------------------------------
  describe('INTELIGÊNCIA DO LEAD block (C2)', () => {
    it('always renders the intelligence block (shell present even with no data)', () => {
      const wrapper = mountDrawer({ lead: baseLead() });
      const block = wrapper.find('[data-testid="drawer-intelligence-block"]');
      expect(block.exists()).toBe(true);
      // No intelligence data → the pending/empty copy stands in.
      expect(
        wrapper.find('[data-testid="drawer-intelligence-empty"]').exists()
      ).toBe(true);
      expect(
        wrapper.find('[data-testid="drawer-intelligence-research"]').exists()
      ).toBe(false);
    });

    it('renders research findings and conversation memory when provided', () => {
      const wrapper = mountDrawer({
        lead: baseLead({
          intelligence: {
            research: [
              { source: 'linkedin', text: 'Sócia há 12 anos.' },
              { source: 'web', text: 'Citada em matéria regional.' },
            ],
            memory: ['Orçamento aprovado.', 'Decisora final.'],
          },
        }),
      });
      const research = wrapper.find(
        '[data-testid="drawer-intelligence-research"]'
      );
      const memory = wrapper.find('[data-testid="drawer-intelligence-memory"]');
      expect(research.exists()).toBe(true);
      expect(research.text()).toContain('Sócia há 12 anos.');
      expect(research.text()).toContain('Citada em matéria regional.');
      expect(memory.exists()).toBe(true);
      expect(memory.text()).toContain('Orçamento aprovado.');
      expect(memory.text()).toContain('Decisora final.');
      expect(
        wrapper.find('[data-testid="drawer-intelligence-empty"]').exists()
      ).toBe(false);
    });
  });
});
