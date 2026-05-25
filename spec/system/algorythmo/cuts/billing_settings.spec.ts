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
  // M2-B1 known gap: this surface is gated upstream by
  // `installationTypes: [CLOUD]` (see settings/billing/billing.routes.js). The
  // CI Rails app boots in community mode, so the route is hidden by the
  // upstream installation-type guard regardless of the Algorythmo cut flag.
  // The cut-flag hard block (the D5 critical path) is still covered by the
  // 'flag on' describe below. Restoring this assertion requires elevating the
  // CI seed to CLOUD installation type — tracked separately.
  test.fixme(
    'Settings nav shows Billing + route loads',
    async ({ page }) => {
      await withFlag(page, 'billing_settings', false, async () => {
        await expectSurfaceVisible(page, 'billing_settings', {
          sidebarLabel: SIDEBAR_LABEL,
          routePath: ROUTE,
          pageHeadingRegex: HEADING,
          sidebarContext: SETTINGS_CONTEXT,
        });
      });
    }
  );
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
