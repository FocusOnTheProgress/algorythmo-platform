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
 *   PLAYWRIGHT_EMAIL             — default: test@algorythmo.com (dashboard admin)
 *   PLAYWRIGHT_PASSWORD          — required by login helpers (no default)
 *   PLAYWRIGHT_ACCOUNT_ID        — default: 1
 */

import { type Page, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const SUPER_ADMIN_EMAIL =
  process.env.PLAYWRIGHT_SUPER_ADMIN_EMAIL ?? 'super@algorythmo.com';
const SUPER_ADMIN_PASS = process.env.PLAYWRIGHT_SUPER_ADMIN_PASS ?? 'Test@12345';
const ADMIN_EMAIL = process.env.PLAYWRIGHT_EMAIL ?? 'test@algorythmo.com';
const ADMIN_PASSWORD: string = process.env.PLAYWRIGHT_PASSWORD ?? 'UNSET';
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
 * Log in to the dashboard as the regular admin user seeded by
 * `bundle exec rake algorythmo:seed:smoke_test_account`.
 *
 * Devise scopes the super-admin session and the dashboard session under
 * different cookie keys, so calling this AFTER loginSuperAdmin keeps both
 * sessions live on the same Page — required for `expectSurfaceVisible` /
 * `expectSurfaceBlocked`, which toggle flags as super-admin and then assert
 * sidebar + route guard as the dashboard admin.
 *
 * Idempotent — if the page is already inside /app/accounts/:id/..., skip.
 */
async function loginAsAdmin(page: Page): Promise<void> {
  if (/\/app\/accounts\/\d+/.test(page.url())) return;

  if (ADMIN_PASSWORD === 'UNSET') {
    throw new Error(
      'PLAYWRIGHT_PASSWORD env var is required to log in as the dashboard admin.\n' +
        'Local dev: copy spec/system/algorythmo/.env.test.example → .env.test\n' +
        'CI: set PLAYWRIGHT_PASSWORD as a secret.'
    );
  }

  await page.goto(`${BASE_URL}/app/login`);
  await page.getByTestId('email_input').fill(ADMIN_EMAIL);
  await page.getByTestId('password_input').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/app\/accounts\/\d+/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
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
      // eslint-disable-next-line no-console
      console.error(
        `[withFlag] teardown failed for flag '${flagName}':`,
        teardownError
      );
    }
  }
}

// ---------------------------------------------------------------------------
// M2-B1 — positive assertions
// ---------------------------------------------------------------------------

/** Account-scoped dashboard URL — the redirect target of the route guard
 *  in `app/javascript/dashboard/routes/index.js` when an `algorythmoCutFlag`
 *  is active. Used by `expectSurfaceBlocked` to assert hard-block behavior. */
function dashboardURL(accountId: string | number = ACCOUNT_ID): string {
  return `/app/accounts/${accountId}/dashboard`;
}

/** Options consumed by `expectSurfaceVisible` and `expectSurfaceBlocked`. */
export interface SurfaceAssertOpts {
  /** Regex matching the sidebar entry's accessible name (text or aria-label).
   *  Pass `null` when the surface has no sidebar entry (e.g. dashboard_apps —
   *  an in-page tab inside Settings > Integrations). */
  sidebarLabel: RegExp | null;
  /** Frontend path with `:accountId` already substituted, e.g.
   *  `/app/accounts/1/settings/sla`. */
  routePath: string;
  /** Regex matching the heading rendered by the surface once it loads.
   *  We assert on the actual heading (role=heading) — not the document
   *  <title>, since Chatwoot uses a single static title. */
  pageHeadingRegex?: RegExp;
  /** URL where the sidebar entry SHOULD render when the cut flag is off,
   *  and SHOULD NOT render when on. Defaults to `routePath` — works for
   *  top-level entries (campaigns, help_center) and inner pages whose
   *  surrounding sidebar still lists the active item. For Settings sub-items
   *  pass a Settings landing URL (e.g. `/app/accounts/1/settings/general`)
   *  so the Settings nav is mounted regardless of the cut state. */
  sidebarContext?: string;
}

const escapeForRegex = (s: string): string => s.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');

async function assertSidebarLinkVisible(
  page: Page,
  label: RegExp,
  contextURL: string
): Promise<void> {
  await page.goto(`${BASE_URL}${contextURL}`);
  await page.waitForLoadState('domcontentloaded');
  const sidebarLink = page
    .getByRole('link', { name: label })
    .or(page.getByRole('button', { name: label }))
    .first();
  await expect(sidebarLink).toBeVisible({ timeout: 15_000 });
}

