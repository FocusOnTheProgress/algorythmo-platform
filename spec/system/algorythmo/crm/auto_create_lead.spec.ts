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
 *   3. `seedLeads` / mock-message helpers are functional (_fixture.ts TODO).
 */

import { test, expect, loginAsAdmin, goToCrm, BASE_URL } from './_fixture';

test.describe('D6 — Auto-create Lead por canal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip(
    'widget message creates Lead in "Novo" stage within 10s (polling)',
    async ({ page }) => {
      // Arrange: mock a new inbound widget message via API stub
      await page.route(
        `**/algorythmo/api/v1/accounts/*/leads*`,
        async (route) => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              leads: [
                {
                  id: 1,
                  stage_id: 1,
                  channel_origin: 'widget',
                  channel_metadata: { name: 'Test User Widget', handle: 'widget-123' },
                  stage_entered_at: new Date().toISOString(),
                  last_message_at: new Date().toISOString(),
                },
              ],
              next_cursor: null,
            }),
          });
        }
      );

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
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leads: [
              {
                id: 2,
                stage_id: 1,
                channel_origin: 'whatsapp',
                channel_metadata: {
                  name: 'Maria Santos',
                  handle: '+5511999999999',
                  photo_url: null,
                },
                stage_entered_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
              },
            ],
            next_cursor: null,
          }),
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
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leads: [
              {
                id: 3,
                stage_id: 1,
                channel_origin: 'email',
                channel_metadata: {
                  name: 'Ana Oliveira',
                  handle: 'ana@example.com',
                },
                stage_entered_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
              },
            ],
            next_cursor: null,
          }),
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
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leads: [
              {
                id: 4,
                stage_id: 1,
                channel_origin: 'instagram',
                channel_metadata: {
                  name: 'Pedro Lima',
                  handle: '@pedrolima',
                },
                stage_entered_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
              },
            ],
            next_cursor: null,
          }),
        });
      });

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-channel="instagram"]').first();
      await expect(leadCard).toBeVisible({ timeout: 12_000 });
    }
  );
});
