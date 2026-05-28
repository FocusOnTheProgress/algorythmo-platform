/**
 * algorythmo_cut_campaigns — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-001 + plan 0007 D8:
 *   ON  → /app/accounts/:id/campaigns redirects to /dashboard.
 *   OFF → upstream Campaigns *route* remains available via direct nav.
 *
 * M2-a (D8) retired the top-level Campaigns sidebar entry — Campaigns moves
 * into the Marketing sector as a sub-tab in M2-d. The route stays live, so the
 * flag still governs whether direct navigation is allowed, but there is no
 * longer a top-level sidebar link in either flag state. The sidebar-visibility
 * assertion is therefore dropped from the "surface restored" block; the
 * "hard block" block keeps its absence assertion (now always true).
 *
 * Default state on a new account is OFF (cut inactive). Both blocks below
 * wrap toggles in `withFlag` so the post-test state matches the pre-test
 * state regardless of ordering or failure.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/campaigns';
const SIDEBAR_LABEL = /^campaigns$/i;
const HEADING = /campaign|live chat|sms|whatsapp/i;

test.describe('campaigns — flag off: route restored (no top-level sidebar entry)', () => {
  test('direct nav loads route + heading visible', async ({ page }) => {
    await withFlag(page, 'campaigns', false, async () => {
      // algorythmo: D8 — Campaigns is no longer a top-level sidebar link, so
      // sidebarLabel is intentionally omitted. We assert only that the route
      // still loads (lives on, reachable via URL + future Marketing sub-tab).
      await expectSurfaceVisible(page, 'campaigns', {
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
      });
    });
  });
});

test.describe('campaigns — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, sidebar link absent', async ({
    page,
  }) => {
    await withFlag(page, 'campaigns', true, async () => {
      await expectSurfaceBlocked(page, 'campaigns', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        // algorythmo: D8 — entry removed top-level; absence holds on dashboard.
        sidebarContext: '/app/accounts/1/dashboard',
      });
    });
  });
});
