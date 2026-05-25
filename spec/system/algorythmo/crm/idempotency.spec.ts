/**
 * Lead idempotency — second message from same contact does NOT create a new Lead
 *
 * Validates D6 idempotency rule: if a contact already has an open Lead,
 * subsequent messages on the same channel do not create a duplicate.
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Stage columns: [data-testid="stage-column"][data-stage-id].
 *   - Lead cards:    [data-testid="lead-card"][data-lead-id].
 *
 * Status: LIVE (un-skipped in M1-C/PR5).
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  mockLead,
  mockDefaultPipeline,
  mockLeads,
} from './_fixture';

test.describe('Lead Idempotency', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test('polling upsert does not duplicate a Lead already in the Kanban (client-side dedup)', async ({
    page,
  }) => {
    // Validates useLeadStore.upsertLeads() client-side dedup: polling that
    // returns the same lead ID twice does not double the card count.
    // Server-side idempotency is covered in
    // engines/algorythmo/spec/algorythmo/crm_listener_spec.rb.
    const repeated = mockLead({
      id: 20,
      stageId: 1,
      channelOrigin: 'whatsapp',
      contactName: 'Repeated Contact',
      channelHandle: '+5511888888888',
    });
    await mockLeads(page, [repeated]);

    await goToCrm(page);

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    await expect(novoColumn.locator('[data-testid="lead-card"]')).toHaveCount(
      1,
      { timeout: 10_000 }
    );

    // Wait past the 8s polling interval — the mock keeps returning the
    // same lead; the card count must not climb.
    await page.waitForTimeout(9_000);

    await expect(novoColumn.locator('[data-testid="lead-card"]')).toHaveCount(
      1
    );
  });

  test('contact with closed Lead gets a NEW Lead on new message (reopen flow)', async ({
    page,
  }) => {
    // After a lead is won/lost, a new message from the same contact creates
    // a NEW lead (previous_lead_id set to the closed one). Idempotency
    // applies only to OPEN leads. The full reopen path is in
    // reopen_lead.spec.ts; here we just sanity-check the Kanban is reachable.
    await mockLeads(page, []);
    await goToCrm(page);

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    await expect(novoColumn).toBeVisible();
  });
});
