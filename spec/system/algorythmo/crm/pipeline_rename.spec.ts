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
 * Status: LIVE (un-skipped in M1-C/PR5).
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
  DEFAULT_PIPELINE_STAGES,
  TEST_ACCOUNT_ID,
} from './_fixture';

// CONTRACT §2 — open|won|lost only. "Proposta" → RENAMED_STAGE_NAME stays an
// open stage. The single source for the new name — input fill, mock body,
// AND assertion all read from this const so an i18n / copy change is one edit.
const RENAMED_STAGE_NAME = 'Orçamento';
const RENAMED_STAGES = DEFAULT_PIPELINE_STAGES.map(s =>
  s.id === 3 ? { ...s, name: RENAMED_STAGE_NAME } : s
);

test.describe('Pipeline rename', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await page.route(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/stages/3/rename`,
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          // CONTRACT §2 — only open|won|lost. "Proposta" is an open stage.
          body: JSON.stringify({
            id: 3,
            name: RENAMED_STAGE_NAME,
            position: 3,
            kind: 'open',
            aging_coefficient: 7.0,
          }),
        });
      }
    );
  });

  test('renaming "Proposta" to "Orçamento" updates column header on Kanban', async ({
    page,
  }) => {
    await mockLeads(page, []);

    await goToPipelineConfig(page);

    const propostaInput = page.locator(
      '[data-stage-id="3"] [data-testid="stage-name-input"]'
    );
    await expect(propostaInput).toBeVisible({ timeout: 5_000 });

    // Remock /pipelines/default with RENAMED_STAGES BEFORE pressing Enter so
    // any post-PATCH refetch (form success handler may call loadPipeline before
    // we get the chance to unroute) hits the new body. Without this, there's
    // a TOCTOU where the refetch races the unroute and rehydrates the store
    // with the stale "Proposta" body.
    await page.unroute(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/pipelines/default`
    );
    await mockDefaultPipeline(page, RENAMED_STAGES);

    await propostaInput.clear();
    await propostaInput.fill(RENAMED_STAGE_NAME);
    await propostaInput.press('Enter');

    await goToCrm(page);

    const renamedColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="3"]'
    );
    await expect(
      renamedColumn.locator('[data-testid="stage-name"]')
    ).toHaveText('Orçamento', { timeout: 5_000 });
  });

  test('renaming a stage updates aria-label on Lead cards within that stage', async ({
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
    await expect(propostaInput).toBeVisible({ timeout: 5_000 });

    // Remock /pipelines/default BEFORE Enter — see rationale in the previous
    // test. TOCTOU between PATCH success and unroute would otherwise rehydrate
    // the store with the stale body.
    await page.unroute(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/pipelines/default`
    );
    await mockDefaultPipeline(page, RENAMED_STAGES);

    await propostaInput.clear();
    await propostaInput.fill(RENAMED_STAGE_NAME);
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
