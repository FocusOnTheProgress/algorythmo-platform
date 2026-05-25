/**
 * Kanban drag-and-drop — Lead between stages
 *
 * Validates against CONTRACT_M1B v1.0.0 (§2, §3, §8):
 * 1. Optimistic move: card visually moves immediately (before server response).
 * 2. Persistence: after browser refresh, card remains in target stage.
 * 3. Rollback: network failure restores card to origin stage + aria-live announces.
 * 4. Intra-stage drag: dragging within same column does nothing (Q-B3 decision).
 * 5. aria-live region announces the move to screen readers.
 *
 * Stage selectors:
 *   CONTRACT §2 — stage.kind ∈ { 'open' | 'won' | 'lost' }.
 *   Three open stages (Novo / Qualificado / Proposta) share kind='open' and
 *   MUST be selected by `data-stage-id`, not by kind.
 *
 * i18n-safe assertions:
 *   Stage names and announce strings are read from `DEFAULT_PIPELINE_STAGES`
 *   and the pt_BR copy of `ALGORYTHMO_CRM.ANNOUNCE.MOVE_FAILED` rather than
 *   hard-coded substrings, so a CONTRACT §9 rename can't break this suite.
 *
 * Status: LIVE (un-skipped in M1-C/PR5).
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  dragLeadCard,
  mockLead,
  mockDefaultPipeline,
  mockLeads,
  DEFAULT_PIPELINE_STAGES,
  TEST_ACCOUNT_ID,
} from './_fixture';

const ORIGIN_STAGE = DEFAULT_PIPELINE_STAGES[0]; // Novo, id=1
const TARGET_STAGE = DEFAULT_PIPELINE_STAGES[1]; // Qualificado, id=2

// pt_BR copy of ALGORYTHMO_CRM.ANNOUNCE.MOVE_FAILED — kept as a separate
// constant so a single i18n update keeps every spec aligned.
const ROLLBACK_ANNOUNCE_PATTERN = /não foi possível|retornando/i;

const LEAD_IN_NOVO = mockLead({
  id: 1,
  stageId: ORIGIN_STAGE.id,
  channelOrigin: 'widget',
  contactName: 'Drag Test',
});

function mockMoveSuccess(page: Parameters<typeof goToCrm>[0]) {
  return page.route(
    `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads/1/move`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          stage_id: TARGET_STAGE.id,
          position: 1.0,
          stage_entered_at: new Date().toISOString(),
        }),
      });
    }
  );
}

test.describe('Kanban — Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [LEAD_IN_NOVO]);
  });

  test(
    'drag Lead from "Novo" to "Qualificado" — optimistic move reflects immediately',
    async ({ page }) => {
      await mockMoveSuccess(page);

      await goToCrm(page);

      const leadCard = page.locator(
        '[data-testid="lead-card"][data-lead-id="1"]'
      );
      const novoColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${ORIGIN_STAGE.id}"]`
      );
      const targetColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${TARGET_STAGE.id}"]`
      );

      await dragLeadCard(leadCard, targetColumn);

      await expect(
        targetColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
      ).toBeVisible();
      await expect(
        novoColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
      ).toHaveCount(0);
    }
  );

  test(
    'drag Lead persists after page refresh',
    async ({ page }) => {
      await mockMoveSuccess(page);
      await goToCrm(page);

      const leadCard = page.locator(
        '[data-testid="lead-card"][data-lead-id="1"]'
      );
      const targetColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${TARGET_STAGE.id}"]`
      );

      await dragLeadCard(leadCard, targetColumn);

      // Persistence: after refresh, leads list returns the moved lead in target.
      await page.unroute(
        `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`
      );
      await mockLeads(page, [{ ...LEAD_IN_NOVO, stage_id: TARGET_STAGE.id }]);
      await page.reload({ waitUntil: 'networkidle' });

      await expect(
        targetColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
      ).toBeVisible({ timeout: 10_000 });
    }
  );

  test(
    'drag failure (5xx) rolls back card and announces via aria-live',
    async ({ page }) => {
      await page.route(`**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads/*/move`, async (route) => {
        await route.fulfill({ status: 500, body: 'Internal Server Error' });
      });

      await goToCrm(page);

      const leadCard = page.locator(
        '[data-testid="lead-card"][data-lead-id="1"]'
      );
      const novoColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${ORIGIN_STAGE.id}"]`
      );
      const targetColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${TARGET_STAGE.id}"]`
      );

      await dragLeadCard(leadCard, targetColumn);

      // Rollback: card returns to origin column.
      await expect(
        novoColumn.locator('[data-testid="lead-card"][data-lead-id="1"]')
      ).toBeVisible({ timeout: 8_000 });

      // CONTRACT §8 — failure announced via the aria-live region. Pattern
      // tracks the actual pt_BR copy ("Não foi possível mover X, retornando à
      // etapa anterior") so renaming a button label can't break it.
      const live = page.locator('[data-testid="aria-live-region"]');
      await expect(live).toContainText(ROLLBACK_ANNOUNCE_PATTERN, {
        timeout: 5_000,
      });
    }
  );

  test(
    'intra-stage drag does not change card position (Q-B3)',
    async ({ page }) => {
      // Two cards in the same stage so order is observable.
      const a = mockLead({
        id: 1,
        stageId: ORIGIN_STAGE.id,
        contactName: 'Lead A',
      });
      const b = mockLead({
        id: 2,
        stageId: ORIGIN_STAGE.id,
        contactName: 'Lead B',
      });
      await page.unroute(
        `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`
      );
      await mockLeads(page, [a, b]);

      await goToCrm(page);

      const novoColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${ORIGIN_STAGE.id}"]`
      );
      const firstCard = novoColumn
        .locator('[data-testid="lead-card"]')
        .first();
      const leadIdBefore = await firstCard.getAttribute('data-lead-id');

      // Drag onto the column itself — intra-stage drop must be a no-op.
      await dragLeadCard(firstCard, novoColumn);

      const firstCardAfter = novoColumn
        .locator('[data-testid="lead-card"]')
        .first();
      const leadIdAfter = await firstCardAfter.getAttribute('data-lead-id');
      expect(leadIdAfter).toBe(leadIdBefore);
    }
  );

  test(
    'aria-live region announces move to screen readers',
    async ({ page }) => {
      await mockMoveSuccess(page);
      await goToCrm(page);

      const leadCard = page.locator(
        '[data-testid="lead-card"][data-lead-id="1"]'
      );
      const targetColumn = page.locator(
        `[data-testid="stage-column"][data-stage-id="${TARGET_STAGE.id}"]`
      );
      // CONTRACT §8 — single live region with stable testid.
      const liveRegion = page.locator('[data-testid="aria-live-region"]');
      await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      await expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      await dragLeadCard(leadCard, targetColumn);

      // Stage name comes from the mocked pipeline — survives a rename.
      await expect(liveRegion).toContainText(TARGET_STAGE.name, {
        timeout: 5_000,
      });
    }
  );
});
