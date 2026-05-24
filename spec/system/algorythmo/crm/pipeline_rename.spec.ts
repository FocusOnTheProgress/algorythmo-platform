/**
 * Pipeline rename — renaming a stage updates card headers
 *
 * Validates that renaming a stage via the Pipeline Config view
 * is reflected in:
 * 1. The column header on the Kanban.
 * 2. The aria-label on Lead cards in that stage.
 * 3. The stage empty text for that column.
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Stage columns: [data-testid="stage-column"][data-stage-id].
 *   - Lead cards:    [data-testid="lead-card"][data-lead-id].
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships:
 *   - PipelineConfigView.vue + PipelineConfigForm.vue (B-PR6 of Sessão C)
 *   - PATCH /stages/:id/rename endpoint (already in Trilha A, confirmed merged)
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  goToPipelineConfig,
  mockLead,
  mockDefaultPipeline,
  mockLeads,
} from './_fixture';

test.describe('Pipeline rename', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await page.route(
      `**/algorythmo/api/v1/accounts/*/stages/3/rename`,
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          // CONTRACT §2 — only open|won|lost. "Proposta" is an open stage.
          body: JSON.stringify({
            id: 3,
            name: 'Orçamento',
            position: 3,
            kind: 'open',
            aging_coefficient: 7.0,
          }),
        });
      }
    );
  });

  test.skip('renaming "Proposta" to "Orçamento" updates column header on Kanban', async ({
    page,
  }) => {
    await mockLeads(page, []);

    await goToPipelineConfig(page);

    const propostaInput = page.locator(
      '[data-stage-id="3"] [data-testid="stage-name-input"]'
    );
    await expect(propostaInput).toBeVisible({ timeout: 5_000 });

    await propostaInput.clear();
    await propostaInput.fill('Orçamento');
    await propostaInput.press('Enter');

    await goToCrm(page);

    const renamedColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="3"]'
    );
    await expect(
      renamedColumn.locator('[data-testid="stage-name"]')
    ).toHaveText('Orçamento', { timeout: 5_000 });
  });

  test.skip('renaming a stage updates aria-label on Lead cards within that stage', async ({
    page,
  }) => {
    const leadInStage3 = mockLead({
      id: 30,
      stageId: 3,
      channelOrigin: 'email',
      contactName: 'Stage Rename Test',
    });
    await mockLeads(page, [leadInStage3]);

    await goToPipelineConfig(page);

    const propostaInput = page.locator(
      '[data-stage-id="3"] [data-testid="stage-name-input"]'
    );
    await propostaInput.clear();
    await propostaInput.fill('Orçamento');
    await propostaInput.press('Enter');

    await goToCrm(page);

    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="30"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 5_000 });
    const ariaLabel = await leadCard.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/Orçamento/i);
  });
});
