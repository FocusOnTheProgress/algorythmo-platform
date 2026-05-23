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
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 D11 (a11y baseline)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.13 + B.14 cenário 9
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships:
 *   - KanbanBoard.vue with correct tabindex/role (B-PR5)
 *   - LeadDetailDrawer.vue with focus trap (B-PR6)
 *   - MoveLeadModal.vue (B-PR7 / B.11)
 */

import { test, expect, loginAsAdmin, goToCrm } from './_fixture';

test.describe('A11y — Keyboard navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Provide one lead to interact with
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
                    channel_origin: 'widget',
                    channel_metadata: { name: 'Keyboard Test User', handle: 'widget-001' },
                    stage_entered_at: new Date().toISOString(),
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
    'Tab reaches lead card in "Novo" column',
    async ({ page }) => {
      // Tab from body until we land on the first lead card
      let focusedOnCard = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-lead-id'));
        if (focused) {
          focusedOnCard = true;
          break;
        }
      }
      expect(focusedOnCard).toBe(true);
    }
  );

  test.skip(
    'Enter on focused card opens LeadDetailDrawer',
    async ({ page }) => {
      // Tab until lead card is focused
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const leadId = await page.evaluate(() => document.activeElement?.getAttribute('data-lead-id'));
        if (leadId) break;
      }

      await page.keyboard.press('Enter');

      const drawer = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(drawer).toBeVisible({ timeout: 3_000 });
    }
  );

  test.skip(
    'Esc closes drawer and returns focus to triggering card',
    async ({ page }) => {
      const leadCard = page.locator('[data-lead-id="1"]');
      await leadCard.click();

      const drawer = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(drawer).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(drawer).toHaveCount(0, { timeout: 3_000 });
      // Focus must return to the card that opened the drawer
      await expect(leadCard).toBeFocused();
    }
  );

  test.skip(
    'Tab loops within open drawer (focus trap)',
    async ({ page }) => {
      const leadCard = page.locator('[data-lead-id="1"]');
      await leadCard.click();

      const drawer = page.locator('[role="dialog"][aria-modal="true"]');
      await expect(drawer).toBeVisible();

      // Tab through all focusable elements inside drawer
      // Focus must not leave the drawer
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const activeElement = await page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(active) ?? false;
        });
        expect(activeElement).toBe(true);
      }
    }
  );

  test.skip(
    'keyboard-only "Mover para..." flow moves card to target stage (T-B19)',
    async ({ page }) => {
      await page.route(`**/algorythmo/api/v1/accounts/*/leads/1/move`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, stage_id: 2, position: 1.0, stage_entered_at: new Date().toISOString() }),
        });
      });

      // Tab to card
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
        const leadId = await page.evaluate(() => document.activeElement?.getAttribute('data-lead-id'));
        if (leadId === '1') break;
      }

      // Tab to menu ⋮ button on the card
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // open menu

      // Navigate to "Mover para..."
      const moveOption = page.getByRole('menuitem', { name: /mover para/i });
      await expect(moveOption).toBeVisible({ timeout: 3_000 });
      await moveOption.focus();
      await page.keyboard.press('Enter');

      // Move modal opens
      const moveModal = page.locator('[data-testid="move-lead-modal"]');
      await expect(moveModal).toBeVisible({ timeout: 3_000 });

      // Select "Qualificado" radio
      const qualifiedRadio = moveModal.getByRole('radio', { name: /qualificado/i });
      await qualifiedRadio.focus();
      await page.keyboard.press('Space');

      // Confirm
      await page.keyboard.press('Enter');

      // Card moved
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');
      await expect(qualifiedColumn.locator('[data-lead-id="1"]')).toBeVisible({
        timeout: 5_000,
      });
    }
  );
});
