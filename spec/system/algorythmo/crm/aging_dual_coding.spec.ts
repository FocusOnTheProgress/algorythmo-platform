/**
 * Aging chip dual-coding — CONTRACT_M1B v1.0.0 §4
 *
 * Validates [data-testid="lead-aging-chip"]:
 *   - data-state ∈ {"neutral", "green", "yellow", "red"} drives color.
 *   - data-testid="lead-aging-chip-glyph" carries the colorblind affordance.
 *   - glyph is aria-hidden (state is in aria-label of the chip wrapper).
 *
 * Glyph table (CONTRACT §4):
 *   neutral → —   (won/lost OR aging_coefficient ∈ {0, null})
 *   green   → ●   (ratio < 1)
 *   yellow  → ◐   (1 ≤ ratio < 2)
 *   red     → ○   (ratio ≥ 2)
 *
 * Status: SCAFFOLD — tests .skip() until backend endpoints in CONTRACT §9 are
 * live AND test account has `algorythmo_crm` enabled.
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
    description:
      'chip shows neutral — when aging_coefficient = 0 (F6 guard, no divide)',
  },
];

test.describe('Aging chip — dual-coding (D10 + D11)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const lead of LEADS_BY_AGING) {
    test.skip(lead.description, async ({ page }) => {
      // Mock pipeline with stage aging_coefficient matching lead
      await page.route(
        `**/algorythmo/api/v1/accounts/*/pipelines/default`,
        async route => {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              pipeline: { id: 1, name: 'Default' },
              // CONTRACT §2 — stage.kind ∈ {'open' | 'won' | 'lost'}.
              stages: [
                {
                  id: 1,
                  name: 'Novo',
                  kind: 'open',
                  position: 1,
                  aging_coefficient: lead.aging_coefficient,
                },
                {
                  id: 4,
                  name: 'Fechado ganho',
                  kind: 'won',
                  position: 4,
                  aging_coefficient: 0.0,
                },
              ],
            }),
          });
        }
      );

      await page.route(
        `**/algorythmo/api/v1/accounts/*/leads*`,
        async route => {
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
        }
      );

      await goToCrm(page);

      const leadCard = page.locator(
        `[data-testid="lead-card"][data-lead-id="${lead.id}"]`
      );
      await expect(leadCard).toBeVisible({ timeout: 5_000 });

      const chip = leadCard.locator('[data-testid="lead-aging-chip"]');
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('data-state', lead.expected_state);

      // Dual-coding: glyph carries the colorblind affordance and is hidden
      // from AT (state is announced via the chip's aria-label).
      const glyph = chip.locator('[data-testid="lead-aging-chip-glyph"]');
      await expect(glyph).toHaveText(lead.expected_glyph);
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    });
  }
});
