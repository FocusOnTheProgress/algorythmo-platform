/**
 * Reopen Lead — closed Lead back to "Novo"
 *
 * Validates that a Lead in "Fechado ganho" or "Fechado perdido" can be
 * reopened, creating a new Lead in "Novo" with `previous_lead_id` set.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 8 (reopen)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14 cenário 7
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.7 (LeadDetailDrawer reopen button)
 *
 * Status: SCAFFOLD — all tests .skip() until Sessão C ships LeadDetailDrawer
 * (B-PR6) and B-PR1 ships the reopen endpoint.
 */

import { test, expect, loginAsAdmin, goToCrm } from './_fixture';

test.describe('Reopen Lead', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip(
    '"Reabrir como novo Lead" button is visible on Lead in "Fechado ganho" stage',
    async ({ page }) => {
      // Arrange: mock a won lead
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        const url = route.request().url();
        if (url.includes('stage_id')) {
          const stageId = new URL(url).searchParams.get('stage_id');
          const isWon = stageId === '4';
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              leads: isWon
                ? [
                    {
                      id: 10,
                      stage_id: 4,
                      channel_origin: 'widget',
                      channel_metadata: { name: 'Won Lead User' },
                      stage_entered_at: new Date().toISOString(),
                      closed_at: new Date().toISOString(),
                      last_message_at: new Date().toISOString(),
                    },
                  ]
                : [],
              next_cursor: null,
            }),
          });
        } else {
          await route.continue();
        }
      });

      await goToCrm(page);

      // Open the drawer for the won lead
      const wonColumn = page.locator('[data-stage-kind="won"]');
      await wonColumn.locator('[data-lead-id="10"]').click();

      // Reopen button must be visible in the drawer
      const reopenBtn = page.getByRole('button', { name: /reabrir como novo lead/i });
      await expect(reopenBtn).toBeVisible({ timeout: 5_000 });
    }
  );

  test.skip(
    '"Reabrir" creates new Lead in "Novo" with previous_lead_id',
    async ({ page }) => {
      await page.route(`**/algorythmo/api/v1/accounts/*/leads/10/reopen`, async (route) => {
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
      });

      await goToCrm(page);

      const wonColumn = page.locator('[data-stage-kind="won"]');
      await wonColumn.locator('[data-lead-id="10"]').click();
      await page.getByRole('button', { name: /reabrir como novo lead/i }).click();

      // New lead must appear in "Novo" column
      const novoColumn = page.locator('[data-stage-kind="new"]');
      await expect(novoColumn.locator('[data-lead-id="11"]')).toBeVisible({
        timeout: 5_000,
      });
    }
  );

  test.skip(
    '"Reabrir" button is NOT visible on Lead in open stages (Novo, Qualificado, Proposta)',
    async ({ page }) => {
      await goToCrm(page);

      const novoColumn = page.locator('[data-stage-kind="new"]');
      const firstCard = novoColumn.locator('[data-lead-id]').first();
      await firstCard.click();

      // Reopen must not appear for non-closed leads
      const reopenBtn = page.getByRole('button', { name: /reabrir como novo lead/i });
      await expect(reopenBtn).toHaveCount(0, { timeout: 3_000 });
    }
  );
});
