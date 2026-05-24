/**
 * A11y — Screen reader (D11)
 *
 * Validates aria-live region announces Lead moves, and that card aria-labels
 * provide sufficient context for screen reader users.
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Lead cards:        [data-testid="lead-card"][data-lead-id][data-channel]
 *   - Stage columns:     [data-testid="stage-column"][data-stage-id]
 *   - Aria-live region:  [data-testid="aria-live-region"] (§8)
 *   - Aging chip:        [data-testid="lead-aging-chip"] (§4)
 *
 * Expected aria-label format per B.12:
 *   "Lead {name}, etapa {stage}, há {timeHuman}, canal {channel}"
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships:
 *   - LeadCard.vue with correct aria-label (B-PR4) [shipped via PR #48]
 *   - KanbanBoard.vue with aria-live region (B-PR5) [shipped via PR #49]
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  dragLeadCard,
  mockLead,
  mockDefaultPipeline,
  mockLeads,
  DEFAULT_PIPELINE_STAGES,
} from './_fixture';

const TARGET_STAGE = DEFAULT_PIPELINE_STAGES[1]; // Qualificado, id=2
const SAMPLE_LEAD = mockLead({
  id: 1,
  stageId: 1,
  channelOrigin: 'whatsapp',
  contactName: 'João Silva',
  channelHandle: '+5511777777777',
  secondsInStage: 720,
});

test.describe('A11y — Screen reader', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [SAMPLE_LEAD]);
    await goToCrm(page);
  });

  test.skip('lead card has descriptive aria-label including name, stage, time, and channel', async ({
    page,
  }) => {
    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 5_000 });

    const ariaLabel = await leadCard.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toMatch(/João Silva/i);
    expect(ariaLabel).toMatch(/Novo/i);
    expect(ariaLabel).toMatch(/\d+\s*(min|h|d|seg)/i);
    expect(ariaLabel).toMatch(/whatsapp/i);
  });

  test.skip('aria-live region announces Lead move between stages', async ({
    page,
  }) => {
    await page.route(
      `**/algorythmo/api/v1/accounts/*/leads/1/move`,
      async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            stage_id: 2,
            position: 1.0,
            stage_entered_at: new Date().toISOString(),
          }),
        });
      }
    );

    const liveRegion = page.locator('[data-testid="aria-live-region"]');
    await expect(liveRegion).toBeAttached();

    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    const targetColumn = page.locator(
      `[data-testid="stage-column"][data-stage-id="${TARGET_STAGE.id}"]`
    );
    await dragLeadCard(leadCard, targetColumn);

    // Lead name + target stage name come from the mocked pipeline, so a
    // CONTRACT §9 rename can't break the assertion.
    await expect(liveRegion).toContainText(/João Silva/i, { timeout: 5_000 });
    await expect(liveRegion).toContainText(TARGET_STAGE.name, {
      timeout: 5_000,
    });
  });

  test.skip('drawer has role="dialog" with aria-modal and aria-labelledby', async ({
    page,
  }) => {
    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    await leadCard.click();

    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible({ timeout: 3_000 });

    const labelledby = await drawer.getAttribute('aria-labelledby');
    expect(labelledby).toBeTruthy();

    const heading = page.locator(`#${labelledby}`);
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/João Silva/i);
  });

  test.skip('aging chip has accessible label describing state and time', async ({
    page,
  }) => {
    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 5_000 });

    const chip = leadCard.locator('[data-testid="lead-aging-chip"]');
    await expect(chip).toBeVisible();

    const ariaLabel = await chip.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    // All 4 states must produce a recognizable label substring.
    expect(ariaLabel).toMatch(/em dia|atenção|atrasado|sem alerta/i);
  });
});
