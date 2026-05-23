/**
 * Pipeline rename — renaming a stage updates card headers
 *
 * Validates that renaming a stage via the Pipeline Config view
 * is reflected in:
 * 1. The column header on the Kanban.
 * 2. The aria-label on Lead cards in that stage.
 * 3. The stage empty text for that column.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 6 (PipelineConfig rename)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14 cenário 8
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.8 (PipelineConfigView)
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships:
 *   - PipelineConfigView.vue + PipelineConfigForm.vue (B-PR6 of Sessão C)
 *   - PATCH /stages/:id/rename endpoint (already in Trilha A, confirmed merged)
 */

import { test, expect, loginAsAdmin, goToCrm, goToPipelineConfig } from './_fixture';

test.describe('Pipeline rename', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Mock rename endpoint
    await page.route(
      `**/algorythmo/api/v1/accounts/*/stages/3/rename`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 3, name: 'Orçamento', position: 3, kind: 'proposal', aging_coefficient: 7.0 }),
        });
      }
    );
  });

  test.skip(
    'renaming "Proposta" to "Orçamento" updates column header on Kanban',
    async ({ page }) => {
      await goToPipelineConfig(page);

      // Find the "Proposta" stage input and rename it
      const propostaInput = page.locator('[data-stage-id="3"] [data-testid="stage-name-input"]');
      await expect(propostaInput).toBeVisible({ timeout: 5_000 });

      await propostaInput.clear();
      await propostaInput.fill('Orçamento');
      await propostaInput.press('Enter');

      // Navigate to Kanban
      await goToCrm(page);

      // Column header must show new name
      const renamedColumn = page.locator('[data-stage-id="3"]');
      await expect(renamedColumn.locator('[data-testid="stage-name"]')).toHaveText(
        'Orçamento',
        { timeout: 5_000 }
      );
    }
  );

  test.skip(
    'renaming a stage updates aria-label on Lead cards within that stage',
    async ({ page }) => {
      // Arrange: a lead in stage 3 (Proposta → renamed to Orçamento)
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        const url = route.request().url();
        const stageId = new URL(url).searchParams.get('stage_id');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leads:
              stageId === '3'
                ? [
                    {
                      id: 30,
                      stage_id: 3,
                      channel_origin: 'email',
                      channel_metadata: { name: 'Stage Rename Test' },
                      stage_entered_at: new Date().toISOString(),
                      last_message_at: new Date().toISOString(),
                    },
                  ]
                : [],
            next_cursor: null,
          }),
        });
      });

      await goToPipelineConfig(page);

      const propostaInput = page.locator('[data-stage-id="3"] [data-testid="stage-name-input"]');
      await propostaInput.clear();
      await propostaInput.fill('Orçamento');
      await propostaInput.press('Enter');

      await goToCrm(page);

      // Lead card aria-label must reference the new stage name
      const leadCard = page.locator('[data-lead-id="30"]');
      await expect(leadCard).toBeVisible({ timeout: 5_000 });
      const ariaLabel = await leadCard.getAttribute('aria-label');
      expect(ariaLabel).toMatch(/Orçamento/i);
    }
  );

  // Removed: "aging_coefficient input updates preview scale in real-time"
  // was not specified in B.8 (PipelineConfigView DoD) and violated R3 (no invented behavior).
  // If this behavior is confirmed in the plan, add it via a new PR with explicit plan reference.
});
