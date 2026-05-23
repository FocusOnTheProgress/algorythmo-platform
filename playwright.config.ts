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

    // algorythmo: test-harness-m1b — CRM e2e scaffold (B.14)
    // Specs live in spec/system/algorythmo/crm/ to keep Algorythmo tests
    // isolated from upstream Chatwoot e2e suite (soft-fork zone hygiene).
    // All specs start as .skip() and are enabled in Fase 2 as Sessão C
    // delivers the components being tested.
    {
      name: 'algorythmo-crm',
      testDir: './spec/system/algorythmo/crm',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // algorythmo: test-harness-m1b — A11y axe-core gate (B.13)
    // Requires @axe-core/playwright: pnpm add -D @axe-core/playwright
    // Gate: zero critical/serious WCAG AA violations on /crm and /crm/pipeline.
    // Specs start as .skip() and are activated in Fase 2 once CRM route is live.
    {
      name: 'algorythmo-a11y',
      testDir: './spec/system/algorythmo/crm',
      testMatch: ['**/_a11y_smoke.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
