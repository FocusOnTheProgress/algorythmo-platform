/**
 * Reopen Lead — closed Lead back to "Novo"
 *
 * Validates that a Lead in "Fechado ganho" or "Fechado perdido" can be
 * reopened, creating a new Lead in "Novo" with `previous_lead_id` set.
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Stage columns: [data-testid="stage-column"][data-stage-id].
 *     Won stage: data-stage-id="4" (kind="won").
 *     Open "Novo": data-stage-id="1" (kind="open").
 *   - Lead cards:    [data-testid="lead-card"][data-lead-id].
 *
 * Status: SKIPPED — blocked-on PR 4 (LeadDetailDrawer wire). The
 *   "Reabrir como novo Lead" button lives inside the drawer footer, and
 *   the drawer is not in main yet (card click fires a toast). Un-skip
 *   in the follow-up commit on this branch after PR 4 merges, alongside
 *   owner_assignment and stage_history_drawer specs.
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  mockLead,
  mockDefaultPipeline,
  mockLeads,
  TEST_ACCOUNT_ID,
} from './_fixture';

// pt_BR copy of ALGORYTHMO_CRM.LEAD_DRAWER.REOPEN_BUTTON. Extracted as a
// single const so an i18n rename touches one place only.
const REOPEN_BUTTON_REGEX = /reabrir como novo lead/i;

const WON_LEAD = mockLead({
  id: 10,
  stageId: 4,
  channelOrigin: 'widget',
  contactName: 'Won Lead User',
  closed: true,
});

// Reopened lead — id=11 in Novo (stage_id=1) with previous_lead_id=10.
// Used in BOTH the POST response AND the post-reopen leads list so that
// either C.2 implementation strategy works (push-into-state OR refetch).
const REOPENED_LEAD = mockLead({
  id: 11,
  stageId: 1,
  channelOrigin: 'widget',
  contactName: 'Won Lead User',
});

test.describe.skip('Reopen Lead', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test('"Reabrir como novo Lead" button is visible on Lead in "Fechado ganho" stage', async ({
    page,
  }) => {
    await mockLeads(page, [WON_LEAD]);

    await goToCrm(page);

    const wonColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="4"]'
    );
    await wonColumn
      .locator('[data-testid="lead-card"][data-lead-id="10"]')
      .click();

    const reopenBtn = page.getByRole('button', { name: REOPEN_BUTTON_REGEX });
    await expect(reopenBtn).toBeVisible({ timeout: 5_000 });
  });

  test('"Reabrir" creates new Lead in "Novo" with previous_lead_id', async ({
    page,
  }) => {
    await mockLeads(page, [WON_LEAD]);
    await page.route(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads/10/reopen`,
      async route => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ...REOPENED_LEAD, previous_lead_id: 10 }),
        });
      }
    );

    await goToCrm(page);

    const wonColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="4"]'
    );
    await wonColumn
      .locator('[data-testid="lead-card"][data-lead-id="10"]')
      .click();

    // After reopen, C.2 may either push the response into local state OR
    // re-fetch /leads?stage_id=1. Re-register mockLeads so the second path
    // also returns the new lead — otherwise the assertion is impl-coupled.
    await page.unroute(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`
    );
    await mockLeads(page, [WON_LEAD, REOPENED_LEAD]);

    await page.getByRole('button', { name: REOPEN_BUTTON_REGEX }).click();

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    await expect(
      novoColumn.locator('[data-testid="lead-card"][data-lead-id="11"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test('"Reabrir" button is NOT visible on Lead in open stages (Novo, Qualificado, Proposta)', async ({
    page,
  }) => {
    const openLead = mockLead({
      id: 12,
      stageId: 1,
      channelOrigin: 'widget',
      contactName: 'Still Open',
    });
    await mockLeads(page, [openLead]);

    await goToCrm(page);

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    const card = novoColumn.locator(
      '[data-testid="lead-card"][data-lead-id="12"]'
    );
    await card.click();

    const reopenBtn = page.getByRole('button', { name: REOPEN_BUTTON_REGEX });
    await expect(reopenBtn).toHaveCount(0, { timeout: 3_000 });
  });
});
