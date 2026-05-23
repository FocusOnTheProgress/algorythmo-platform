/**
 * A11y smoke — axe-core scan on /crm and /crm/pipeline
 *
 * Gate: zero critical or serious WCAG AA violations. Fails CI if violations found.
 *
 * Uses `@axe-core/playwright` — verify it is installed:
 *   pnpm list @axe-core/playwright
 * If not: pnpm add -D @axe-core/playwright
 *
 * Plan ref:
 *   docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.13
 *   docs/plans/0001-mvp-algorythmo-os.md §3 criterio 9
 *   docs/algorythmo/crm/A11Y.md (WCAG gate criteria)
 *
 * Status: SCAFFOLD — test.skip() until:
 *   1. /crm route is live (Sessão C ships CrmKanbanView).
 *   2. @axe-core/playwright is installed.
 * Fase 2: remove skip, let it run as a live gate.
 */

import { test, expect as _expect } from './_fixture';
import { loginAsAdmin, goToCrm, goToPipelineConfig } from './_fixture';

// Lazy import axe so the file still loads when axe is not installed.
// This lets `playwright test --list` collect the test without erroring.
async function getAxe() {
  try {
    const { checkA11y, injectAxe } = await import('@axe-core/playwright');
    return { checkA11y, injectAxe };
  } catch {
    return null;
  }
}

test.describe('A11y smoke — axe-core WCAG AA gate', () => {
  test.skip(
    '/crm returns zero axe violations (critical + serious)',
    async ({ page }) => {
      const axe = await getAxe();
      if (!axe) {
        test.skip(true, '@axe-core/playwright not installed — run: pnpm add -D @axe-core/playwright');
        return;
      }

      await loginAsAdmin(page);
      await goToCrm(page);

      await axe.injectAxe(page);
      await axe.checkA11y(page, undefined, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa'],
          },
        },
        // Only gate on critical and serious — informational and minor
        // are documented as roadmap in A11Y.md
        violationCallback: (violations) => {
          const gating = violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
          );
          if (gating.length > 0) {
            const summary = gating
              .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
              .join('\n');
            throw new Error(
              `axe found ${gating.length} gating violation(s) on /crm:\n${summary}`
            );
          }
        },
      });
    }
  );

  test.skip(
    '/crm/pipeline returns zero axe violations (critical + serious)',
    async ({ page }) => {
      const axe = await getAxe();
      if (!axe) {
        test.skip(true, '@axe-core/playwright not installed');
        return;
      }

      await loginAsAdmin(page);
      await goToPipelineConfig(page);

      await axe.injectAxe(page);
      await axe.checkA11y(page, undefined, {
        detailedReport: true,
        axeOptions: {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
        },
        violationCallback: (violations) => {
          const gating = violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
          );
          if (gating.length > 0) {
            const summary = gating
              .map((v) => `[${v.impact}] ${v.id}: ${v.description}`)
              .join('\n');
            throw new Error(
              `axe found ${gating.length} gating violation(s) on /crm/pipeline:\n${summary}`
            );
          }
        },
      });
    }
  );
});
