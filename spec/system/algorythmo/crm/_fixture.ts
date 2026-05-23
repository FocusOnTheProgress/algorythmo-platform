/**
 * Shared fixtures for the Algorythmo CRM Playwright suite.
 *
 * Provides:
 * - `crmPage`       — authenticated page navigated to /crm. FAILS (not skips) if
 *                     the route is unreachable so misconfig is visible in CI.
 * - `mockLead()`    — builds a full Lead JSON matching the actual API shape
 *                     (includes embedded contact: {} block from B.0).
 * - `mockDefaultPipeline()` — stubs GET /pipelines/default for specs that need
 *                     the full 5-stage pipeline without a live backend.
 * - `dragLeadCard()` — SortableJS-compatible drag via page.mouse (NOT dragTo).
 *                     Playwright's dragTo sends HTML5 drag events which SortableJS
 *                     (vuedraggable@4) ignores — only pointer/mouse events work.
 * - `seedLeads()`   — seeds N leads into the default pipeline via API (stub until
 *                     B-PR1 ships).
 * - `loginAsAdmin()` — log in with the test admin credentials.
 *
 * PRECONDITIONS for the full suite to run:
 *   1. Docker stack running at PLAYWRIGHT_BASE_URL (default: http://localhost:3000).
 *   2. `algorythmo_crm` feature flag enabled for the test account.
 *      Enable via: bundle exec rails algorythmo:seed:enable_crm ACCOUNT_ID=1
 *      (or via Chatwoot admin > Account > Feature Flags once Sessão B ships B-PR1).
 *   3. Seed applied: `bundle exec rails db:seed` populates the test account.
 *      Actual seed file: engines/algorythmo/lib/tasks/algorythmo/seed.rake
 *      (NOT engines/algorythmo/db/seeds.rb — that file does not exist).
 *   4. @axe-core/playwright installed: pnpm add -D @axe-core/playwright
 *
 * Plan ref: docs/plans/0002-m1-trilha-b-frontend-crm.md §5 B.14
 */

import { test as base, expect, Page, Locator, APIRequestContext } from '@playwright/test';

// ---------------------------------------------------------------------------
// Environment constants
// ---------------------------------------------------------------------------

export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
export const ADMIN_EMAIL =
  process.env.PLAYWRIGHT_EMAIL || 'test@algorythmo.com';

// Default password matches the dev seed in seed.rake. In CI environments
// PLAYWRIGHT_PASSWORD MUST be set explicitly — this fallback is only for
// local dev (mirrors the known seed value, not a real secret).
export const ADMIN_PASSWORD =
  process.env.PLAYWRIGHT_PASSWORD || 'Test@12345';

// Account ID used in seed — adjust if seed changes.
export const TEST_ACCOUNT_ID = 1;

// ---------------------------------------------------------------------------
// Lead mock builder
// ---------------------------------------------------------------------------

export interface MockLeadOptions {
  id?: number;
  stageId?: number;
  contactId?: number;
  contactName?: string;
  contactEmail?: string;
  channelOrigin?: 'whatsapp' | 'email' | 'instagram' | 'widget';
  channelHandle?: string;
  secondsInStage?: number;
  closed?: boolean;
}

/**
 * Build a complete Lead JSON matching the actual API shape returned by B.0
 * (embedded contact: { id, name, email, phone_number, thumbnail }).
 *
 * Both `contact.name` and `channel_metadata.name` are set to the same value
 * to keep tests predictable regardless of which the component reads.
 * Per DESIGN.md §4: cards bind `lead.contact?.name || lead.channel_metadata?.name`.
 */
export function mockLead(opts: MockLeadOptions = {}) {
  const id = opts.id ?? 1;
  const contactId = opts.contactId ?? id + 100;
  const name = opts.contactName ?? `Test Lead ${id}`;
  const channel = opts.channelOrigin ?? 'widget';
  const handle = opts.channelHandle ?? `handle-${id}`;
  const secondsAgo = opts.secondsInStage ?? 720; // 12 minutes

  return {
    id,
    account_id: TEST_ACCOUNT_ID,
    contact_id: contactId,
    stage_id: opts.stageId ?? 1,
    position: id * 1.0,
    previous_lead_id: null,
    channel_origin: channel,
    channel_metadata: {
      name,
      handle,
      photo_url: null,
    },
    // Embedded contact block (B.0 extension — present in real API responses)
    contact: {
      id: contactId,
      name,
      email: opts.contactEmail ?? `${handle}@example.com`,
      phone_number: channel === 'whatsapp' ? '+5511999999999' : null,
      thumbnail: null,
    },
    custom_fields: {},
    stage_entered_at: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    closed_at: opts.closed ? new Date().toISOString() : null,
    last_message_at: new Date().toISOString(),
    deleted: false,
    created_at: new Date(Date.now() - secondsAgo * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Pipeline mock helper
// ---------------------------------------------------------------------------

export const DEFAULT_PIPELINE_STAGES = [
  { id: 1, name: 'Novo', kind: 'new', position: 1, aging_coefficient: 1.0 },
  { id: 2, name: 'Qualificado', kind: 'qualified', position: 2, aging_coefficient: 4.0 },
  { id: 3, name: 'Proposta', kind: 'proposal', position: 3, aging_coefficient: 7.0 },
  { id: 4, name: 'Fechado ganho', kind: 'won', position: 4, aging_coefficient: 0.0 },
  { id: 5, name: 'Fechado perdido', kind: 'lost', position: 5, aging_coefficient: 0.0 },
];

/**
 * Stub GET /pipelines/default so the Kanban can initialize without a live backend.
 * Call this in beforeEach for specs that need the board to render.
 */
export async function mockDefaultPipeline(
  page: Page,
  stageOverrides?: typeof DEFAULT_PIPELINE_STAGES
): Promise<void> {
  const stages = stageOverrides ?? DEFAULT_PIPELINE_STAGES;
  await page.route(
    `**/algorythmo/api/v1/accounts/*/pipelines/default`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          pipeline: { id: 1, name: 'Default' },
          stages,
        }),
      });
    }
  );
}

