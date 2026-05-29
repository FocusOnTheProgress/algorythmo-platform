/**
 * CONTRACT_M1B v1.0.0 conformance — meta-spec.
 *
 * Walks the surface tree defined in CONTRACT_M1B.md and asserts every
 * data-testid + aria attribute called out by the contract actually renders
 * on /crm. The point is NOT to exercise behavior — the behavior specs do
 * that — but to catch contract drift before D, C, or B ship a divergence
 * that breaks the other tracks.
 *
 * The meta-spec is split into one `test()` per CONTRACT section so a single
 * run surfaces ALL drifts at once instead of stopping at the first failed
 * assertion. Each section is self-contained and chooses its own mock setup,
 * since §5 (empty board) and §2-§4 (populated board) require mutually
 * exclusive board states.
 *
 * Status: LIVE (un-skipped in M1-C/PR5).
 */

import {
  test,
  expect,
  loginAsAdmin,
  goToCrm,
  mockDefaultPipeline,
  mockLeads,
  mockLead,
  DEFAULT_PIPELINE_STAGES,
} from './_fixture';

const AGING_LEAD = mockLead({
  id: 901,
  stageId: 1,
  channelOrigin: 'whatsapp',
  contactName: 'Conformance Lead',
  secondsInStage: 3600, // 1h on a stage with aging_coefficient 1.0 → green
});

const VALID_AGING_STATES = ['neutral', 'green', 'yellow', 'red'];
const VALID_AGING_GLYPHS = ['—', '●', '◐', '○'];

