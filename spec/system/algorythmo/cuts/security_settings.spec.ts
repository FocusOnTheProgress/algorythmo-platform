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
  // M2-B1 known gap: this surface is gated upstream by
  // `installationTypes: [CLOUD, ENTERPRISE]` plus a `featureFlag: SAML` check
  // (see settings/security/security.routes.js). The CI Rails app boots in
  // community mode without SAML enabled, so the route is hidden by upstream
  // guards regardless of the Algorythmo cut flag. The cut-flag hard block
  // (the D5 critical path) is still covered by the 'flag on' describe below.
  // Restoring this assertion requires elevating the CI seed to
  // ENTERPRISE+SAML — tracked separately.
  test.fixme('Settings nav shows Security + route loads', async ({ page }) => {
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