async function assertSidebarLinkAbsent(
  page: Page,
  label: RegExp,
  contextURL: string
): Promise<void> {
  await page.goto(`${BASE_URL}${contextURL}`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for the main landmark to mount so a count of 0 is a real absence,
  // not a race against a slow render.
  await page
    .locator('main, aside, nav')
    .first()
    .waitFor({ state: 'visible', timeout: 15_000 })
    .catch(() => {
      /* Some inner pages don't expose a `<main>`/`<aside>` landmark — the
         link-count check below remains the source of truth. */
    });
  const sidebarLink = page
    .getByRole('link', { name: label })
    .or(page.getByRole('button', { name: label }));
  await expect(sidebarLink).toHaveCount(0);
}

/**
 * Assert that with the flag OFF, the surface is fully restored:
 *   1. (Optional) Sidebar entry is visible at `sidebarContext` (defaults to
 *      `routePath`).
 *   2. Direct navigation to `routePath` does NOT redirect — the URL stays
 *      on the requested path (allowing legitimate inner redirects such as
 *      `/campaigns` → `/campaigns/ongoing/live_chat`).
 *   3. (Optional) The page renders a heading matching `pageHeadingRegex`.
 *
 * Caller is responsible for wrapping the call in `withFlag(page, name, false, ...)`
 * so teardown stays exception-safe in one place. `loginAsAdmin` is invoked
 * defensively here so spec ordering does not matter.
 */
export async function expectSurfaceVisible(
  page: Page,
  _flagName: CutFlagName,
  opts: SurfaceAssertOpts
): Promise<void> {
  await loginAsAdmin(page);

  const sidebarContext = opts.sidebarContext ?? opts.routePath;
  const dashboardPath = dashboardURL();
  const dashboardRegex = new RegExp(`^${escapeForRegex(dashboardPath)}/?$`);

  // 1. Sidebar entry visible (when the surface has one).
  if (opts.sidebarLabel) {
    await assertSidebarLinkVisible(page, opts.sidebarLabel, sidebarContext);
  }

  // 2. Direct nav does not redirect to /dashboard.
  await page.goto(`${BASE_URL}${opts.routePath}`);
  await page.waitForLoadState('domcontentloaded');
  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 10_000,
      message: `expected to remain on ${opts.routePath}, but the route guard redirected to dashboard`,
    })
    .not.toMatch(dashboardRegex);

  // 3. Heading rendered (when provided).
  if (opts.pageHeadingRegex) {
    const heading = page.getByRole('heading', { name: opts.pageHeadingRegex });
    await expect(heading.first()).toBeVisible({ timeout: 15_000 });
  }
}

/**
 * Assert that with the flag ON, the surface is hard-blocked:
 *   1. Direct navigation to `routePath` redirects to `/app/accounts/:id/dashboard`.
 *   2. (Optional) Sidebar entry is absent in `sidebarContext` (defaults to
 *      `routePath`, but the redirect will land on dashboard either way —
 *      the helper re-navigates to `sidebarContext` after the redirect check).
 *
 * The current route guard performs a silent `next()` redirect — it does NOT
 * emit an aria-live message or toast. Asserting on a message that does not
 * exist would either fail or require a separate guard change. That UX
 * improvement is intentionally out of scope here; this helper enforces only
 * the contract the guard ships today.
 */
export async function expectSurfaceBlocked(
  page: Page,
  _flagName: CutFlagName,
  opts: SurfaceAssertOpts
): Promise<void> {
  await loginAsAdmin(page);

  const dashboardPath = dashboardURL();
  const dashboardRegex = new RegExp(`^${escapeForRegex(dashboardPath)}/?$`);

  // 1. Direct nav → redirect to /dashboard.
  await page.goto(`${BASE_URL}${opts.routePath}`);
  await page.waitForLoadState('domcontentloaded');
  await expect
    .poll(() => new URL(page.url()).pathname, {
      timeout: 10_000,
      message: `expected guard to redirect ${opts.routePath} → ${dashboardPath}`,
    })
    .toMatch(dashboardRegex);

  // 2. Sidebar link absent in the context where it would normally render.
  if (opts.sidebarLabel) {
    const sidebarContext = opts.sidebarContext ?? dashboardPath;
    await assertSidebarLinkAbsent(page, opts.sidebarLabel, sidebarContext);
  }
}
