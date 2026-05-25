/**
 * algorythmo_cut_dashboard_apps — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-010. Note: Dashboard Apps is the ONLY cut surface
 * with no sidebar entry — it lives as a sub-tab inside Settings > Integrations
 * (route `/app/accounts/:id/settings/integrations/dashboard_apps`). The
 * positive assertion therefore relies on the route loading + heading; the
 * blocked assertion relies on the route redirecting to /dashboard.
 *
 * `sidebarLabel: null` skips the sidebar visibility check in the helpers.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/integrations/dashboard_apps';
const HEADING = /dashboard apps/i;

test.describe('dashboard_apps — flag off: surface restored', () => {
  test('integrations sub-tab loads + heading visible', async ({ page }) => {
    await withFlag(page, 'dashboard_apps', false, async () => {
      await expectSurfaceVisible(page, 'dashboard_apps', {
        sidebarLabel: null, // no sidebar entry — in-page tab only
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
      });
    });
  });
});

test.describe('dashboard_apps — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard', async ({ page }) => {
    await withFlag(page, 'dashboard_apps', true, async () => {
      await expectSurfaceBlocked(page, 'dashboard_apps', {
        sidebarLabel: null,
        routePath: ROUTE,
      });
    });
  });
});
