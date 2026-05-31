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
  // M2-B1 known gap: this surface is gated upstream by
  // `installationTypes: [CLOUD, ENTERPRISE]` plus a `featureFlag: CUSTOM_ROLES`
  // check (see settings/customRoles/customRole.routes.js). The CI Rails app
  // boots in community mode without the CUSTOM_ROLES feature enabled, so the
  // route is hidden by upstream guards regardless of the Algorythmo cut flag.
  // The cut-flag hard block (the D5 critical path) is still covered by the
  // 'flag on' describe below. Restoring this assertion requires elevating the
  // CI seed to ENTERPRISE+CUSTOM_ROLES — tracked separately.
  test.fixme('Settings nav shows Custom Roles + route loads', async ({
    page,
  }) => {
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
  test('direct nav redirects to /inicio, Settings nav hides Custom Roles', async ({
    page,
  }) => {
    await withFlag(page, 'custom_roles', true, async () => {
      await expectSurfaceBlocked(page, 'custom_roles', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
        // custom_roles is caught by the permission guard before the cut gate,
        // so Stream D's defaultRedirectPage sends it to /inicio, not /dashboard.
        blockedRedirectTo: 'inicio',
      });
    });
  });
});
