/**
 * Vitest scaffold — KanbanBoard.vue
 *
 * Component to be created by Sessão C at:
 *   app/javascript/dashboard/routes/dashboard/crm/views/components/KanbanBoard.vue
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.5
 *
 * Status: SCAFFOLD — describe.skip() until component exists.
 */

import { describe } from 'vitest';

describe.skip('KanbanBoard', () => {
  describe('rendering', () => {
    // renders 5 stage columns from pipeline data
    // renders empty state when all stages have zero leads
    // renders stage column headers with stage names
    // renders lead count badge per column
  });

  describe('drag and drop', () => {
    // onDragEnd calls useLeadStore.moveLeadOptimistic
    // successful move commits via useLeadStore.commitMove
    // failed move (5xx) calls useLeadStore.rollbackMove
    // intra-stage drag returns false (Q-B3 — no reorder within column)
  });

  describe('polling', () => {
    // starts polling on mount
    // pauses polling when document is hidden (visibilityState)
    // resumes polling when document becomes visible again
  });

  describe('aria', () => {
    // has aria-live="polite" region for move announcements
    // announces lead name + target stage after successful move
  });
});
