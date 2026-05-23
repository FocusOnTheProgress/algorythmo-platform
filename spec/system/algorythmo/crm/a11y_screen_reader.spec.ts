/**
 * A11y — Screen reader (D11)
 *
 * Validates aria-live region announces Lead moves, and that card aria-labels
 * provide sufficient context for screen reader users.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 D11
 *   docs/plans/0001-mvp-algorythmo-os.md B.12 (aria-label format)
 *   "aria-live='polite' em região da timeline anuncia transições"
 *
 * Expected aria-label format per B.12:
 *   "Lead {name}, etapa {stage}, há {timeHuman}, canal {channel}"
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships:
 *   - LeadCard.vue with correct aria-label (B-PR4)
 *   - KanbanBoard.vue with aria-live region (B-PR5)
 */

import { test, expect, loginAsAdmin, goToCrm } from './_fixture';

test.describe('A11y — Screen reader', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
      const url = route.request().url();
      const stageId = new URL(url).searchParams.get('stage_id');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          leads:
            stageId === '1'
              ? [
                  {
                    id: 1,
                    stage_id: 1,
                    channel_origin: 'whatsapp',
                    channel_metadata: { name: 'João Silva', handle: '+5511777777777' },
                    stage_entered_at: new Date(Date.now() - 720_000).toISOString(), // 12 min ago
                    last_message_at: new Date().toISOString(),
                  },
                ]
              : [],
          next_cursor: null,
        }),
      });
    });
    await goToCrm(page);
  });

  test.skip(
    'lead card has descriptive aria-label including name, stage, time, and channel',
    async ({ page }) => {
      const leadCard = page.locator('[data-lead-id="1"]');
      await expect(leadCard).toBeVisible({ timeout: 5_000 });

      const ariaLabel = await leadCard.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      // Must contain name
      expect(ariaLabel).toMatch(/João Silva/i);
      // Must contain stage name
      expect(ariaLabel).toMatch(/Novo/i);
      // Must contain time (flexible match)
      expect(ariaLabel).toMatch(/\d+\s*(min|h|d|seg)/i);
      // Must contain channel
      expect(ariaLabel).toMatch(/whatsapp/i);
    }
  );

  test.skip(
    'aria-live region announces Lead move between stages',
    async ({ page }) => {
      await page.route(`**/algorythmo/api/v1/accounts/*/leads/1/move`, async (route) => {
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
      });

      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();

      const leadCard = page.locator('[data-lead-id="1"]');
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');
      await leadCard.dragTo(qualifiedColumn);

      // Live region must announce the move with lead name and destination stage
      await expect(liveRegion).toContainText(/João Silva/i, { timeout: 5_000 });
      await expect(liveRegion).toContainText(/Qualificado/i, { timeout: 5_000 });
    }
  );

  test.skip(
    'drawer has role="dialog" with aria-modal and aria-labelledby',
    async ({ page }) => {
      const leadCard = page.locator('[data-lead-id="1"]');
      await leadCard.click();

      const drawer = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(drawer).toBeVisible({ timeout: 3_000 });

      // Must have labelledby pointing to a visible heading
      const labelledby = await drawer.getAttribute('aria-labelledby');
      expect(labelledby).toBeTruthy();

      const heading = page.locator(`#${labelledby}`);
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/João Silva/i);
    }
  );

  test.skip(
    'aging chip has accessible label describing state and time',
    async ({ page }) => {
      const leadCard = page.locator('[data-lead-id="1"]');
      await expect(leadCard).toBeVisible({ timeout: 5_000 });

      const chip = leadCard.locator('.alg-chip--aging');
      await expect(chip).toBeVisible();

      const ariaLabel = await chip.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      // Must describe the aging state
      expect(ariaLabel).toMatch(/em dia|atenção|atrasado/i);
    }
  );
});
