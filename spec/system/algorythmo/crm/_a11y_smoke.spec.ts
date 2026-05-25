/**
 * A11y smoke — axe-core scan on /crm and /crm/pipeline
 *
 * Gate: zero critical or serious WCAG AA violations. Fails CI if violations found.
 *
 * Uses `@axe-core/playwright` (Deque official) — verify it is installed:
 *   pnpm list @axe-core/playwright
 * If not: pnpm add -D @axe-core/playwright
 *
 * API: import { AxeBuilder } from '@axe-core/playwright'
 *   const results = await new AxeBuilder({ page })
 *     .withTags(['wcag2a', 'wcag2aa'])
 *     .analyze();
 *
 * Plan ref:
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.13
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 9
 *   docs/algorythmo/crm/A11Y.md (WCAG gate criteria)
 *
 * Status: LIVE (un-skipped in M1-C/PR5). The inner `test.skip(true, ...)` guards
 * skip at runtime if @axe-core/playwright is missing, so CI machines without
 * the dep still pass instead of fail.
 */

import { test, expect } from '@playwright/test';
import {
  loginAsAdmin,
  goToCrm,
  goToPipelineConfig,
  mockDefaultPipeline,
  mockLeads,
} from './_fixture';

const GATING_IMPACTS = new Set(['critical', 'serious']);

/**
 * Lazy-load AxeBuilder so the file still loads when @axe-core/playwright is
 * not installed. Lets `playwright test --list` collect the test without error.
 *
 * Returns null if package is missing — tests self-skip in that case.
 */
async function getAxeBuilder() {
  try {
    const mod = await import('@axe-core/playwright');
    return mod.AxeBuilder;
  } catch {
    return null;
  }
}

test.describe('A11y smoke — axe-core WCAG AA gate', () => {
  test('/crm returns zero axe violations (critical + serious)', async ({
    page,
  }) => {
    const AxeBuilder = await getAxeBuilder();
    if (!AxeBuilder) {
      test.skip(
        true,
        '@axe-core/playwright not installed — run: pnpm add -D @axe-core/playwright'
      );
      return;
    }

    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    await mockLeads(page, []);
    await goToCrm(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const gating = results.violations.filter(v =>
      GATING_IMPACTS.has(v.impact ?? '')
    );

    if (gating.length > 0) {
      const summary = gating
        .map(
          v =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes
              .slice(0, 3)
              .map(n => n.html)
              .join(', ')}`
        )
        .join('\n\n');
      throw new Error(
        `axe found ${gating.length} gating violation(s) on /crm:\n\n${summary}`
      );
    }

    // Non-gating violations are surfaced for visibility but do not fail CI
    const nonGating = results.violations.filter(
      v => !GATING_IMPACTS.has(v.impact ?? '')
    );
    if (nonGating.length > 0) {
      console.warn(
        `[axe] ${nonGating.length} non-gating violation(s) on /crm (moderate/minor) — not blocking:`
      );
      nonGating.forEach(v =>
        console.warn(`  [${v.impact}] ${v.id}: ${v.description}`)
      );
    }

    expect(gating).toHaveLength(0);
  });

  test('/crm/pipeline returns zero axe violations (critical + serious)', async ({
    page,
  }) => {
    const AxeBuilder = await getAxeBuilder();
    if (!AxeBuilder) {
      test.skip(
        true,
        '@axe-core/playwright not installed — run: pnpm add -D @axe-core/playwright'
      );
      return;
    }

    await loginAsAdmin(page);
    await mockDefaultPipeline(page);
    // Defensive: /crm/pipeline may surface per-stage lead counts that fire
    // /leads requests. Stub them to avoid networkidle hangs even if the
    // page does not (today) hit /leads — costs nothing if unused.
    await mockLeads(page, []);
    await goToPipelineConfig(page);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const gating = results.violations.filter(v =>
      GATING_IMPACTS.has(v.impact ?? '')
    );

    if (gating.length > 0) {
      const summary = gating
        .map(
          v =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes
              .slice(0, 3)
              .map(n => n.html)
              .join(', ')}`
        )
        .join('\n\n');
      throw new Error(
        `axe found ${gating.length} gating violation(s) on /crm/pipeline:\n\n${summary}`
      );
    }

    const nonGating = results.violations.filter(
      v => !GATING_IMPACTS.has(v.impact ?? '')
    );
    if (nonGating.length > 0) {
      console.warn(
        `[axe] ${nonGating.length} non-gating violation(s) on /crm/pipeline (moderate/minor):`
      );
      nonGating.forEach(v =>
        console.warn(`  [${v.impact}] ${v.id}: ${v.description}`)
      );
    }

    expect(gating).toHaveLength(0);
  });
});
