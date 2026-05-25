/**
 * algorythmo_cut_custom_roles — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-005.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/custom-roles';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /custom roles/i;
const HEADING = /custom roles/i;

test.describe('custom_roles — flag off: surface restored', () => {
  test('Settings nav shows Custom Roles + route loads', async ({ page }) => {
    await withFlag(page, 'custom_roles', false, async () => {
      await expectSurfaceVisible(page, 'custom_roles', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('custom_roles — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Custom Roles', async ({
    page,
  }) => {
    await withFlag(page, 'custom_roles', true, async () => {
      await expectSurfaceBlocked(page, 'custom_roles', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
