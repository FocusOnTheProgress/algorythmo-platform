/**
 * algorythmo_cut_help_center — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-002:
 *   ON  → /app/accounts/:id/portals redirects to /dashboard, sidebar link hidden.
 *   OFF → upstream Help Center / Portals surface remains available.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/portals';
const SIDEBAR_LABEL = /help center|portals/i;
const HEADING = /help center|portals|articles|knowledge/i;

test.describe('help_center — flag off: portals route restored', () => {
  // RODADA 3 P-3: Help Center is no longer a top-level sidebar entry — it lives
  // only as Customer Support inside Commercial, so the sidebar link was removed
  // for good (not flag-gated). The route-level help_center flag still controls
  // whether the underlying portals routes are reachable (Customer Support data
  // depends on them), so we assert the route, not the sidebar.
  test('portals route loads when the flag is off', async ({ page }) => {
    await withFlag(page, 'help_center', false, async () => {
      await expectSurfaceVisible(page, 'help_center', {
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
      });
    });
  });
});

test.describe('help_center — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, sidebar link absent', async ({
    page,
  }) => {
    await withFlag(page, 'help_center', true, async () => {
      await expectSurfaceBlocked(page, 'help_center', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: '/app/accounts/1/dashboard',
      });
    });
  });
});
