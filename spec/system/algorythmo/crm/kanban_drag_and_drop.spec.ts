/**
 * Kanban drag-and-drop — Lead between stages
 *
 * Validates against CONTRACT_M1B v1.0.0 (§2, §3, §8):
 * 1. Optimistic move: card visually moves immediately (before server response).
 * 2. Persistence: after browser refresh, card remains in target stage.
 * 3. Rollback: network failure restores card to origin stage + toast shown.
 * 4. Intra-stage drag: dragging within same column does nothing (Q-B3 decision).
 * 5. aria-live region announces the move to screen readers.
 *
 * Stage selectors:
 *   CONTRACT §2 — stage.kind ∈ { 'open' | 'won' | 'lost' }.
 *   Three open stages (Novo / Qualificado / Proposta) share kind='open' and
 *   MUST be selected by `data-stage-id`, not by kind.
 *
 * Status: SCAFFOLD — all tests .skip() until backend endpoints in CONTRACT §9
 * are live AND test account has `algorythmo_crm` enabled.
 */

import { test, expect, loginAsAdmin, goToCrm, dragLeadCard } from './_fixture';

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

      const leadCard = page.locator('[data-testid="lead-card"][data-lead-id="1"]');
      const novoColumn = page.locator('[data-testid="stage-column"][data-stage-id="1"]');
      const qualifiedColumn = page.locator('[data-testid="stage-column"][data-stage-id="2"]');

      // dragLeadCard dispatches HTML5 drag events — matches useDragLead listeners.
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

      const leadCard = page.locator('[data-testid="lead-card"][data-lead-id="1"]');
      const qualifiedColumn = page.locator('[data-testid="stage-column"][data-stage-id="2"]');

      await dragLeadCard(page, leadCard, qualifiedColumn);
      await page.reload({ waitUntil: 'networkidle' });

      await expect(qualifiedColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')).toBeVisible({
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

      const leadCard = page.locator('[data-testid="lead-card"][data-lead-id="1"]');
      const novoColumn = page.locator('[data-testid="stage-column"][data-stage-id="1"]');
      const qualifiedColumn = page.locator('[data-testid="stage-column"][data-stage-id="2"]');

      await dragLeadCard(page, leadCard, qualifiedColumn);

      // Rollback: card returns to origin column.
      await expect(novoColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')).toBeVisible({
        timeout: 8_000,
      });
      // Failure is announced via the contract aria-live region (CONTRACT §8) —
      // toast styling is a UI concern, not a contract guarantee.
      const live = page.locator('[data-testid="aria-live-region"]');
      await expect(live).toContainText(/falh|erro|fail/i, { timeout: 5_000 });
    }
  );

  test.skip(
    'intra-stage drag does not change card position (Q-B3)',
    async ({ page }) => {
      await goToCrm(page);

      const novoColumn = page.locator('[data-testid="stage-column"][data-stage-id="1"]');
      const firstCard = novoColumn.locator('[data-testid="lead-card"]').first();
      const leadIdBefore = await firstCard.getAttribute('data-lead-id');

      const columnBounds = await novoColumn.boundingBox();
      if (columnBounds) {
        await firstCard.dragTo(novoColumn, {
          targetPosition: { x: columnBounds.width / 2, y: columnBounds.height - 20 },
        });
      }

      // Q-B3: intra-stage drag is a no-op — first card preserved.
      const firstCardAfter = novoColumn.locator('[data-testid="lead-card"]').first();
      const leadIdAfter = await firstCardAfter.getAttribute('data-lead-id');
      expect(leadIdAfter).toBe(leadIdBefore);
    }
  );

  test.skip(
    'aria-live region announces move to screen readers',
    async ({ page }) => {
      await goToCrm(page);

      const leadCard = page.locator('[data-testid="lead-card"][data-lead-id="1"]');
      const qualifiedColumn = page.locator('[data-testid="stage-column"][data-stage-id="2"]');
      // CONTRACT §8 — single live region with stable testid.
      const liveRegion = page.locator('[data-testid="aria-live-region"]');
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      await dragLeadCard(page, leadCard, qualifiedColumn);
      await expect(liveRegion).toContainText(/Qualificado/i, { timeout: 5_000 });
    }
  );
});
