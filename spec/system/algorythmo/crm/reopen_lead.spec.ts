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
 * Status: SCAFFOLD — all tests .skip() until Sessão C ships LeadDetailDrawer
 * (B-PR6) and B-PR1 ships the reopen endpoint.
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

const WON_LEAD = mockLead({
  id: 10,
  stageId: 4,
  channelOrigin: 'widget',
  contactName: 'Won Lead User',
  closed: true,
});

test.describe('Reopen Lead', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test.skip('"Reabrir como novo Lead" button is visible on Lead in "Fechado ganho" stage', async ({
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

    const reopenBtn = page.getByRole('button', {
      name: /reabrir como novo lead/i,
    });
    await expect(reopenBtn).toBeVisible({ timeout: 5_000 });
  });

  test.skip('"Reabrir" creates new Lead in "Novo" with previous_lead_id', async ({
    page,
  }) => {
    await mockLeads(page, [WON_LEAD]);
    await page.route(
      `**/algorythmo/api/v1/accounts/*/leads/10/reopen`,
      async route => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 11,
            stage_id: 1,
            previous_lead_id: 10,
            channel_origin: 'widget',
            channel_metadata: { name: 'Won Lead User' },
            stage_entered_at: new Date().toISOString(),
            last_message_at: new Date().toISOString(),
          }),
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
    await page.getByRole('button', { name: /reabrir como novo lead/i }).click();

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    await expect(
      novoColumn.locator('[data-testid="lead-card"][data-lead-id="11"]')
    ).toBeVisible({ timeout: 5_000 });
  });

  test.skip('"Reabrir" button is NOT visible on Lead in open stages (Novo, Qualificado, Proposta)', async ({
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

    const reopenBtn = page.getByRole('button', {
      name: /reabrir como novo lead/i,
    });
    await expect(reopenBtn).toHaveCount(0, { timeout: 3_000 });
  });
});
