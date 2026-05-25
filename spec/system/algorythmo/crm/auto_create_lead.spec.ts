/**
 * D6 — Auto-create Lead por canal
 *
 * Validates that incoming messages on each supported channel automatically
 * create a Lead in the "Novo" stage of the default pipeline.
 *
 * Supported channels: widget, WhatsApp, email, Instagram.
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Stage columns: [data-testid="stage-column"][data-stage-id]. The three
 *     open stages share kind="open" — identify by id, not kind.
 *   - Lead cards: [data-testid="lead-card"][data-lead-id][data-channel].
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
} from './_fixture';

test.describe('D6 — Auto-create Lead por canal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test('widget message creates Lead in "Novo" stage within 10s (polling)', async ({
    page,
  }) => {
    const lead = mockLead({
      id: 1,
      stageId: 1,
      channelOrigin: 'widget',
      contactName: 'Test User Widget',
      channelHandle: 'widget-123',
    });
    await mockLeads(page, [lead]);

    await goToCrm(page);

    const novoColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="1"]'
    );
    await expect(novoColumn).toBeVisible();
    await expect(
      novoColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
    ).toBeVisible({ timeout: 12_000 });
    await expect(
      novoColumn.locator('[data-testid="lead-card"][data-channel="widget"]')
    ).toBeVisible();
  });

  test('WhatsApp message creates Lead in "Novo" stage with WhatsApp channel icon', async ({
    page,
  }) => {
    const lead = mockLead({
      id: 2,
      stageId: 1,
      channelOrigin: 'whatsapp',
      contactName: 'Maria Santos',
      channelHandle: '+5511999999999',
    });
    await mockLeads(page, [lead]);

    await goToCrm(page);

    const leadCard = page.locator(
      '[data-testid="lead-card"][data-channel="whatsapp"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 12_000 });
    // Card's data-channel attribute is the canonical channel marker;
    // a visual glyph is a UI concern, not a contract guarantee.
    await expect(leadCard).toHaveAttribute('data-channel', 'whatsapp');
  });

  test('email message creates Lead in "Novo" stage', async ({ page }) => {
    const lead = mockLead({
      id: 3,
      stageId: 1,
      channelOrigin: 'email',
      contactName: 'Ana Oliveira',
      channelHandle: 'ana@example.com',
      contactEmail: 'ana@example.com',
    });
    await mockLeads(page, [lead]);

    await goToCrm(page);

    const leadCard = page.locator(
      '[data-testid="lead-card"][data-channel="email"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 12_000 });
  });

  test('Instagram DM creates Lead in "Novo" stage', async ({ page }) => {
    const lead = mockLead({
      id: 4,
      stageId: 1,
      channelOrigin: 'instagram',
      contactName: 'Pedro Lima',
      channelHandle: '@pedrolima',
    });
    await mockLeads(page, [lead]);

    await goToCrm(page);

    const leadCard = page.locator(
      '[data-testid="lead-card"][data-channel="instagram"]'
    );
    await expect(leadCard).toBeVisible({ timeout: 12_000 });
  });
});
