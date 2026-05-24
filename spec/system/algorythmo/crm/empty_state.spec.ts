/**
 * Empty state — first access with no Leads
 *
 * Validates against CONTRACT_M1B v1.0.0 §5:
 *   global  → [data-testid="kanban-empty-state"] + [data-testid="kanban-empty-cta"]
 *   coluna  → [data-testid="stage-empty-state"][data-stage-id] + [data-testid="stage-empty-text"]
 *
 * Status: SCAFFOLD — tests .skip() until backend endpoints in CONTRACT §9 are
 * live AND test account has `algorythmo_crm` enabled.
 */

import { test, expect, loginAsAdmin, goToCrm, TEST_ACCOUNT_ID } from './_fixture';

test.describe('Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // Return empty leads for all stages
    await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: [], next_cursor: null }),
      });
    });
  });

  test.skip(
    'global empty state is shown when all stages have zero Leads',
    async ({ page }) => {
      await goToCrm(page);

      // CONTRACT §5 — global empty state with stable testid.
      const emptyState = page.locator('[data-testid="kanban-empty-state"]');
      await expect(emptyState).toBeVisible({ timeout: 5_000 });
      await expect(
        page.locator('[data-testid="kanban-empty-title"]')
      ).toBeVisible();
    }
  );

  test.skip(
    'global empty state CTA link is Tab-focusable and points to inbox setup',
    async ({ page }) => {
      await goToCrm(page);

      // CONTRACT §5 — CTA selected by testid, not by name (i18n-safe).
      const ctaLink = page.locator('[data-testid="kanban-empty-cta"]');
      await expect(ctaLink).toBeVisible({ timeout: 5_000 });

      await ctaLink.focus();
      await expect(ctaLink).toBeFocused();

      const href = await ctaLink.getAttribute('href');
      expect(href).toContain(`/accounts/${TEST_ACCOUNT_ID}/settings/inboxes/new`);
    }
  );

  test.skip(
    'per-column empty state shows subtle text when other stages have Leads',
    async ({ page }) => {
      // Override: "Novo" has leads, "Qualificado" is empty
      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        const url = route.request().url();
        const stageId = new URL(url).searchParams.get('stage_id');
        const leads =
          stageId === '1'
            ? [{ id: 1, stage_id: 1, channel_origin: 'widget', channel_metadata: { name: 'A' }, stage_entered_at: new Date().toISOString(), last_message_at: new Date().toISOString() }]
            : [];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ leads, next_cursor: null }),
        });
      });

      await goToCrm(page);

      // Global empty must NOT render when at least one stage has leads.
      const globalEmpty = page.locator('[data-testid="kanban-empty-state"]');
      await expect(globalEmpty).toHaveCount(0, { timeout: 5_000 });

      // CONTRACT §5 — per-column empty selected by stage-id, not stage-kind.
      const qualifiedEmpty = page.locator(
        '[data-testid="stage-empty-state"][data-stage-id="2"]'
      );
      await expect(qualifiedEmpty).toBeVisible();
      await expect(
        qualifiedEmpty.locator('[data-testid="stage-empty-text"]')
      ).toBeVisible();
    }
  );
});
