/**
 * A11y — Keyboard navigation (D11)
 *
 * Validates Tab / Enter / Esc keyboard interactions on the CRM Kanban:
 *
 * 1. Tab reaches each interactive element (cards, menu ⋮, columns).
 * 2. Enter on a card opens the LeadDetailDrawer.
 * 3. Esc closes the drawer and returns focus to the triggering card.
 * 4. Keyboard-only "Mover para..." flow (T-B19 fallback):
 *    Tab → card → menu ⋮ → Enter → "Mover para…" → modal → radio stage →
 *    Enter → card moved.
 * 5. Focus is trapped inside the open drawer (Tab loops within it).
 *
 * Selector contract (CONTRACT_M1B v1.0.0):
 *   - Lead cards: [data-testid="lead-card"][data-lead-id].
 *   - Stage columns: [data-testid="stage-column"][data-stage-id].
 *   - Move modal: [data-testid="move-lead-modal"] (§6).
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
  DEFAULT_PIPELINE_STAGES,
  TEST_ACCOUNT_ID,
} from './_fixture';

const SAMPLE_LEAD = mockLead({
  id: 1,
  stageId: 1,
  channelOrigin: 'widget',
  contactName: 'Keyboard Test User',
  channelHandle: 'widget-001',
});

test.describe('A11y — Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [SAMPLE_LEAD]);
    await goToCrm(page);
  });

  test('Tab reaches lead card in "Novo" column', async ({ page }) => {
    let focusedOnCard = false;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('data-testid') === 'lead-card'
          ? el.getAttribute('data-lead-id')
          : null;
      });
      if (focused) {
        focusedOnCard = true;
        break;
      }
    }
    expect(focusedOnCard).toBe(true);
  });

  test('Enter on focused card opens LeadDetailDrawer', async ({
    page,
  }) => {
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const onCard = await page.evaluate(
        () =>
          document.activeElement?.getAttribute('data-testid') === 'lead-card'
      );
      if (onCard) break;
    }

    await page.keyboard.press('Enter');

    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible({ timeout: 3_000 });
  });

  test('Esc closes drawer and returns focus to triggering card', async ({
    page,
  }) => {
    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    await leadCard.click();

    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(drawer).toHaveCount(0, { timeout: 3_000 });
    await expect(leadCard).toBeFocused();
  });

  test('Tab loops within open drawer (focus trap)', async ({ page }) => {
    const leadCard = page.locator(
      '[data-testid="lead-card"][data-lead-id="1"]'
    );
    await leadCard.click();

    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).toBeVisible();

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const activeWithinDrawer = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active) ?? false;
      });
      expect(activeWithinDrawer).toBe(true);
    }
  });

  test('keyboard-only "Mover para..." flow moves card to target stage (T-B19)', async ({
    page,
  }) => {
    await page.route(
      `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads/1/move`,
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

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const leadId = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.getAttribute('data-testid') === 'lead-card'
          ? el.getAttribute('data-lead-id')
          : null;
      });
      if (leadId === '1') break;
    }

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    const moveOption = page.getByRole('menuitem', { name: /mover para/i });
    await expect(moveOption).toBeVisible({ timeout: 3_000 });
    await moveOption.focus();
    await page.keyboard.press('Enter');

    const moveModal = page.locator('[data-testid="move-lead-modal"]');
    await expect(moveModal).toBeVisible({ timeout: 3_000 });

    // Target stage is "Qualificado" (id=2). Match the radio by name from the
    // mocked pipeline so a CONTRACT §9 rename can't break this assertion.
    const targetStageName = DEFAULT_PIPELINE_STAGES[1].name;
    const targetRadio = moveModal.getByRole('radio', {
      name: new RegExp(targetStageName, 'i'),
    });
    await targetRadio.focus();
    await page.keyboard.press('Space');

    await page.keyboard.press('Enter');

    const qualifiedColumn = page.locator(
      '[data-testid="stage-column"][data-stage-id="2"]'
    );
    await expect(
      qualifiedColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
    ).toBeVisible({ timeout: 5_000 });
  });
});
