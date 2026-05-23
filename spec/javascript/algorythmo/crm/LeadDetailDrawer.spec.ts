/**
 * Vitest scaffold — LeadDetailDrawer.vue
 *
 * Component to be created by Sessão C at:
 *   app/javascript/dashboard/routes/dashboard/crm/views/components/LeadDetailDrawer.vue
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.7
 *
 * Status: SCAFFOLD — it.todo() items appear as pending in Vitest reports.
 * Replace with real tests in Fase 2 once component exists.
 */

import { describe, it } from 'vitest';

describe('LeadDetailDrawer', () => {
  describe('rendering', () => {
    it.todo('renders lead name as heading (aria-labelledby target)');
    it.todo('renders contact info: email, phone');
    it.todo('renders channel origin with icon');
    it.todo('renders stage history (stage name + entered_at timestamp per entry)');
    it.todo('renders linked conversation with link');
    it.todo('renders editable notes field');
    it.todo('renders "Reabrir como novo Lead" button when stage is won or lost');
    it.todo('does NOT render "Reabrir" button when stage is open (new/qualified/proposal)');
  });

  describe('interaction', () => {
    it.todo('Esc key closes drawer and emits "close" event');
    it.todo('scrim click closes drawer');
    it.todo('notes field edit triggers PATCH /leads/:id on blur');
    it.todo('"Reabrir" button triggers POST /leads/:id/reopen');
    it.todo('conversations list shows "Ver mais" button when next_cursor is non-null');
  });

  describe('focus trap', () => {
    it.todo('focus is trapped inside drawer (Tab does not escape)');
    it.todo('first focusable element receives focus on open');
    it.todo('focus returns to trigger element on close');
  });

  describe('aria', () => {
    it.todo('has role="dialog" and aria-modal="true"');
    it.todo('aria-labelledby points to the heading with lead name');
  });
});
