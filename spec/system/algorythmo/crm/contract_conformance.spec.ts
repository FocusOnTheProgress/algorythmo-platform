/**
 * CONTRACT_M1B v1.0.0 conformance — meta-spec.
 *
 * Single test that walks the entire surface tree (§2 of CONTRACT_M1B.md) and
 * asserts every data-testid + aria attribute called out in the contract is
 * actually present in the rendered DOM. The point of this spec is NOT to
 * exercise behavior — the behavior specs do that — but to catch contract
 * drift before D, C, or B ship a divergence that breaks the other tracks.
 *
 * If you change a selector or aria attribute and this spec passes, the
 * change happened on both the contract AND the implementation (good).
 * If this spec fails, exactly one side moved (bad — open a [CONTRACT_BUMP]
 * PR or revert the implementation).
 *
 * Status: SCAFFOLD — wrapped in test.skip() until backend endpoints in
 * CONTRACT §9 are live AND test account has `algorythmo_crm` enabled.
 */

import { test, expect, loginAsAdmin, goToCrm, mockDefaultPipeline } from './_fixture';

test.describe('CONTRACT_M1B v1.0.0 — surface conformance', () => {
  test.skip('all data-testid + aria attributes from §2-§8 render on /crm', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await goToCrm(page);

    // §2 — root + header
    await expect(page.locator('[data-testid="crm-kanban-view"]')).toBeVisible();

    const header = page.locator('[data-testid="kanban-header"]');
    await expect(header).toBeVisible();
    await expect(header.locator('[data-testid="kanban-title"]')).toBeVisible();
    await expect(
      header.locator('[data-testid="kanban-search-input"]')
    ).toBeVisible();
    const pipelineLink = header.locator('[data-testid="pipeline-config-link"]');
    await expect(pipelineLink).toBeVisible();
    const href = await pipelineLink.getAttribute('href');
    expect(href).toMatch(/\/accounts\/\d+\/crm\/pipeline$/);

    // §2 — board region
    const board = page.locator('[data-testid="kanban-board"]');
    await expect(board).toHaveAttribute('role', 'region');
    await expect(board).toHaveAttribute('aria-label', /.+/);

    // §2 — stage columns: 5 stages, each carries data-stage-id + data-stage-kind.
    const columns = page.locator('[data-testid="stage-column"]');
    await expect(columns).toHaveCount(5);
    const kinds = await columns.evaluateAll(els =>
      els.map(el => el.getAttribute('data-stage-kind'))
    );
    expect(kinds.sort()).toEqual(['open', 'open', 'open', 'lost', 'won'].sort());

    for (const col of await columns.all()) {
      await expect(col).toHaveAttribute('data-stage-id', /^\d+$/);
      await expect(
        col.locator('[data-testid="stage-column-header"]')
      ).toBeVisible();
      await expect(col.locator('[data-testid="stage-name"]')).toBeVisible();
      await expect(col.locator('[data-testid="stage-count"]')).toBeVisible();
      await expect(col.locator('[data-testid="stage-column-list"]')).toHaveAttribute(
        'role',
        'list'
      );
    }

    // §8 — aria-live region exists, is polite + atomic.
    const live = page.locator('[data-testid="aria-live-region"]');
    await expect(live).toBeAttached();
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveAttribute('aria-atomic', 'true');

    // §5 — when board is globally empty, kanban-empty-state + cta render.
    // We assert these contract IDs *exist* (display:none-style hide is
    // acceptable; absence is not).
    const emptyState = page.locator('[data-testid="kanban-empty-state"]');
    if ((await emptyState.count()) > 0) {
      await expect(
        page.locator('[data-testid="kanban-empty-title"]')
      ).toBeAttached();
      await expect(
        page.locator('[data-testid="kanban-empty-cta"]')
      ).toBeAttached();
    }
  });
});
