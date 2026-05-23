/**
 * Kanban drag-and-drop — Lead between stages
 *
 * Validates:
 * 1. Optimistic move: card visually moves immediately (before server response).
 * 2. Persistence: after browser refresh, card remains in target stage.
 * 3. Rollback: network failure restores card to origin stage + toast shown.
 * 4. Intra-stage drag: dragging within same column does nothing (Q-B3 decision).
 * 5. aria-live announces the move to screen readers.
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 4
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14 cenários 4 + 5
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §3 T-B4 (optimistic update)
 *   Q-B3: intra-stage reorder disabled
 *
 * Status: SCAFFOLD — all tests .skip() until Sessão C ships KanbanBoard + drag
 * (B-PR5) and Sessão B ships useKanbanDragDrop (B.2).
 */

import { test, expect, loginAsAdmin, goToCrm, dragLeadCard, BASE_URL } from './_fixture';

test.describe('Kanban — Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.skip(
    'drag Lead from "Novo" to "Qualificado" — optimistic move reflects immediately',
    async ({ page }) => {
      // Arrange: mock pipeline and a lead in "Novo"
      await page.route(`**/algorythmo/api/v1/accounts/*/pipelines/default`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pipeline: { id: 1, name: 'Default' },
            stages: [
              { id: 1, name: 'Novo', kind: 'new', position: 1, aging_coefficient: 1.0 },
              { id: 2, name: 'Qualificado', kind: 'qualified', position: 2, aging_coefficient: 4.0 },
              { id: 3, name: 'Proposta', kind: 'proposal', position: 3, aging_coefficient: 7.0 },
              { id: 4, name: 'Fechado ganho', kind: 'won', position: 4, aging_coefficient: 0.0 },
              { id: 5, name: 'Fechado perdido', kind: 'lost', position: 5, aging_coefficient: 0.0 },
            ],
          }),
        });
      });

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

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-id="1"]');
      const novoColumn = page.locator('[data-stage-kind="new"]');
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');

      // Use dragLeadCard (mouse events) — NOT dragTo (HTML5 drag events).
      // vuedraggable@4/SortableJS only fires on pointer/mouse events.
      await dragLeadCard(page, leadCard, qualifiedColumn);

      // Optimistic: card immediately visible in target
      await expect(qualifiedColumn.locator('[data-lead-id="1"]')).toBeVisible();
      await expect(novoColumn.locator('[data-lead-id="1"]')).toHaveCount(0);
    }
  );

  test.skip(
    'drag Lead persists after page refresh',
    async ({ page }) => {
      await goToCrm(page);

      const leadCard = page.locator('[data-lead-id="1"]');
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');

      await dragLeadCard(page, leadCard, qualifiedColumn);
      await page.reload({ waitUntil: 'networkidle' });

      // After reload, card should still be in Qualificado (server persisted)
      await expect(qualifiedColumn.locator('[data-lead-id="1"]')).toBeVisible({
        timeout: 10_000,
      });
    }
  );

  test.skip(
    'drag failure (5xx) rolls back card and shows retry toast',
    async ({ page }) => {
      await page.route(`**/algorythmo/api/v1/accounts/*/leads/*/move`, async (route) => {
        await route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await goToCrm(page);

      const leadCard = page.locator('[data-lead-id="1"]');
      const novoColumn = page.locator('[data-stage-kind="new"]');
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');

      await dragLeadCard(page, leadCard, qualifiedColumn);

      // Rollback: card returns to origin
      await expect(novoColumn.locator('[data-lead-id="1"]')).toBeVisible({
        timeout: 8_000,
      });
      // Toast with retry button
      const toast = page.locator('[data-testid="toast-error"]');
      await expect(toast).toBeVisible();
      await expect(toast.getByRole('button', { name: /tentar de novo|retry/i })).toBeVisible();
    }
  );

  test.skip(
    'intra-stage drag does not change card position (Q-B3)',
    async ({ page }) => {
      await goToCrm(page);

      const novoColumn = page.locator('[data-stage-kind="new"]');
      const firstCard = novoColumn.locator('[data-lead-id]').first();
      const leadIdBefore = await firstCard.getAttribute('data-lead-id');

      // Drag card within same column (from top to bottom area)
      const columnBounds = await novoColumn.boundingBox();
      if (columnBounds) {
        await firstCard.dragTo(novoColumn, {
          targetPosition: { x: columnBounds.width / 2, y: columnBounds.height - 20 },
        });
      }

      // First card must remain the same (no reorder within stage)
      const firstCardAfter = novoColumn.locator('[data-lead-id]').first();
      const leadIdAfter = await firstCardAfter.getAttribute('data-lead-id');
      expect(leadIdAfter).toBe(leadIdBefore);
    }
  );

  test.skip(
    'aria-live region announces move to screen readers',
    async ({ page }) => {
      await goToCrm(page);

      const leadCard = page.locator('[data-lead-id="1"]');
      const qualifiedColumn = page.locator('[data-stage-kind="qualified"]');
      const liveRegion = page.locator('[aria-live="polite"]');

      await dragLeadCard(page, leadCard, qualifiedColumn);

      // aria-live must announce the transition
      await expect(liveRegion).toContainText(/Qualificado/i, { timeout: 5_000 });
    }
  );
});
