/**
 * Playwright fixture helpers for Algorythmo feature-gate e2e tests.
 *
 * Provides toggle and teardown utilities for the 13 algorythmo_* flags
 * defined in config/features.yml (docs/plans/cuts.md).
 *
 * All helpers operate through the Chatwoot super-admin UI
 * (Administrate, /super_admin/accounts/:id/edit) so they exercise the
 * same path a real operator would use — no direct DB access.
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
const SUPER_ADMIN_PASS =
  process.env.PLAYWRIGHT_SUPER_ADMIN_PASS ?? 'Test@12345';
const ACCOUNT_ID = process.env.PLAYWRIGHT_ACCOUNT_ID ?? '1';

/** All 13 surface names (WITHOUT the algorythmo_ prefix) that have a cut gate. */
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
 * Idempotent — safe to call even if already logged in (session cookie persists).
 */
async function loginSuperAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/super_admin`);

  // If already on the dashboard, skip login
  if (page.url().includes('/super_admin/accounts')) return;

  await page.getByLabel(/email/i).fill(SUPER_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(SUPER_ADMIN_PASS);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(`${BASE_URL}/super_admin/accounts`, { timeout: 15_000 });
}

/**
 * Navigate to the account edit page in super-admin.
 */
async function navigateToAccountEdit(page: Page, accountId = ACCOUNT_ID): Promise<void> {
  await page.goto(`${BASE_URL}/super_admin/accounts/${accountId}/edit`);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
}

/**
 * Toggle a single Algorythmo feature flag in the super-admin edit form.
 *
 * @param page      - Playwright page object.
 * @param flagName  - Short name WITHOUT the algorythmo_ prefix (e.g. 'campaigns').
 * @param value     - true to enable, false to disable.
 *
 * This function:
 * 1. Logs in to super-admin.
 * 2. Navigates to accounts/:id/edit.
 * 3. Finds the checkbox for `algorythmo_<flagName>`.
 * 4. Sets it to the desired state.
 * 5. Submits the form.
 * 6. Asserts the form saved successfully (redirects back to show or index).
 */
export async function toggleFlag(
  page: Page,
  flagName: string,
  value: boolean,
  accountId = ACCOUNT_ID
): Promise<void> {
  await loginSuperAdmin(page);
  await navigateToAccountEdit(page, accountId);

  // The Administrate form renders each feature flag as a checkbox with
  // name="enabled_features[algorythmo_<flagName>]" and id matching the name.
  // The label text is the display_name from features.yml.
  // We locate by the input name attribute to be resilient to display name changes.
  const checkboxName = `enabled_features[algorythmo_${flagName}]`;
  const checkbox = page.locator(`input[type="checkbox"][name="${checkboxName}"]`);

  await expect(checkbox).toBeVisible({ timeout: 10_000 });

  const isChecked = await checkbox.isChecked();
  if (isChecked !== value) {
    await checkbox.click();
  }

  // Submit the edit form
  await page.getByRole('button', { name: /update account|save/i }).click();

  // Administrate redirects to the show page on success
  await page.waitForURL(
    new RegExp(`/super_admin/accounts/${accountId}($|\\?|#)`),
    { timeout: 15_000 }
  );
}

/**
 * Higher-order helper that wraps a test function with automatic flag teardown.
 *
 * Sets the flag to `value` before the test, then restores it to `!value`
 * (the default disabled state) after the test completes — even on failure.
 *
 * @example
 * await withFlag(page, 'campaigns', true, async () => {
 *   // test body — campaigns flag is ON here
 *   await expect(page.getByRole('link', { name: /campaigns/i })).toBeVisible();
 * });
 * // campaigns flag is OFF again here
 */
export async function withFlag(
  page: Page,
  flagName: string,
  value: boolean,
  testFn: () => Promise<void>,
  accountId = ACCOUNT_ID
): Promise<void> {
  await toggleFlag(page, flagName, value, accountId);
  try {
    await testFn();
  } finally {
    // Restore to the opposite of what we set (default is false for all cut flags)
    await toggleFlag(page, flagName, !value, accountId);
  }
}
