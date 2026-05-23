import { defineConfig, devices } from '@playwright/test';

/**
 * Algorythmo OS — Playwright E2E configuration.
 * Suite runs against the local Docker stack (http://localhost:3000).
 * CI: Playwright is a gate — failing tests block merge (M0.8 workflow).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Sequential in M0 — login state is shared
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
