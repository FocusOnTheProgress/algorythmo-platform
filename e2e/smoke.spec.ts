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
 * Returns after networkidle to ensure i18n strings are rendered.
 */
async function loginAndWait(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/app/login`);
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
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
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Wait for dashboard to load — sidebar is the signal
    await expect(page.locator('nav[class*="sidebar"], aside')).toBeVisible({
      timeout: 15_000,
    });
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

  // algorythmo: widget-i18n-overlay
  // Validates the widget embed preview shows "Powered by Algorythmo OS" (M0.5.1).
  // The widget builder settings page renders the POWERED_BY string via the
  // i18n overlay; if it still says "Chatwoot" the overlay didn't apply.
  test('"Powered by Algorythmo OS" appears in widget builder branding preview', async ({
    page,
  }) => {
    await loginAndWait(page);
    await page.goto(`${BASE_URL}/app/accounts/1/settings/inboxes/new/website`);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // The POWERED_BY string from INBOX_MGMT.WIDGET_BUILDER.BRANDING_TEXT
    // is rendered in the widget builder UI. Assert it matches "Algorythmo OS".
    const brandingText = page.getByText(/Powered by Algorythmo OS/i).first();
    await expect(brandingText).toBeVisible({ timeout: 10_000 });
  });

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
