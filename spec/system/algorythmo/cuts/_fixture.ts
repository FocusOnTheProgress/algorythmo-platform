/**
 * Playwright fixture helpers for Algorythmo feature-gate e2e tests.
 *
 * Provides toggle and teardown utilities for the 13 algorythmo cut flags
 * defined in Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.
 *
 * All helpers operate through the Algorythmo super-admin flags UI
 * (/super_admin/accounts/:id/algorythmo_flags) which writes to the dedicated
 * accounts.algorythmo_feature_flags bigint column — zero conflict with
 * Chatwoot's upstream feature_flags column.
 *
 * Environment variables (all optional, defaults match the dev seed):
 *   PLAYWRIGHT_BASE_URL          — default: http://localhost:3000
 *   PLAYWRIGHT_SUPER_ADMIN_EMAIL — default: super@algorythmo.com
 *   PLAYWRIGHT_SUPER_ADMIN_PASS  — default: Test@12345
 *   PLAYWRIGHT_ACCOUNT_ID        — default: 1
 */

import { type Page, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SUPER_ADMIN_EMAIL =
  process.env.PLAYWRIGHT_SUPER_ADMIN_EMAIL ?? 'super@algorythmo.com';
const SUPER_ADMIN_PASS = process.env.PLAYWRIGHT_SUPER_ADMIN_PASS ?? 'Test@12345';
const ACCOUNT_ID = process.env.PLAYWRIGHT_ACCOUNT_ID ?? '1';

/** All 13 cut surface names (WITHOUT any prefix). */
export const ALL_CUT_FLAGS = [
  'campaigns',
  'help_center',
  'sla',
  'audit_logs',
  'custom_roles',
  'security_settings',
  'billing_settings',
  'agent_bots',
  'macros',
  'dashboard_apps',
  'advanced_assignment',
  'reports_bot',
  'conversation_workflow',
] as const;

export type CutFlagName = (typeof ALL_CUT_FLAGS)[number];

/**
 * Login to the Chatwoot super-admin panel.
 * Idempotent — if already on any super_admin path, skips login.
 */
async function loginSuperAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/super_admin`);
  await page.waitForLoadState('domcontentloaded');

  if (page.url().includes('/super_admin/sign_in')) {
    await page.getByLabel(/email/i).fill(SUPER_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(SUPER_ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    await page.waitForURL(url => !url.pathname.includes('/sign_in'), {
      timeout: 15_000,
    });
  }
}

/**
 * Toggle a single Algorythmo cut flag in the super-admin flags UI.
 *
 * @param page      - Playwright page object.
 * @param flagName  - Short name WITHOUT any prefix (e.g. 'campaigns').
 * @param value     - true to enable (cut surface), false to disable (restore surface).
 * @param accountId - Account ID to update (default: env var or '1').
 *
 * Navigates to /super_admin/accounts/:id/algorythmo_flags, sets the checkbox,
 * and submits the form. Waits for the success redirect.
 */
export async function toggleFlag(
  page: Page,
  flagName: CutFlagName,
  value: boolean,
  accountId = ACCOUNT_ID
): Promise<void> {
  await loginSuperAdmin(page);
  await page.goto(
    `${BASE_URL}/super_admin/accounts/${accountId}/algorythmo_flags`
  );

  // Checkbox rendered by check_box_tag "algorythmo_flags[<flag>]", '1', ...
  const checkboxName = `algorythmo_flags[${flagName}]`;
  const checkbox = page.locator(`input[type="checkbox"][name="${checkboxName}"]`);

  await checkbox.waitFor({ state: 'visible', timeout: 15_000 });

  const isChecked = await checkbox.isChecked();
  if (isChecked !== value) {
    await checkbox.click();
  }

  await page
    .getByRole('button', { name: /update algorythmo flags/i })
    .or(page.locator('input[type="submit"]'))
    .first()
    .click();

  // Controller redirects back to the show page on success
  await page.waitForURL(
    url =>
      new RegExp(
        `/super_admin/accounts/${accountId}/algorythmo_flags($|\\?|#)`
      ).test(url.pathname),
    { timeout: 15_000 }
  );
}

/**
 * Higher-order helper that wraps a test function with automatic flag teardown.
 *
 * Captures the ORIGINAL state of the flag before modifying it, then restores
 * that exact state after the test — even on test failure.
 *
 * @example
 * await withFlag(page, 'campaigns', true, async () => {
 *   await expect(page.getByRole('link', { name: /campaigns/i })).toBeVisible();
 * });
 * // campaigns flag restored to its state before the call
 */
export async function withFlag(
  page: Page,
  flagName: CutFlagName,
  value: boolean,
  testFn: () => Promise<void>,
  accountId = ACCOUNT_ID
): Promise<void> {
  await loginSuperAdmin(page);
  await page.goto(
    `${BASE_URL}/super_admin/accounts/${accountId}/algorythmo_flags`
  );
  const checkboxName = `algorythmo_flags[${flagName}]`;
  const checkbox = page.locator(`input[type="checkbox"][name="${checkboxName}"]`);
  await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
  const originalState = await checkbox.isChecked();

  await toggleFlag(page, flagName, value, accountId);

  try {
    await testFn();
  } finally {
    try {
      await toggleFlag(page, flagName, originalState, accountId);
    } catch (teardownError) {
      console.error(
        `[withFlag] teardown failed for flag '${flagName}':`,
        teardownError
      );
    }
  }
}
