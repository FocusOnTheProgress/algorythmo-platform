/**
 * algorythmo_cut_sla — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-003:
 *   ON  → /app/accounts/:id/settings/sla redirects to /dashboard,
 *         Settings nav hides SLA entry.
 *   OFF → upstream SLA management remains available.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/sla';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /^sla$/i;
const HEADING = /sla|service level/i;

test.describe('sla — flag off: surface restored', () => {
  test('Settings nav shows SLA + route loads', async ({ page }) => {
    await withFlag(page, 'sla', false, async () => {
      await expectSurfaceVisible(page, 'sla', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('sla — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides SLA', async ({
    page,
  }) => {
    await withFlag(page, 'sla', true, async () => {
      await expectSurfaceBlocked(page, 'sla', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
