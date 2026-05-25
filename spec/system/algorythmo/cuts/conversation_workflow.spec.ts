/**
 * algorythmo_cut_conversation_workflow — Playwright positive/negative assertions.
 *
 * Per docs/plans/cuts.md CUT-013.
 */

import { test } from '@playwright/test';
import {
  expectSurfaceBlocked,
  expectSurfaceVisible,
  withFlag,
} from './_fixture';

const ROUTE = '/app/accounts/1/settings/conversation-workflow';
const SETTINGS_CONTEXT = '/app/accounts/1/settings/general';
const SIDEBAR_LABEL = /conversation workflow/i;
const HEADING = /conversation workflow/i;

test.describe('conversation_workflow — flag off: surface restored', () => {
  test('Settings nav shows Conversation Workflow + route loads', async ({
    page,
  }) => {
    await withFlag(page, 'conversation_workflow', false, async () => {
      await expectSurfaceVisible(page, 'conversation_workflow', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        pageHeadingRegex: HEADING,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});

test.describe('conversation_workflow — flag on: hard block on direct nav', () => {
  test('direct nav redirects to /dashboard, Settings nav hides entry', async ({
    page,
  }) => {
    await withFlag(page, 'conversation_workflow', true, async () => {
      await expectSurfaceBlocked(page, 'conversation_workflow', {
        sidebarLabel: SIDEBAR_LABEL,
        routePath: ROUTE,
        sidebarContext: SETTINGS_CONTEXT,
      });
    });
  });
});
