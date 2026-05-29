/**
 * Empty state — first access with no Leads
 *
 * Validates against CONTRACT_M1B v1.0.0 §5:
 *   global  → [data-testid="kanban-empty-state"] + [data-testid="kanban-empty-cta"]
 *   coluna  → [data-testid="stage-empty-state"][data-stage-id] + [data-testid="stage-empty-text"]
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
  TEST_ACCOUNT_ID,
} from './_fixture';

test.describe('Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    // Default: empty leads for all stages. Tests that need data override
    // by calling `page.unroute` + `mockLeads(...)` themselves.
    await mockLeads(page, []);
  });

  test('global empty state is shown when all stages have zero Leads', async ({
    page,
  }) => {
    await goToCrm(page);

    // CONTRACT §5 — global empty state with stable testid.
    const emptyState = page.locator('[data-testid="kanban-empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-testid="kanban-empty-title"]')
    ).toBeVisible();
  });

  test('global empty state is editorial copy with no Chatwoot CTA (C-3 Cinematic OS)', async ({
    page,
  }) => {
    await goToCrm(page);

    await expect(
      page.locator('[data-testid="kanban-empty-title"]')
    ).toBeVisible({ timeout: 5_000 });

    // The blue "connect a channel" CTA was removed in the Cinematic OS pass.
    await expect(page.locator('[data-testid="kanban-empty-cta"]')).toHaveCount(
      0
    );
  });

  test('per-column empty state shows subtle text when other stages have Leads', async ({
    page,
  }) => {
    // Override beforeEach: "Novo" has a lead, "Qualificado" is empty.
    await page.unroute(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`
    );
    await mockLeads(page, [
      mockLead({ id: 1, stageId: 1, contactName: 'A', channelHandle: 'a-1' }),
    ]);

    await goToCrm(page);

    // Global empty must NOT render when at least one stage has leads.
    const globalEmpty = page.locator('[data-testid="kanban-empty-state"]');
    await expect(globalEmpty).toHaveCount(0, { timeout: 5_000 });

    // CONTRACT §5 — per-column empty selected by stage-id, not stage-kind.
    const qualifiedEmpty = page.locator(
      '[data-testid="stage-empty-state"][data-stage-id="2"]'
    );
    await expect(qualifiedEmpty).toBeVisible();
    await expect(
      qualifiedEmpty.locator('[data-testid="stage-empty-text"]')
    ).toBeVisible();
  });
});
