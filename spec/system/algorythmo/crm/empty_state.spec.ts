/**
 * Empty state — first access with no Leads
 *
 * Validates the "global empty state" (T-B16) shown when there are zero Leads
 * in any stage. The copy is fixed and links to the new inbox wizard.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 7 (empty state)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §3 T-B16
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.6
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships LeadEmptyState.vue
 * and StageEmptyState.vue (B-PR5 / B-PR6 of Sessão C's work).
 */

import { test, expect, loginAsAdmin, goToCrm, BASE_URL, TEST_ACCOUNT_ID } from './_fixture';

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

      // Fixed copy from T-B16 / D11
      const emptyState = page.locator('[data-testid="crm-empty-state"]');
      await expect(emptyState).toBeVisible({ timeout: 5_000 });
      await expect(emptyState).toContainText(
        /Os Leads vão aparecer aqui automaticamente/i
      );
    }
  );

  test.skip(
    'global empty state CTA link is Tab-focusable and points to inbox setup',
    async ({ page }) => {
      await goToCrm(page);

      const ctaLink = page.getByRole('link', { name: /conecte um canal agora/i });
      await expect(ctaLink).toBeVisible({ timeout: 5_000 });

      // Tab-focusable (P3 from spec)
      await page.keyboard.press('Tab');
      // Eventually focus lands on the CTA
      await expect(ctaLink).toBeFocused({ timeout: 5_000 });

      // Href points to inbox setup wizard
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

      // No global empty state (Novo has a lead)
      const globalEmpty = page.locator('[data-testid="crm-empty-state"]');
      await expect(globalEmpty).toHaveCount(0, { timeout: 5_000 });

      // Per-column empty text in Qualificado
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');
      await expect(qualifiedColumn.locator('[data-testid="stage-empty"]')).toBeVisible();
      await expect(qualifiedColumn.locator('[data-testid="stage-empty"]')).toContainText(
        /Nenhum Lead/i
      );
    }
  );
});
