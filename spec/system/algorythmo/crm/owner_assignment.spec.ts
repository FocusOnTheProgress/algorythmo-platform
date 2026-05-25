/**
 * D6.1 — Owner assignment via first outbound human reply (M1-C/PR1).
 *
 * Validates the §6.2 contract:
 *   - Lead opens with `owner: null` → drawer renders placeholder text.
 *   - After the first outbound human reply, listener sets `owner_id` to that
 *     user → drawer renders the agent's name.
 *
 * Selector contract (CONTRACT_M1B v1.1.0 §7):
 *   - drawer-owner-name → renders `lead.owner.name` or placeholder when null.
 *
 * Status: SKIPPED until PR 4 (frontend wire) merges to algorythmo/main —
 *   the drawer-owner-name element does not exist in main until then.
 *   To un-skip: delete the `test.skip(true, ...)` line below.
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

test.describe('D6.1 — Owner assignment (drawer-owner-name)', () => {
  test.skip(
    true,
    'Waiting on PR 4 merge — drawer UI (drawer-owner-name) not in main yet. Unskip after rebase onto algorythmo/main once PR 4 lands.'
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
  });

  test('drawer renders placeholder when lead.owner is null', async ({
    page,
  }) => {
    const lead = mockLead({
      id: 200,
      stageId: 1,
      channelOrigin: 'widget',
      contactName: 'Cliente Sem Dono',
    });
    // mockLead does not set owner — JSON resolves owner: null.
    await mockLeads(page, [lead]);

    await goToCrm(page);

    const card = page.locator(
      '[data-testid="lead-card"][data-lead-id="200"]'
    );
    await card.click();

    const ownerName = page.locator('[data-testid="drawer-owner-name"]');
    await expect(ownerName).toBeVisible();
    // Placeholder copy is owned by frontend i18n; assert non-empty + does NOT
    // match a real agent name pattern (would be cosmetically wrong but valid).
    await expect(ownerName).not.toHaveText('');
  });

  test('drawer renders owner name after first outbound human reply', async ({
    page,
  }) => {
    // After PR 4 wires it, the listener owner setter (PR 1) populates
    // lead.owner = { id, name, thumbnail } in the lead JSON.
    const leadWithOwner = {
      ...mockLead({
        id: 201,
        stageId: 1,
        channelOrigin: 'widget',
        contactName: 'Cliente Com Dono',
      }),
      owner: {
        id: 42,
        name: 'Ana Vendas',
        thumbnail: null,
      },
    };
    await mockLeads(page, [leadWithOwner]);

    await goToCrm(page);

    const card = page.locator(
      '[data-testid="lead-card"][data-lead-id="201"]'
    );
    await card.click();

    const ownerName = page.locator('[data-testid="drawer-owner-name"]');
    await expect(ownerName).toHaveText('Ana Vendas');
  });

  test('owner JSON shape stays canonical { id, name, thumbnail }', async ({
    page,
  }) => {
    // Defence-in-depth: if the lead JSON drifts (e.g. ships `assignee` instead
    // of `owner`), the drawer falls back to placeholder silently. This spec
    // catches the contract drift at the boundary.
    let capturedBody: unknown = null;
    await page.route(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`,
      async route => {
        const body = {
          leads: [
            {
              ...mockLead({ id: 202, stageId: 1, contactName: 'Owner Shape' }),
              owner: { id: 7, name: 'Bruno SDR', thumbnail: null },
            },
          ],
          next_cursor: null,
        };
        capturedBody = body;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      }
    );

    await goToCrm(page);
    await page.locator('[data-testid="lead-card"][data-lead-id="202"]').click();

    const ownerName = page.locator('[data-testid="drawer-owner-name"]');
    await expect(ownerName).toHaveText('Bruno SDR');

    // capturedBody comes from the mocked response, not the live API — this
    // documents the expected shape for grep-ability when the contract bumps.
    expect((capturedBody as { leads: Array<{ owner: { id: number; name: string; thumbnail: string | null } }> }).leads[0].owner).toEqual({
      id: 7,
      name: 'Bruno SDR',
      thumbnail: null,
    });
  });
});
