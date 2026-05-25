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
  test('Reports nav shows Bot + route loads', async ({ page }) => {
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
