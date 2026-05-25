/**
 * algorythmo_cut_audit_logs — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-004:
 *   ON  → /app/accounts/:id/settings/audit-logs redirects to /dashboard,
 *         Settings nav hides Audit Logs entry.
 *   OFF → upstream Audit Logs surface remains available.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/audit-logs';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /audit logs/i;
const HEADING = /audit log/i;

test.describe('audit_logs — flag off: surface restored', () => {
  test('Settings nav shows Audit Logs + route loads', async ({ page }) => {
    await withFlag(page, 'audit_logs', false, async () => {
      await expectSurfaceVisible(page, 'audit_logs', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('audit_logs — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Audit Logs', async ({
    page,
  }) => {
    await withFlag(page, 'audit_logs', true, async () => {
      await expectSurfaceBlocked(page, 'audit_logs', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
