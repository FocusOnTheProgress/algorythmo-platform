/**
 * algorythmo_cut_security_settings — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-006.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/security';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /^security$/i;
const HEADING = /security/i;

test.describe('security_settings — flag off: surface restored', () => {
  test('Settings nav shows Security + route loads', async ({ page }) => {
    await withFlag(page, 'security_settings', false, async () => {
      await expectSurfaceVisible(page, 'security_settings', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('security_settings — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Security', async ({
    page,
  }) => {
    await withFlag(page, 'security_settings', true, async () => {
      await expectSurfaceBlocked(page, 'security_settings', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
