// algorythmo: stream-a — Nav + Conversas restructure spec.
//
// Verifies via static source analysis:
// 1. The sidebar resize handle is absent from Sidebar.vue.
// 2. The top-level "Inbox" entry is absent from Sidebar.vue.
// 3. The Conversation group contains exactly the two primary
//    desdobramentos: OperacaoAoVivo + CaixaDeEntrada.
// 4. Mentions / Participating / Unattended children are gone.
// 5. ConversationView accepts an isReadOnly prop.
// 6. MessagesView gates the ReplyBox on isReadOnly.
// 7. The two new read-only routes exist in conversation.routes.js.

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_PATH = path.resolve(__dirname, '..', 'Sidebar.vue');
const CONVERSATION_VIEW_PATH = path.resolve(
  __dirname,
  '../../../../../routes/dashboard/conversation/ConversationView.vue'
);
const MESSAGES_VIEW_PATH = path.resolve(
  __dirname,
  '../../../../../components/widgets/conversation/MessagesView.vue'
);
const CONVERSATION_BOX_PATH = path.resolve(
  __dirname,
  '../../../../../components/widgets/conversation/ConversationBox.vue'
);
const CONVERSATION_ROUTES_PATH = path.resolve(
  __dirname,
  '../../../../../routes/dashboard/conversation/conversation.routes.js'
);

const sidebarSource = fs.readFileSync(SIDEBAR_PATH, 'utf8');
const convViewSource = fs.readFileSync(CONVERSATION_VIEW_PATH, 'utf8');
const messagesViewSource = fs.readFileSync(MESSAGES_VIEW_PATH, 'utf8');
const convBoxSource = fs.readFileSync(CONVERSATION_BOX_PATH, 'utf8');
const routesSource = fs.readFileSync(CONVERSATION_ROUTES_PATH, 'utf8');

// Extract only the <template> block of the sidebar
const sidebarTemplateStart = sidebarSource.indexOf('<template>');
const sidebarTemplate =
  sidebarTemplateStart >= 0
    ? sidebarSource.slice(sidebarTemplateStart)
    : sidebarSource;

describe('stream-a: sidebar resize handle removed', () => {
  it('does not contain the resize handle div with cursor-col-resize', () => {
    expect(sidebarTemplate).not.toContain('cursor-col-resize');
  });

  it('does not attach onResizeStart handler', () => {
    expect(sidebarSource).not.toContain('onResizeStart');
  });

  it('does not import useEventListener from @vueuse/core', () => {
    expect(sidebarSource).not.toContain('useEventListener');
  });

  it('does not use isRTL (only used in resize delta calc)', () => {
    expect(sidebarSource).not.toContain("'accounts/isRTL'");
  });
});

describe('stream-a: top-level Inbox entry removed from sidebar', () => {
  it('does not have a standalone Inbox top-level entry with inbox_view route', () => {
    // The old pattern was: name: 'Inbox' ... to: accountScopedRoute('inbox_view')
    // as a direct child of menuItems (not nested inside Conversation children).
    // The inbox_view route is now nested inside the Conversation group.
    //
    // We verify the absence of the standalone name:'Inbox' block by checking
    // that 'Inbox' as a name key does not appear outside the Conversation block.
    // The simplest proxy: 'name: \'Inbox\'' (top-level form) is gone.
    // The new child inside Conversation uses name: 'CaixaDeEntrada'.
    expect(sidebarSource).not.toContain("name: 'Inbox'");
  });
});

describe('stream-a: Conversas restructure', () => {
  it('contains OperacaoAoVivo child inside Conversation group', () => {
    expect(sidebarSource).toContain("name: 'OperacaoAoVivo'");
  });

  it('contains CaixaDeEntrada child inside Conversation group', () => {
    expect(sidebarSource).toContain("name: 'CaixaDeEntrada'");
  });

  it('OperacaoAoVivo routes to alg_operacao_ao_vivo', () => {
    expect(sidebarSource).toContain("accountScopedRoute('alg_operacao_ao_vivo')");
  });

  it('CaixaDeEntrada routes to inbox_view', () => {
    expect(sidebarSource).toContain("accountScopedRoute('inbox_view')");
  });

  it('Mentions child is absent', () => {
    expect(sidebarSource).not.toContain("name: 'Mentions'");
  });

  it('Participating child is absent', () => {
    expect(sidebarSource).not.toContain("name: 'Participating'");
  });

  it('Unattended child is absent', () => {
    expect(sidebarSource).not.toContain("name: 'Unattended'");
  });

  it('uses the new i18n keys for the two primary desdobramentos', () => {
    expect(sidebarSource).toContain('SIDEBAR.ALG_CONV_OPERACAO_AO_VIVO');
    expect(sidebarSource).toContain('SIDEBAR.ALG_CONV_CAIXA_DE_ENTRADA');
  });
});

describe('stream-a: read-only routes exist', () => {
  it('alg_operacao_ao_vivo route is defined', () => {
    expect(routesSource).toContain("name: 'alg_operacao_ao_vivo'");
  });

  it('alg_operacao_ao_vivo_conversation route is defined', () => {
    expect(routesSource).toContain("name: 'alg_operacao_ao_vivo_conversation'");
  });

  it('operacao-ao-vivo path exists in routes', () => {
    expect(routesSource).toContain('operacao-ao-vivo');
  });

  it('alg_operacao_ao_vivo route passes isReadOnly: true', () => {
    expect(routesSource).toContain('isReadOnly: true');
  });
});

describe('stream-a: ConversationView accepts isReadOnly prop', () => {
  it('declares isReadOnly prop', () => {
    expect(convViewSource).toContain('isReadOnly');
  });

  it('passes is-read-only to ConversationBox', () => {
    expect(convViewSource).toContain(':is-read-only="isReadOnly"');
  });
});

describe('stream-a: ConversationBox propagates isReadOnly', () => {
  it('declares isReadOnly prop', () => {
    expect(convBoxSource).toContain('isReadOnly');
  });

  it('passes is-read-only to MessagesView', () => {
    expect(convBoxSource).toContain(':is-read-only="isReadOnly"');
  });
});

describe('stream-a: MessagesView gates ReplyBox on isReadOnly', () => {
  it('declares isReadOnly prop', () => {
    expect(messagesViewSource).toContain('isReadOnly');
  });

  it('wraps the reply box section with v-if="!isReadOnly"', () => {
    expect(messagesViewSource).toContain('v-if="!isReadOnly"');
  });

  it('ReplyBox is inside the gated section (not standalone)', () => {
    // The ReplyBox component tag must appear after the v-if="!isReadOnly" guard.
    const gateIdx = messagesViewSource.indexOf('v-if="!isReadOnly"');
    const replyBoxIdx = messagesViewSource.indexOf('<ReplyBox', gateIdx);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(replyBoxIdx).toBeGreaterThan(gateIdx);
  });
});