// ---------------------------------------------------------------------------
// SortableJS-compatible drag helper
// ---------------------------------------------------------------------------

/**
 * Drag a Lead card from its current position to a target stage column.
 *
 * WHY NOT dragTo: Playwright's `locator.dragTo()` dispatches HTML5 dragstart/
 * dragover/drop events. SortableJS (which powers vuedraggable@4) listens to
 * pointer/mouse events ONLY. Using dragTo causes no-op silently — no error, no
 * card movement. This helper replicates the actual pointer path SortableJS needs.
 *
 * SortableJS requires:
 *   1. mousedown on the card
 *   2. Multiple mousemove events (>= 2 moves) to trigger drag start
 *   3. Final mousemove over the target drop zone
 *   4. mouseup to drop
 *
 * Reference: github.com/SortableJS/Sortable#readme, Playwright dragTo docs
 */
export async function dragLeadCard(
  page: Page,
  cardLocator: Locator,
  targetColumnLocator: Locator
): Promise<void> {
  const cardBox = await cardLocator.boundingBox();
  const targetBox = await targetColumnLocator.boundingBox();

  if (!cardBox || !targetBox) {
    throw new Error(
      'dragLeadCard: could not get bounding boxes for card or target column'
    );
  }

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // SortableJS needs a few pixels of movement before it recognizes a drag
  await page.mouse.move(startX + 5, startY + 2, { steps: 3 });
  await page.mouse.move(startX + 10, startY + 5, { steps: 3 });

  // Move toward target
  await page.mouse.move(
    startX + (endX - startX) * 0.5,
    startY + (endY - startY) * 0.5,
    { steps: 10 }
  );
  await page.mouse.move(endX, endY, { steps: 10 });

  // Brief hover to trigger SortableJS drop zone detection
  await page.waitForTimeout(50);
  await page.mouse.up();
}

// ---------------------------------------------------------------------------
// Navigation helpers
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
 * Enable `algorythmo_crm` feature flag for the test account.
 *
 * STATUS: STUB — the Chatwoot admin feature-flag API endpoint is not yet
 * documented. Once Sessão B ships B-PR1 (flag infrastructure), this should
 * call the actual endpoint. For now, the test environment must have the flag
 * enabled BEFORE running the suite.
 *
 * To enable manually in a dev environment:
 *   bundle exec rails algorythmo:seed:enable_crm ACCOUNT_ID=1
 *   — OR —
 *   In rails console: Account.find(1).enable_feature!(:algorythmo_crm)
 *
 * IMPORTANT: This function does NOT silently succeed. If the suite runs
 * and /crm is unreachable, `crmPage` fixture will throw (not skip).
 */
export async function enableCrmFlag(
  _request: APIRequestContext,
  _accountId: number = TEST_ACCOUNT_ID
): Promise<void> {
  // TODO(D — Fase 2): implement once Sessão B ships flag toggle API endpoint.
  // Until then, enabling the flag is a manual precondition (see docstring above).
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
 */
export async function seedLeads(
  _request: APIRequestContext,
  _opts: SeedLeadOptions = {}
): Promise<void> {
  // TODO(D — Fase 2): implement once B-PR1 backend is merged.
}

// ---------------------------------------------------------------------------
// Extended test fixture
// ---------------------------------------------------------------------------

type CrmFixtures = {
  /**
   * Logged-in page navigated to the CRM Kanban.
   *
   * FAILS (throws) if the CRM route is not reachable — this makes CI failures
   * visible rather than silently skipping all tests due to a misconfigured flag.
   * If the CRM route isn't live yet (Sessão C work in progress), use direct
   * `loginAsAdmin + goToCrm` instead of this fixture and gate with test.skip.
   */
  crmPage: Page;
};

export const test = base.extend<CrmFixtures>({
  crmPage: async ({ page }, use) => {
    await loginAsAdmin(page);
    await goToCrm(page);

    // FAIL loudly if CRM route is not reachable (flag disabled or route not wired).
    // Using expect() instead of test.skip() so CI fails visibly on misconfiguration.
    // To suppress: either enable the flag or use loginAsAdmin+goToCrm directly.
    const currentUrl = page.url();
    expect(
      currentUrl,
      [
        'CRM route is not reachable — got redirected to: ' + currentUrl,
        'Ensure algorythmo_crm flag is enabled for the test account.',
        'Enable via: bundle exec rails algorythmo:seed:enable_crm ACCOUNT_ID=1',
      ].join('\n')
    ).toContain('/crm');

    await use(page);
  },
});

export { expect };
