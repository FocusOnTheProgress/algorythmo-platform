/**
 * algorythmo_cut_billing_settings — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-007.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/billing';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /billing/i;
const HEADING = /billing/i;

test.describe('billing_settings — flag off: surface restored', () => {
  test('Settings nav shows Billing + route loads', async ({ page }) => {
    await withFlag(page, 'billing_settings', false, async () => {
      await expectSurfaceVisible(page, 'billing_settings', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('billing_settings — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Billing', async ({
    page,
  }) => {
    await withFlag(page, 'billing_settings', true, async () => {
      await expectSurfaceBlocked(page, 'billing_settings', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
