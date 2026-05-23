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
 * Implementation notes:
 *   - Flags live in features.yml at repurposed bit positions (4–57), all
 *     safely within the signed bigint range (max useful bit: 63).
 *   - The Administrate form renders each feature flag as a checkbox with
 *     name="enabled_features[feature_<flag_name>]" (note: feature_ prefix
 *     added by Rails' check_box helper via AccountFeaturesField).
 *   - Algorythmo OS runs as enterprise (enterprise/ dir present), so the
 *     all_features field IS included in the account edit form.
 *   - Flags must NOT be marked chatwoot_internal: true in features.yml,
 *     otherwise SuperAdmin::AccountFeaturesHelper#filter_internal_features
 *     hides them from self-hosted installs.
 *   - Premium flags disabled if ChatwootHub.pricing_plan == 'community'.
 *     Algorythmo cut flags are NOT marked premium to ensure they are always
 *     toggleable in super-admin regardless of plan.
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

/** All 13 cut surface names (WITHOUT the algorythmo_ prefix). */
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

  // If Devise redirected us to sign_in, perform login
  if (page.url().includes('/super_admin/sign_in')) {
    await page.getByLabel(/email/i).fill(SUPER_ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(SUPER_ADMIN_PASS);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // After login, Devise redirects to /super_admin (dashboard root), NOT /super_admin/accounts
    await page.waitForURL(url => !url.pathname.includes('/sign_in'), {
      timeout: 15_000,
    });
  }
}

/**
 * Toggle a single Algorythmo feature flag in the super-admin edit form.
 *
 * @param page      - Playwright page object.
 * @param flagName  - Short name WITHOUT the algorythmo_ prefix (e.g. 'campaigns').
 * @param value     - true to enable, false to disable.
 * @param accountId - Account ID to update (default: env var or '1').
 *
 * This function:
 * 1. Logs in to super-admin (idempotent).
 * 2. Navigates to accounts/:id/edit.
 * 3. Waits for the feature checkbox to be visible.
 * 4. Sets it to the desired state.
 * 5. Submits the form and waits for the success redirect.
 */
export async function toggleFlag(
  page: Page,
  flagName: string,
  value: boolean,
  accountId = ACCOUNT_ID
): Promise<void> {
  await loginSuperAdmin(page);
  await page.goto(`${BASE_URL}/super_admin/accounts/${accountId}/edit`);

  // The Administrate AccountFeaturesField renders via:
  //   check_box "enabled_features", "feature_#{feature_key}", ...
  // which produces name="enabled_features[feature_algorythmo_<flagName>]"
  const checkboxName = `enabled_features[feature_algorythmo_${flagName}]`;
  const checkbox = page.locator(`input[type="checkbox"][name="${checkboxName}"]`);

  // Wait for the checkbox to appear instead of networkidle (resilient to WebSocket long-polls)
  await checkbox.waitFor({ state: 'visible', timeout: 15_000 });

  const isChecked = await checkbox.isChecked();
  if (isChecked !== value) {
    await checkbox.click();
  }

  // Submit the edit form — Administrate renders "Update Account"
  await page
    .getByRole('button', { name: /update account/i })
    .or(page.locator('input[type="submit"]'))
    .first()
    .click();

  // Administrate redirects to the show page on success
  await page.waitForURL(
    url =>
      new RegExp(`/super_admin/accounts/${accountId}($|\\?|#)`).test(
        url.pathname
      ),
    { timeout: 15_000 }
  );
}

/**
 * Higher-order helper that wraps a test function with automatic flag teardown.
 *
 * Captures the ORIGINAL state of the flag before modifying it, then restores
 * that exact state after the test — even on test failure. This prevents
 * state leakage between tests regardless of the flag's initial state.
 *
 * @example
 * await withFlag(page, 'campaigns', true, async () => {
 *   // campaigns flag is ON — assert sidebar item is visible
 *   await expect(page.getByRole('link', { name: /campaigns/i })).toBeVisible();
 * });
 * // campaigns flag restored to its state before the call
 */
export async function withFlag(
  page: Page,
  flagName: string,
  value: boolean,
  testFn: () => Promise<void>,
  accountId = ACCOUNT_ID
): Promise<void> {
  // Capture original state before any mutation
  await loginSuperAdmin(page);
  await page.goto(`${BASE_URL}/super_admin/accounts/${accountId}/edit`);
  const checkboxName = `enabled_features[feature_algorythmo_${flagName}]`;
  const checkbox = page.locator(`input[type="checkbox"][name="${checkboxName}"]`);
  await checkbox.waitFor({ state: 'visible', timeout: 15_000 });
  const originalState = await checkbox.isChecked();

  // Apply the desired state
  await toggleFlag(page, flagName, value, accountId);

  try {
    await testFn();
  } finally {
    // Restore to the ORIGINAL state (not just !value — captures pre-existing state)
    try {
      await toggleFlag(page, flagName, originalState, accountId);
    } catch (teardownError) {
      // Log teardown failure without masking the original test error
      console.error(
        `[withFlag] teardown failed for flag '${flagName}':`,
        teardownError
      );
    }
  }
}
