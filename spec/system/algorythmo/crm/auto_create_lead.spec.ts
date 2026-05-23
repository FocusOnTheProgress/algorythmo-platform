/**
 * D6 — Auto-create Lead por canal
 *
 * Validates that incoming messages on each supported channel automatically
 * create a Lead in the "Novo" stage of the default pipeline.
 *
 * Supported channels: widget, WhatsApp, email, Instagram.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 D6 (auto-create Lead por canal)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14 cenário 3
 *
 * Status: SCAFFOLD — all tests are .skip() until Sessão C ships CrmKanbanView
 * and Sessão B ships the polling infrastructure (B.7).
 *
 * Enable in Fase 2 once:
 *   1. CRM route is live (Sessão C B-PR2/B-PR5).
 *   2. Polling 8s is wired (Sessão B B-PR5).
 *   3. Feature flag is enabled in test environment (see _fixture.ts PRECONDITIONS).
 */

import { test, expect, loginAsAdmin, goToCrm, mockLead, mockDefaultPipeline } from './_fixture';

test.describe('D6 — Auto-create Lead por canal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test.skip(
    'widget message creates Lead in "Novo" stage within 10s (polling)',
    async ({ page }) => {
      const lead = mockLead({ id: 1, stageId: 1, channelOrigin: 'widget', contactName: 'Test User Widget', channelHandle: 'widget-123' });

      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leads: [lead], next_cursor: null }),
        });
      });

      await goToCrm(page);

      // Assert: Lead card appears in "Novo" column within the polling window
      const novoColumn = page.locator('[data-stage-kind="new"]');
      await expect(novoColumn).toBeVisible();
      await expect(novoColumn.locator('[data-lead-id]').first()).toBeVisible({
        timeout: 12_000,
      });
      await expect(
        novoColumn.locator('[data-lead-channel="widget"]').first()
      ).toBeVisible();
    }
  );

  test.skip(
    'WhatsApp message creates Lead in "Novo" stage with WhatsApp channel icon',
    async ({ page }) => {
      const lead = mockLead({ id: 2, stageId: 1, channelOrigin: 'whatsapp', contactName: 'Maria Santos', channelHandle: '+5511999999999' });

      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leads: [lead], next_cursor: null }),
        });
      });

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-channel="whatsapp"]').first();
      await expect(leadCard).toBeVisible({ timeout: 12_000 });
      // Channel icon must be present (aria-label or data attribute)
      await expect(
        leadCard.locator('[aria-label*="whatsapp" i], [data-channel-icon="whatsapp"]')
      ).toBeVisible();
    }
  );

  test.skip(
    'email message creates Lead in "Novo" stage',
    async ({ page }) => {
      const lead = mockLead({ id: 3, stageId: 1, channelOrigin: 'email', contactName: 'Ana Oliveira', channelHandle: 'ana@example.com', contactEmail: 'ana@example.com' });

      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leads: [lead], next_cursor: null }),
        });
      });

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-channel="email"]').first();
      await expect(leadCard).toBeVisible({ timeout: 12_000 });
    }
  );

  test.skip(
    'Instagram DM creates Lead in "Novo" stage',
    async ({ page }) => {
      const lead = mockLead({ id: 4, stageId: 1, channelOrigin: 'instagram', contactName: 'Pedro Lima', channelHandle: '@pedrolima' });

      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leads: [lead], next_cursor: null }),
        });
      });

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-channel="instagram"]').first();
      await expect(leadCard).toBeVisible({ timeout: 12_000 });
    }
  );
});
