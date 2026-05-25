/**
 * algorythmo_cut_macros — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-009.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/macros';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /macros/i;
const HEADING = /macros/i;

test.describe('macros — flag off: surface restored', () => {
  test('Settings nav shows Macros + route loads', async ({ page }) => {
    await withFlag(page, 'macros', false, async () => {
      await expectSurfaceVisible(page, 'macros', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('macros — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Macros', async ({
    page,
  }) => {
    await withFlag(page, 'macros', true, async () => {
      await expectSurfaceBlocked(page, 'macros', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
