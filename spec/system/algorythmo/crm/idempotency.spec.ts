/**
 * Lead idempotency — second message from same contact does NOT create a new Lead
 *
 * Validates D6 idempotency rule: if a contact already has an open Lead,
 * subsequent messages on the same channel do not create a duplicate.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 D6 (auto-create idempotente)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §1.1 "Mensagens subsequentes em
 *     Lead aberto não criam novo"
 *
 * Status: SCAFFOLD — tests .skip() until:
 *   - B-PR1 ships the backend listener + idempotency guard.
 *   - B-PR5 ships the polling infrastructure for the Kanban to observe counts.
 *   - _fixture.ts seedLeads helper is implemented.
 */

import { test, expect, loginAsAdmin, goToCrm } from './_fixture';

test.describe('Lead Idempotency', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip(
    'polling upsert does not duplicate a Lead already in the Kanban (client-side dedup)',
    async ({ page }) => {
      // This test validates useLeadStore.upsertLeads() client-side dedup logic:
      // when polling returns the same lead ID already rendered, the count stays 1.
      //
      // Server-side idempotency (CrmListener not creating duplicate leads) is
      // covered by RSpec at engines/algorythmo/spec/algorythmo/crm_listener_spec.rb.
      let callCount = 0;
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        callCount++;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            // Always return exactly 1 lead for stage_id=1, regardless of call count
            leads: [
              {
                id: 20,
                stage_id: 1,
                contact_id: 99,
                channel_origin: 'whatsapp',
                channel_metadata: { name: 'Repeated Contact', handle: '+5511888888888' },
                contact: { id: 99, name: 'Repeated Contact', email: null, phone_number: '+5511888888888', thumbnail: null },
                stage_entered_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
              },
            ],
            next_cursor: null,
          }),
        });
      });

      await goToCrm(page);

      // Wait for initial render
      const novoColumn = page.locator('[data-stage-kind="new"]');
      await expect(novoColumn.locator('[data-lead-id]')).toHaveCount(1, {
        timeout: 10_000,
      });

      // Simulate second message arriving (via polling — mock unchanged data)
      // Wait >8s for polling tick
      await page.waitForTimeout(9_000);

      // Lead count must remain exactly 1 (idempotent)
      await expect(novoColumn.locator('[data-lead-id]')).toHaveCount(1);
    }
  );

  test.skip(
    'contact with closed Lead gets a NEW Lead on new message (reopen flow)',
    async ({ page }) => {
      // After a lead is won/lost, a new message from the same contact
      // should create a NEW lead (previous_lead_id set to the closed one).
      // This tests the boundary: idempotency applies only to OPEN leads.
      await goToCrm(page);

      // This scenario is tested more thoroughly in reopen_lead.spec.ts
      // and by the backend CrmListener spec.
      // Here we just validate the Kanban reflects the new lead.
      const novoColumn = page.locator('[data-stage-kind="new"]');
      await expect(novoColumn).toBeVisible();
    }
  );
});
