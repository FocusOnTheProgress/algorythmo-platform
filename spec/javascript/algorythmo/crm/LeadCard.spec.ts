/**
 * Vitest scaffold — LeadCard.vue
 *
 * Component to be created by Sessão C at:
 *   app/javascript/dashboard/routes/dashboard/crm/views/components/LeadCard.vue
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.4
 *
 * Status: SCAFFOLD — it.todo() items appear as "pending" in Vitest reports
 * and force action when the component lands. Replace with real tests in Fase 2.
 */

import { describe, it } from 'vitest';

describe('LeadCard', () => {
  describe('rendering', () => {
    it.todo('renders contact name in top-left position (D5 anatomy)');
    it.todo('renders channel origin icon (widget / whatsapp / email / instagram)');
    it.todo('renders LeadAgingChip with correct secondsInStage and agingCoefficient');
    it.todo('renders time-in-stage label ("12 min" / "4h 2m") via formatTimeHuman');
    it.todo('renders menu ⋮ trigger on hover');
    it.todo('card touch target is ≥44px tall');
  });

  describe('interaction', () => {
    it.todo('click on card emits "open-drawer" event with lead id');
    it.todo('menu ⋮ click opens dropdown without emitting "open-drawer"');
    it.todo('Enter key on focused card emits "open-drawer"');
  });

  describe('aria', () => {
    it.todo('aria-label matches format: "Lead {name}, {stage}, {timeHuman}, canal {channel}"');
    it.todo('card has role="button" or tabindex="0" for keyboard focus');
  });
});
