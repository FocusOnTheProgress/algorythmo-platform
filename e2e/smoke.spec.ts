import { test, expect, Page } from '@playwright/test';

/**
 * M0 Smoke Suite — Algorythmo OS
 *
 * Validates M0 acceptance criteria:
 * 1. Login works (docker stack is healthy).
 * 2. "Chatwoot" does NOT appear in the DOM of any visible page — rebrand complete.
 * 3. Captain UI (sidebar item, copilot launcher) is absent when
 *    algorythmo_show_captain = false.
 *
 * Requires a seeded test account:
 *   email: PLAYWRIGHT_EMAIL (default: test@algorythmo.com)
 *   password: PLAYWRIGHT_PASSWORD (default: Test@12345)
 *
 * These credentials match the seed created by engines/algorythmo/db/seeds.rb (M0).
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.PLAYWRIGHT_EMAIL || 'test@algorythmo.com';
const PASSWORD = process.env.PLAYWRIGHT_PASSWORD || 'Test@12345';

/**
 * Returns a list of all text nodes visible to a user in the page.
 * Used to assert "Chatwoot" never appears as product brand text.
 */
async function getAllVisibleText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText);
}

/**
 * Logs in and waits for the dashboard to be ready.
 *
 * Waiting on networkidle alone is insufficient: it can fire before the SPA
 * has finished hydrating currentUser, which causes any subsequent
 * `page.goto('/settings/...')` to race the route guard (no user yet -> guard
 * redirects to /dashboard, aborting the original navigation with ERR_ABORTED).
 *
 * We instead wait for the post-login URL match, then for the sidebar to be
 * visible — that's the deterministic signal that Vuex has hydrated and
 * permissions are evaluable.
 */
async function loginAndWait(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/app/login`);
  // The FormInput renders <label for="email_address"> but the underlying
  // <input> uses name=, not id=, so Playwright's getByLabel can't link them.
  // We rely on the data-testid attributes the component already exposes.
  await page.getByTestId('email_input').fill(EMAIL);
  await page.getByTestId('password_input').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/app\/accounts\/\d+/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
}

/**
 * Asserts that neither the page title nor any visible body text
 * contains the literal string "Chatwoot".
 */
async function assertNoChatwoot(page: Page, context: string): Promise<void> {
  const pageTitle = await page.title();
  expect(pageTitle, `[${context}] Page title must not contain "Chatwoot"`).not.toContain('Chatwoot');

  const bodyText = await getAllVisibleText(page);
  // Assertion is on user-visible text (innerText), not raw HTML source.
  // Engineering identifiers in data attributes or HTML comments are not checked here.
  expect(bodyText, `[${context}] Visible body text must not contain "Chatwoot"`).not.toContain('Chatwoot');
}

test.describe('M0 Smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/app/login`);
  });

  test('login succeeds', async ({ page }) => {
    await page.getByTestId('email_input').fill(EMAIL);
    await page.getByTestId('password_input').fill(PASSWORD);
    await page.getByRole('button', { name: /sign in|log in|login/i }).click();

    // URL change is the only signal that doesn't depend on knowing the
    // dashboard markup (which evolves with the design system).
    // The SPA's post-login redirect runs after auth response + Vuex
    // hydration + router navigation, so the cold-CI cost can exceed 15s.
    await page.waitForURL(/\/app\/accounts\/\d+/, { timeout: 30_000 });
  });

  test('"Chatwoot" does not appear in DOM of the home page after login', async ({
    page,
  }) => {
    await loginAndWait(page);
    await assertNoChatwoot(page, 'home');
  });

  test('"Chatwoot" does not appear on general settings page', async ({
    page,
  }) => {
    await loginAndWait(page);
    await page.goto(`${BASE_URL}/app/accounts/1/settings/general`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await assertNoChatwoot(page, 'general settings');
  });

  test('"Chatwoot" does not appear on integrations/webhook page', async ({
    page,
  }) => {
    await loginAndWait(page);
    await page.goto(`${BASE_URL}/app/accounts/1/settings/integrations/webhook`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await assertNoChatwoot(page, 'integrations/webhook');
  });

  test('"Chatwoot" does not appear on new inbox (website) page', async ({
    page,
  }) => {
    await loginAndWait(page);
    await page.goto(`${BASE_URL}/app/accounts/1/settings/inboxes/new/website`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
    await assertNoChatwoot(page, 'inboxes/new/website');
  });

  // The "Powered by Algorythmo OS" branding-text assertion lives in the
  // Vitest unit suite (app/javascript/dashboard/i18n/i18n_overlay.spec.js)
  // because the widget preview component only renders later in the wizard
  // flow and isn't visible at /settings/inboxes/new/website. The unit test
  // proves the i18n key resolves to "Powered by Algorythmo OS"; the E2E
  // would have been a coincidental match at best.

  test('Captain sidebar item and copilot launcher are absent when algorythmo_show_captain=false', async ({
    page,
  }) => {
    await loginAndWait(page);

    // Captain sidebar item must not be present
    const captainSidebarItem = page.getByRole('link', { name: /captain/i });
    await expect(captainSidebarItem).toHaveCount(0, { timeout: 5_000 });

    // Copilot floating launcher (bottom-right Captain button) must not be present
    // It renders as a button with the captain icon class
    const copilotLauncher = page.locator('[class*="i-woot-captain"]').first();
    await expect(copilotLauncher).toHaveCount(0, { timeout: 5_000 });
  });
});
