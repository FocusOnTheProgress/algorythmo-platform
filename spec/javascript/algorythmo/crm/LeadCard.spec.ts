/**
 * Vitest scaffold — LeadCard.vue
 *
 * Component to be created by Sessão C at:
 *   app/javascript/dashboard/routes/dashboard/crm/views/components/LeadCard.vue
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.4
 *
 * Status: SCAFFOLD — all suites describe.skip() until component is created.
 * Fase 2: remove skip, import component, write assertions.
 */

import { describe } from 'vitest';

describe.skip('LeadCard', () => {
  describe('rendering', () => {
    // renders contact name in top-left position (D5 anatomy)
    // renders channel origin icon (widget / whatsapp / email / instagram)
    // renders LeadAgingChip with correct secondsInStage and agingCoefficient
    // renders time-in-stage label ("12 min" / "4h 2m") via formatTimeHuman
    // renders menu ⋮ trigger on hover
    // card is fully clickable (touch target ≥44px)
  });

  describe('interaction', () => {
    // click on card emits "open-drawer" event with lead id
    // menu ⋮ click opens dropdown without emitting "open-drawer"
    // Enter key on focused card emits "open-drawer"
  });

  describe('aria', () => {
    // aria-label matches format: "Lead {name}, {stage}, {timeHuman}, canal {channel}"
    // card has role="button" or tabindex="0" for keyboard focus
  });
});
