/**
 * algorythmo_cut_advanced_assignment — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-011. Sidebar label is "Agent Assignment"
 * (SIDEBAR.AGENT_ASSIGNMENT).
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/assignment-policy';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /agent assignment|assignment policy/i;
const HEADING = /assignment/i;

test.describe('advanced_assignment — flag off: surface restored', () => {
  test('Settings nav shows Agent Assignment + route loads', async ({
    page,
  }) => {
    await withFlag(page, 'advanced_assignment', false, async () => {
      await expectSurfaceVisible(page, 'advanced_assignment', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('advanced_assignment — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Agent Assignment', async ({
    page,
  }) => {
    await withFlag(page, 'advanced_assignment', true, async () => {
      await expectSurfaceBlocked(page, 'advanced_assignment', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
