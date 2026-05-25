/**
 * algorythmo_cut_reports_bot — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-012a. Sidebar label is "Bot" inside the Reports
 * section nav — verified at /reports/overview where the Reports nav mounts.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/reports/bot';
const REPORTS_CONTEXT = '/app/accounts/1/reports/overview';
const SIDEBAR_LABEL = /^bot$/i;
const HEADING = /bot|reports/i;

test.describe('reports_bot — flag off: surface restored', () => {
  // M2-B1 known gap: the Bot tab inside Reports is gated upstream by
  // `featureFlag: FEATURE_FLAGS.REPORTS` (see settings/reports/reports.routes.js
  // and the Reports nav). The CI seed does not toggle the REPORTS feature flag,
  // so the tab is hidden by the upstream guard regardless of the Algorythmo
  // cut flag. The cut-flag hard block (the D5 critical path) is still covered
  // by the 'flag on' describe below. Restoring this assertion requires the CI
  // seed to enable the REPORTS feature flag — tracked separately.
  test.fixme('Reports nav shows Bot + route loads', async ({ page }) => {
    await withFlag(page, 'reports_bot', false, async () => {
      await expectSurfaceVisible(page, 'reports_bot', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: REPORTS_CONTEXT,
      });
    });
  });
});

test.describe('reports_bot — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Reports nav hides Bot tab', async ({
    page,
  }) => {
    await withFlag(page, 'reports_bot', true, async () => {
      await expectSurfaceBlocked(page, 'reports_bot', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: REPORTS_CONTEXT,
      });
    });
  });
});
