/**
 * algorythmo_cut_campaigns — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-001:
 *   ON  → /app/accounts/:id/campaigns redirects to /dashboard, sidebar
 *         link hidden.
 *   OFF → upstream Campaigns surface remains available.
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

test.describe('campaigns — flag off: surface restored', () => {
  test('sidebar shows Campaigns + route loads + heading visible', async ({
    page,
  }) => {
    await withFlag(page, 'campaigns', false, async () => {
      await expectSurfaceVisible(page, 'campaigns', {
        sidebarLabel: SIDEBAR_LABEL,
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
        // Top-level item — verify absence on the main dashboard.
        sidebarContext: '/app/accounts/1/dashboard',
      });
    });
  });
});
