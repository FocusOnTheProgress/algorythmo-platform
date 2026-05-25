/**
 * D6.2 — Stage history list in drawer (M1-C/PR3 endpoint + PR4 UI wire).
 *
 * Validates the §6.3 / §7.1 contract:
 *   - GET /leads/:id/stage_history returns `{ stage_history: [...], truncated: bool }`.
 *   - Drawer renders entries newest-first via `[data-testid="drawer-stage-history-list"]`.
 *   - Footer "Mostrando últimos 100" renders only when `truncated: true`.
 *
 * Selector contract (CONTRACT_M1B v1.1.0 §7):
 *   - drawer-stage-history-list → <ol> root; items are <li> with data-stage-history-id.
 *
 * Status: SKIPPED until PR 4 (frontend wire) merges to algorythmo/main —
 *   the drawer-stage-history-list element and the lazy-load on drawer open
 *   do not exist in main until then. To un-skip: delete the
 *   `test.skip(true, ...)` line below.
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

const LEAD_ID = 300;

function buildHistoryEntry(opts: {
  id: number;
  fromStageId: number | null;
  toStageId: number;
  toStageName: string;
  actorType?: 'user' | 'agent_bot' | 'system';
  actorName?: string;
  secondsAgo: number;
}) {
  return {
    id: opts.id,
    from_stage_id: opts.fromStageId,
    to_stage_id: opts.toStageId,
    to_stage_name: opts.toStageName,
    actor_type: opts.actorType ?? 'system',
    actor_id: opts.actorType === 'user' ? 1 : null,
    actor_summary: opts.actorName
      ? { id: 1, name: opts.actorName, type: opts.actorType ?? 'user' }
      : null,
    created_at: new Date(Date.now() - opts.secondsAgo * 1000).toISOString(),
  };
}

async function mockStageHistory(
  page: import('@playwright/test').Page,
  leadId: number,
  payload: { stage_history: ReturnType<typeof buildHistoryEntry>[]; truncated: boolean }
) {
  await page.route(
    `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads/${leadId}/stage_history`,
    async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    }
  );
}

test.describe('D6.2 — Stage history drawer (drawer-stage-history-list)', () => {
  test.skip(
    true,
    'Waiting on PR 4 merge — drawer-stage-history-list and lazy-load are not in main yet. Unskip after rebase onto algorythmo/main once PR 4 lands.'
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [
      mockLead({ id: LEAD_ID, stageId: 1, contactName: 'Histórico Teste' }),
    ]);
  });

  test('drawer lists entries newest-first', async ({ page }) => {
    // Three transitions: oldest → newest. The endpoint returns them already
    // ordered newest-first (controller does .order(created_at: :desc)).
    await mockStageHistory(page, LEAD_ID, {
      stage_history: [
        buildHistoryEntry({
          id: 30,
          fromStageId: 2,
          toStageId: 3,
          toStageName: 'Proposta',
          actorType: 'user',
          actorName: 'Carlos',
          secondsAgo: 60,
        }),
        buildHistoryEntry({
          id: 20,
          fromStageId: 1,
          toStageId: 2,
          toStageName: 'Qualificado',
          actorType: 'user',
          actorName: 'Carlos',
          secondsAgo: 600,
        }),
        buildHistoryEntry({
          id: 10,
          fromStageId: null,
          toStageId: 1,
          toStageName: 'Novo',
          actorType: 'system',
          secondsAgo: 3600,
        }),
      ],
      truncated: false,
    });

    await goToCrm(page);
    await page
      .locator(`[data-testid="lead-card"][data-lead-id="${LEAD_ID}"]`)
      .click();

    const list = page.locator('[data-testid="drawer-stage-history-list"]');
    await expect(list).toBeVisible({ timeout: 5_000 });

    const items = list.locator('li[data-stage-history-id]');
    await expect(items).toHaveCount(3);

    // Newest-first: id 30 must come before id 20 must come before id 10.
    const ids = await items.evaluateAll(els =>
      els.map(el => el.getAttribute('data-stage-history-id'))
    );
    expect(ids).toEqual(['30', '20', '10']);
  });

  test('truncated footer renders only when payload says truncated:true', async ({
    page,
  }) => {
    const entries = Array.from({ length: 100 }, (_, i) =>
      buildHistoryEntry({
        id: 1000 - i,
        fromStageId: 1,
        toStageId: 2,
        toStageName: 'Qualificado',
        actorType: 'user',
        actorName: 'Bot',
        secondsAgo: 60 + i * 10,
      })
    );
    await mockStageHistory(page, LEAD_ID, {
      stage_history: entries,
      truncated: true,
    });

    await goToCrm(page);
    await page
      .locator(`[data-testid="lead-card"][data-lead-id="${LEAD_ID}"]`)
      .click();

    const list = page.locator('[data-testid="drawer-stage-history-list"]');
    await expect(list).toBeVisible({ timeout: 5_000 });

    // Footer copy is owned by frontend i18n; the i18n key is
    // ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.TRUNCATED. The substring "100" is
    // load-bearing and the contract says "Mostrando últimos 100".
    const drawer = page.locator('[data-testid="lead-detail-drawer"]');
    await expect(drawer).toContainText(/Mostrando últimos\s*100/);
  });

  test('truncated footer is absent when truncated:false', async ({ page }) => {
    await mockStageHistory(page, LEAD_ID, {
      stage_history: [
        buildHistoryEntry({
          id: 10,
          fromStageId: null,
          toStageId: 1,
          toStageName: 'Novo',
          actorType: 'system',
          secondsAgo: 3600,
        }),
      ],
      truncated: false,
    });

    await goToCrm(page);
    await page
      .locator(`[data-testid="lead-card"][data-lead-id="${LEAD_ID}"]`)
      .click();

    const list = page.locator('[data-testid="drawer-stage-history-list"]');
    await expect(list).toBeVisible({ timeout: 5_000 });

    const drawer = page.locator('[data-testid="lead-detail-drawer"]');
    await expect(drawer).not.toContainText(/Mostrando últimos\s*100/);
  });
});
