/**
 * Vitest scaffold — LeadDetailDrawer.vue
 *
 * Component to be created by Sessão C at:
 *   app/javascript/dashboard/routes/dashboard/crm/views/components/LeadDetailDrawer.vue
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.7
 *
 * Status: SCAFFOLD — describe.skip() until component exists.
 */

import { describe } from 'vitest';

describe.skip('LeadDetailDrawer', () => {
  describe('rendering', () => {
    // renders lead name as heading (aria-labelledby target)
    // renders contact info: email, phone
    // renders channel origin with icon
    // renders stage history (stage name + entered_at timestamp per entry)
    // renders linked conversation with link
    // renders editable notes field
    // renders "Reabrir como novo Lead" button when stage is won or lost
    // does NOT render "Reabrir" button when stage is open (new/qualified/proposal)
  });

  describe('interaction', () => {
    // Esc key closes drawer and emits "close" event
    // scrim click closes drawer
    // notes field edit triggers PATCH /leads/:id on blur
    // "Reabrir" button triggers POST /leads/:id/reopen
    // conversations list shows "Ver mais" button when next_cursor is non-null
  });

  describe('focus trap', () => {
    // focus is trapped inside drawer (Tab does not escape)
    // first focusable element receives focus on open
    // focus returns to trigger element on close
  });

  describe('aria', () => {
    // has role="dialog" and aria-modal="true"
    // aria-labelledby points to the heading with lead name
  });
});
