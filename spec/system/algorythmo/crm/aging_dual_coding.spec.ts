/**
 * Aging chip dual-coding — color + glyph for colorblind accessibility (D10 + D11)
 *
 * Validates that the LeadAgingChip component:
 * 1. Shows the correct glyph per state: ● green / ◐ yellow / ○ red / — neutral.
 * 2. Applies the correct CSS data-state attribute (drives the color).
 * 3. Works correctly with aging_coefficient = 0 (closed stages, F6 guard).
 * 4. Renders all 4 states correctly (snapshot-grade behavior).
 *
 * Acceptance criteria ref:
 *   docs/plans/0001-mvp-algorythmo-os.md D10 + D11
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §3 T-B6 (LeadAgingChip spec)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.4 (DoD snapshot tests)
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §6 R9 (divide-by-zero guard)
 *
 * Glyph table (from design system _tokens.scss):
 *   neutral → —
 *   green   → ●
 *   yellow  → ◐
 *   red     → ○
 *
 * Status: SCAFFOLD — tests .skip() until Sessão C ships LeadAgingChip.vue (B-PR4).
 */

import { test, expect, loginAsAdmin, goToCrm } from './_fixture';

const LEADS_BY_AGING = [
  {
    id: 101,
    stage_id: 1,
    aging_coefficient: 1.0,
    seconds_in_stage: 3600, // 1h — ratio 1/12 ≈ 0.08 → green
    expected_state: 'green',
    expected_glyph: '●',
    description: 'chip shows green ● when ratio < 1',
  },
  {
    id: 102,
    stage_id: 1,
    aging_coefficient: 1.0,
    seconds_in_stage: 14400, // 4h — ratio 4/12 ≈ 0.33 → still green
    expected_state: 'green',
    expected_glyph: '●',
    description: 'chip shows green ● when ratio slightly above 0',
  },
  {
    id: 103,
    stage_id: 1,
    aging_coefficient: 1.0,
    seconds_in_stage: 43200 * 1.5, // 18h — ratio 1.5 → yellow
    expected_state: 'yellow',
    expected_glyph: '◐',
    description: 'chip shows yellow ◐ when ratio >= 1 and < 2',
  },
  {
    id: 104,
    stage_id: 1,
    aging_coefficient: 1.0,
    seconds_in_stage: 43200 * 2.5, // 30h — ratio 2.5 → red
    expected_state: 'red',
    expected_glyph: '○',
    description: 'chip shows red ○ when ratio >= 2',
  },
  {
    id: 105,
    stage_id: 4,
    aging_coefficient: 0.0, // closed stage — F6 guard
    seconds_in_stage: 86400, // 24h
    expected_state: 'neutral',
    expected_glyph: '—',
    description: 'chip shows neutral — when aging_coefficient = 0 (F6 guard, no divide)',
  },
];

test.describe('Aging chip — dual-coding (D10 + D11)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const lead of LEADS_BY_AGING) {
    test.skip(lead.description, async ({ page }) => {
      // Mock pipeline with stage aging_coefficient matching lead
      await page.route(`**/algorythmo/api/v1/accounts/*/pipelines/default`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            pipeline: { id: 1, name: 'Default' },
            stages: [
              { id: 1, name: 'Novo', kind: 'new', position: 1, aging_coefficient: lead.aging_coefficient },
              { id: 4, name: 'Fechado ganho', kind: 'won', position: 4, aging_coefficient: 0.0 },
            ],
          }),
        });
      });

      await page.route(`**/algorythmo/api/v1/accounts/*/leads*`, async (route) => {
        const url = route.request().url();
        const stageId = new URL(url).searchParams.get('stage_id');
        // Return lead in its target stage
        const targetStage = lead.stage_id.toString();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            leads:
              stageId === targetStage
                ? [
                    {
                      id: lead.id,
                      stage_id: lead.stage_id,
                      channel_origin: 'widget',
                      channel_metadata: { name: `Test Lead ${lead.id}` },
                      stage_entered_at: new Date(
                        Date.now() - lead.seconds_in_stage * 1000
                      ).toISOString(),
                      last_message_at: new Date().toISOString(),
                    },
                  ]
                : [],
            next_cursor: null,
          }),
        });
      });

      await goToCrm(page);

      const leadCard = page.locator(`[data-lead-id="${lead.id}"]`);
      await expect(leadCard).toBeVisible({ timeout: 5_000 });

      const chip = leadCard.locator('.alg-chip--aging');
      await expect(chip).toBeVisible();

      // Verify data-state attribute (drives CSS color)
      await expect(chip).toHaveAttribute('data-state', lead.expected_state);

      // Verify glyph text (dual-coding for colorblind)
      const glyph = chip.locator('.alg-chip__glyph');
      await expect(glyph).toHaveText(lead.expected_glyph);
      // Glyph must be aria-hidden (purely decorative, state is in aria-label)
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    });
  }
});
