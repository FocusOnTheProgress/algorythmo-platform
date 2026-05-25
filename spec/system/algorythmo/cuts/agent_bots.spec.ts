/**
 * algorythmo_cut_agent_bots — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-008. Sidebar label is "Bots" (SIDEBAR.AGENT_BOTS).
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/agent-bots';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /^bots$/i;
const HEADING = /bots|agent bots/i;

test.describe('agent_bots — flag off: surface restored', () => {
  test('Settings nav shows Bots + route loads', async ({ page }) => {
    await withFlag(page, 'agent_bots', false, async () => {
      await expectSurfaceVisible(page, 'agent_bots', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('agent_bots — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides Bots', async ({
    page,
  }) => {
    await withFlag(page, 'agent_bots', true, async () => {
      await expectSurfaceBlocked(page, 'agent_bots', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
