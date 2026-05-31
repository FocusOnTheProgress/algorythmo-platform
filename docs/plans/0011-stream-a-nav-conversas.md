# Plan 0011 — Stream A: Nav + Conversas Restructure

**Branch:** `engineer/stream-a-nav-conversas`
**PR target:** `algorythmo/cinematic-delivery`

## Scope

Three changes to the admin/owner panel nav and Conversas area.

---

## Change 1 — Remove sidebar resize affordance

**File:** `app/javascript/dashboard/components-next/sidebar/Sidebar.vue`

The resize handle `<div>` at the bottom of the template (lines 1152–1163) is removed cleanly.
The `onResizeStart / onResizeMove / onResizeEnd / onResizeHandleDoubleClick` handler functions
and `isResizing / startX / startWidth` refs are also removed.
The four `useEventListener` calls that attach mouse/touch events to `document` are removed.
The `transition-[width]` class that animates resize is removed from the aside class bindings;
the `md:transition-[width]` reference was gated on `!isResizing` so the condition becomes irrelevant.

`useSidebarResize` still lives in `provider.js` and continues to power the
collapsed / expanded binary states — those remain intact. The sidebar keeps its
two-state behaviour (64px collapsed, 200px expanded); users just can no longer
drag it to an arbitrary width.

The `isResizing` ref is still provided to `provideSidebarContext` because child components
may reference it; it is kept but permanently `false` (no drag can set it `true`).

No cut-flag needed: this is a pure removal of an affordance, not a feature with a revert path.

---

## Change 2 — Move "Caixa de entrada" out of sidebar into Conversas

**File:** `app/javascript/dashboard/components-next/sidebar/Sidebar.vue`

The `Inbox` top-level entry (name: `'Inbox'`, route `inbox_view`) is removed from the
`menuItems` computed array.

The inbox entry is re-surfaced as a child inside the `Conversation` group (change 3 below).

The `getterKeys.count` driven by `notifications/getUnreadCount` will be preserved on the
new child entry so the badge still shows notification count.

No cut-flag: this is a positional move, not a conditional removal.

---

## Change 3 — Restructure Conversas tabs

**File:** `app/javascript/dashboard/components-next/sidebar/Sidebar.vue`

Inside the `Conversation` group, the children array is restructured:

**Removed children:**
- `Mentions` (route `conversation_mentions`)
- `Participating` (route `conversation_participating`)
- `Unattended` (route `conversation_unattended`)

**New children (two only):**
1. `Operação ao vivo` — maps to `home` / `inbox_conversation` (what was "All Conversations").
   This is the read-only aquarium view. The reply box must not be accessible here.
2. `Caixa de entrada` — maps to `inbox_view` / `inbox_view_conversation` (CEO personal inbox,
   moved from Change 2).

**i18n keys added to engine overrides (`en.json` + `pt_BR.json`):**
- `SIDEBAR.ALG_CONV_OPERACAO_AO_VIVO` — "Live Operation" / "Operação ao vivo"
- `SIDEBAR.ALG_CONV_CAIXA_DE_ENTRADA` — "Inbox" / "Caixa de entrada"

---

## Change 3b — Block reply box on "Operação ao vivo"

The reply box must be unreachable from the Operação ao vivo view.

**Approach:** Pass a route-level `readOnly` prop down through the component chain.
`ConversationView.vue` already receives props from the route. We add an `isReadOnly` prop
and pass it down to `ConversationBox`, which passes it to `MessagesView`. `MessagesView`
already controls whether `ReplyBox` is mounted via `ResizableEditorWrapper`. When
`isReadOnly` is `true`, that entire section is not rendered.

The `home` and `inbox_conversation` routes pass `isReadOnly: true` only when routed
from the "Operação ao vivo" context. Because the same routes are used for all "all conversations"
views, the cleanest approach is NOT to change the route itself but to add a dedicated
**read-only flag** to the Operação ao vivo sidebar entry via a route param or query, and
read it in `ConversationView`.

**Revised approach (simpler, lower surface area):** Use a named route alias approach.
Add two new routes:
- `alg_operacao_ao_vivo` → same component as `home`, but with prop `isReadOnly: true`
- `alg_operacao_ao_vivo_conversation` → same as `inbox_conversation` + `isReadOnly: true`

The sidebar entry points to `alg_operacao_ao_vivo`. `ConversationView` is updated to accept
`isReadOnly` prop. `ConversationBox` + `MessagesView` respect it (no `ReplyBox` rendered).

This keeps existing routes clean (agents still go to `home` and see the reply box),
and only the CEO's admin view suppresses replies.

---

## Files changed summary

| File | Change |
|------|--------|
| `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` | Remove resize handle, restructure Conversation children, remove Inbox entry |
| `app/javascript/dashboard/routes/dashboard/conversation/conversation.routes.js` | Add two read-only route aliases |
| `app/javascript/dashboard/routes/dashboard/conversation/ConversationView.vue` | Accept `isReadOnly` prop, pass to ConversationBox |
| `app/javascript/dashboard/components/widgets/conversation/ConversationBox.vue` | Accept + pass `isReadOnly` to MessagesView |
| `app/javascript/dashboard/components/widgets/conversation/MessagesView.vue` | Gate `ReplyBox` on `isReadOnly` |
| `engines/algorythmo/app/javascript/i18n/overrides/en.json` | Add 2 i18n keys |
| `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json` | Add 2 i18n keys |

New spec: `app/javascript/dashboard/components-next/sidebar/specs/SidebarStreamAConversas.spec.js`
Registered in: `.github/workflows/run_foss_spec.yml`

---

## Definition of done

- Resize handle div and all its event handlers gone from `Sidebar.vue`.
- Inbox entry absent from top-level sidebar.
- Conversation group has exactly: Operação ao vivo + Caixa de entrada + Folders/Teams/Channels/Labels.
- `alg_operacao_ao_vivo` route renders ConversationView with reply box absent.
- `inbox_view` (Caixa de entrada) works as before.
- ESLint passes on changed files.
- New spec registered and passes.