// Intentionally NOT serial — each test owns its mock setup so a §2 failure
// doesn't mask §3-§8 drift. Running parallel surfaces every contract delta
// in one CI pass instead of stopping at the first broken section.
test.describe('CONTRACT_M1B v1.0.0 — surface conformance', () => {
  test('§2 — root, header, board region, and stage columns render', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [AGING_LEAD]);
    await goToCrm(page);

    await expect(
      page.locator('[data-testid="crm-kanban-view"]')
    ).toBeVisible();

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

    const board = page.locator('[data-testid="kanban-board"]');
    await expect(board).toHaveAttribute('role', 'region');
    await expect(board).toHaveAttribute('aria-label', /.+/);

    const columns = page.locator('[data-testid="stage-column"]');
    await expect(columns).toHaveCount(5);
    const kinds = await columns.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-stage-kind'))
    );
    expect(kinds.sort()).toEqual(['open', 'open', 'open', 'lost', 'won'].sort());

    for (const col of await columns.all()) {
      await expect(col).toHaveAttribute('data-stage-id', /^\d+$/);
      await expect(
        col.locator('[data-testid="stage-column-header"]')
      ).toBeVisible();
      await expect(col.locator('[data-testid="stage-name"]')).toBeVisible();
      await expect(col.locator('[data-testid="stage-count"]')).toBeVisible();
      await expect(
        col.locator('[data-testid="stage-column-list"]')
      ).toHaveAttribute('role', 'list');
    }
  });

  test('§3 — lead card carries data-channel, data-lead-id, data-stage-id, role, tabindex, aria-label, menu trigger', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [AGING_LEAD]);
    await goToCrm(page);

    const card = page.locator(
      `[data-testid="lead-card"][data-lead-id="${AGING_LEAD.id}"]`
    );
    await expect(card).toBeVisible({ timeout: 5_000 });

    await expect(card).toHaveAttribute('data-lead-id', String(AGING_LEAD.id));
    await expect(card).toHaveAttribute('data-stage-id', /^\d+$/);
    await expect(card).toHaveAttribute('data-channel', AGING_LEAD.channel_origin);
    await expect(card).toHaveAttribute('role', 'button');
    await expect(card).toHaveAttribute('tabindex', '0');
    const ariaLabel = await card.getAttribute('aria-label');
    expect(ariaLabel ?? '').not.toBe('');

    // Menu trigger must advertise the menu via aria-haspopup.
    const menuTrigger = card.locator(
      '[data-testid="lead-card-menu-trigger"]'
    );
    await expect(menuTrigger).toBeVisible();
    await expect(menuTrigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  test('§4 — aging chip + glyph render with valid state and aria-hidden glyph', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [AGING_LEAD]);
    await goToCrm(page);

    const chip = page
      .locator(`[data-testid="lead-card"][data-lead-id="${AGING_LEAD.id}"]`)
      .locator('[data-testid="lead-aging-chip"]');
    await expect(chip).toBeVisible({ timeout: 5_000 });

    const state = await chip.getAttribute('data-state');
    expect(state).not.toBeNull();
    expect(VALID_AGING_STATES).toContain(state as (typeof VALID_AGING_STATES)[number]);

    const glyph = chip.locator('[data-testid="lead-aging-chip-glyph"]');
    await expect(glyph).toBeVisible();
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    const glyphText = (await glyph.textContent())?.trim() ?? '';
    expect(VALID_AGING_GLYPHS).toContain(
      glyphText as (typeof VALID_AGING_GLYPHS)[number]
    );

    // Chip wrapper (or its parent in the card) must carry an aria-label
    // — state is announced via the wrapper, not the glyph.
    const chipAriaLabel = await chip.getAttribute('aria-label');
    expect(chipAriaLabel ?? '').not.toBe('');
  });

  test('§5 (global) — on-brand empty state (title + body, no Chatwoot CTA) renders when board is globally empty', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, []);
    await goToCrm(page);

    const emptyState = page.locator('[data-testid="kanban-empty-state"]');
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator('[data-testid="kanban-empty-title"]')
    ).toBeVisible();
    // C-3 (Cinematic OS): the Chatwoot "connect a channel" CTA + blue button
    // were removed. The empty state is editorial copy only — assert no CTA.
    await expect(
      page.locator('[data-testid="kanban-empty-cta"]')
    ).toHaveCount(0);

    // CONTRACT §5 — when global empty renders, the board MUST NOT be visible
    // to the user. `toBeHidden()` allows two equally valid implementations:
    // (a) v-if removes the node, (b) board mounted but visually suppressed
    // by the overlay. Asserting `toHaveCount(0)` would lock C.2 to strategy (a).
    await expect(page.locator('[data-testid="kanban-board"]')).toBeHidden();
  });

  test('§5 (per-column) — stage-empty-state + stage-empty-text render in empty stages while board has data', async ({
    page,
  }) => {
    const leadInOnlyOneStage = mockLead({
      id: 902,
      stageId: DEFAULT_PIPELINE_STAGES[0].id,
      contactName: 'Solo Lead',
    });
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [leadInOnlyOneStage]);
    await goToCrm(page);

    // Global empty must NOT render — board has at least one lead.
    await expect(
      page.locator('[data-testid="kanban-empty-state"]')
    ).toHaveCount(0);

    // Every empty stage must show stage-empty-state with its stage-id and
    // the stable stage-empty-text descendant.
    const emptyStageIds = DEFAULT_PIPELINE_STAGES.filter(
      (s) => s.id !== leadInOnlyOneStage.stage_id
    ).map((s) => s.id);

    for (const stageId of emptyStageIds) {
      const emptyMarker = page.locator(
        `[data-testid="stage-empty-state"][data-stage-id="${stageId}"]`
      );
      await expect(emptyMarker).toBeVisible();
      await expect(
        emptyMarker.locator('[data-testid="stage-empty-text"]')
      ).toBeVisible();
    }
  });

  test('§8 — aria-live region is attached, polite, atomic', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, [AGING_LEAD]);
    await goToCrm(page);

    const live = page.locator('[data-testid="aria-live-region"]');
    await expect(live).toBeAttached();
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await expect(live).toHaveAttribute('aria-atomic', 'true');
  });
});
