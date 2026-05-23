/**
 * Shared fixtures for the Algorythmo CRM Playwright suite.
 *
 * Provides:
 * - `crmPage` — authenticated page with algorythmo_crm feature flag enabled.
 * - `seedLeads` — seeds N leads into the default pipeline via API.
 * - `loginAsAdmin` — log in with the test admin credentials.
 *
 * All helpers assume the docker stack is running (http://localhost:3000) and
 * that `engines/algorythmo/db/seeds.rb` has already been applied (M0 seed).
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14
 */

import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Environment constants
// ---------------------------------------------------------------------------

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
export const ADMIN_EMAIL =
  process.env.PLAYWRIGHT_EMAIL || 'test@algorythmo.com';
export const ADMIN_PASSWORD =
  process.env.PLAYWRIGHT_PASSWORD || 'Test@12345';

// Account ID used in seed — adjust if seed changes.
export const TEST_ACCOUNT_ID = 1;

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the sign-in form and wait for the dashboard to be ready.
 * Returns after networkidle so Vuex hydration + i18n are complete.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/app/login`);
  await page.getByTestId('email_input').fill(ADMIN_EMAIL);
  await page.getByTestId('password_input').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  await page.waitForURL(/\/app\/accounts\/\d+/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 20_000 });
}

/**
 * Enable `algorythmo_crm` feature flag for the test account via the admin API.
 * Skips silently if the endpoint is not yet available (Sessão B wires the flag).
 *
 * NOTE: This is a best-effort call during scaffold phase. The flag toggle
 * endpoint path must be confirmed against the actual Chatwoot admin API
 * once Sessão B ships B-PR1. Placeholder path used here.
 */
export async function enableCrmFlag(
  request: APIRequestContext,
  accountId: number = TEST_ACCOUNT_ID
): Promise<void> {
  // Placeholder — actual path TBD once Sessão B ships flag infrastructure.
  // When the endpoint is live, replace with real call:
  //   await request.post(`${BASE_URL}/auth/sign_in`, { ... });
  //   await request.put(
  //     `${BASE_URL}/api/v1/profile`,
  //     { data: { ... algorythmo_crm: true ... } }
  //   );
  //
  // For now, tests that need the flag will call this and `test.skip` if
  // they detect the CRM item is absent.
  void accountId; // suppress unused-variable lint until wired
}

/**
 * Navigate to the CRM Kanban page.
 * Precondition: user must already be logged in.
 */
export async function goToCrm(
  page: Page,
  accountId: number = TEST_ACCOUNT_ID
): Promise<void> {
  await page.goto(
    `${BASE_URL}/app/accounts/${accountId}/crm`,
    { waitUntil: 'networkidle' }
  );
}

/**
 * Navigate to the Pipeline Config page.
 */
export async function goToPipelineConfig(
  page: Page,
  accountId: number = TEST_ACCOUNT_ID
): Promise<void> {
  await page.goto(
    `${BASE_URL}/app/accounts/${accountId}/crm/pipeline`,
    { waitUntil: 'networkidle' }
  );
}

// ---------------------------------------------------------------------------
// Seed helpers (will call Algorythmo API once B-PR1 ships)
// ---------------------------------------------------------------------------

export interface SeedLeadOptions {
  count?: number;
  stageKind?: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
  channelOrigin?: 'whatsapp' | 'email' | 'instagram' | 'widget';
}

/**
 * Seed N leads into the default pipeline via the Algorythmo API.
 *
 * Currently a stub — will call `POST /algorythmo/api/v1/accounts/:id/leads`
 * once Sessão B ships B-PR1 and the endpoint is available.
 *
 * Specs that depend on pre-seeded leads should use `test.skip` until this
 * is fully wired, or mock at the network level with `page.route()`.
 */
export async function seedLeads(
  _request: APIRequestContext,
  _opts: SeedLeadOptions = {}
): Promise<void> {
  // TODO(D — Fase 2): implement once B-PR1 backend is merged.
  // Example implementation:
  //
  //   const token = await getAdminToken(_request);
  //   const stageId = await getStageIdByKind(_request, _opts.stageKind ?? 'new');
  //   await Promise.all(
  //     Array.from({ length: _opts.count ?? 1 }).map((_, i) =>
  //       _request.post(
  //         `${BASE_URL}/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads`,
  //         {
  //           headers: { 'api_access_token': token },
  //           data: {
  //             lead: {
  //               contact_id: i + 1,
  //               stage_id: stageId,
  //               channel_origin: _opts.channelOrigin ?? 'widget',
  //             },
  //           },
  //         }
  //       )
  //     )
  //   );
}

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

type CrmFixtures = {
  /** Logged-in page navigated to the CRM Kanban. Skips if route returns 404. */
  crmPage: Page;
};

export const test = base.extend<CrmFixtures>({
  crmPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await goToCrm(page);

    // If CRM route is not wired yet (Sessão C in progress), skip gracefully.
    const url = page.url();
    if (!url.includes('/crm')) {
      test.skip(true, 'CRM route not wired yet — waiting for Sessão C');
    }

    await use(page);
  },
});

export { expect };
