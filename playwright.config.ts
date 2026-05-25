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

    // algorythmo: soft-fork — test-harness-m1b (B.14 CRM e2e scaffold)
    // Specs live in spec/system/algorythmo/crm/ to keep Algorythmo tests
    // isolated from upstream Chatwoot e2e suite (soft-fork zone hygiene).
    // All specs start as .skip() and are enabled in Fase 2 as Sessão C
    // delivers the components being tested.
    // testIgnore: excludes _a11y_smoke.spec.ts — that runs under algorythmo-a11y
    // only, preventing the axe scan from running twice per CI invocation.
    {
      name: 'algorythmo-crm',
      testDir: './spec/system/algorythmo/crm',
      testIgnore: ['**/_a11y_smoke.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // algorythmo: soft-fork — test-harness-m1b (B.13 A11y axe-core gate)
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

    // algorythmo: feature-gate — M2-B1 cut-flag e2e gate (PR 7).
    // 13 specs, one per cut flag, asserting both directions of the gate
    // (flag-off → surface restored; flag-on → hard block on direct nav).
    // Each spec toggles its flag via the super-admin UI in a `withFlag`
    // try/finally block, so the suite is idempotent across orderings.
    // _fixture.ts is excluded by the .ts suffix (Playwright only collects
    // files matching the default testMatch, which includes *.spec.ts).
    {
      name: 'algorythmo-cuts',
      testDir: './spec/system/algorythmo/cuts',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
