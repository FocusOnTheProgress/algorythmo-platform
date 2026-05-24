/**
 * Shared fixtures for the Algorythmo CRM Playwright suite.
 *
 * CONTRACT REFERENCE: docs/coordination/CONTRACT_M1B.md v1.0.0
 *   — single source of truth for data-testid + aria attributes consumed here.
 *
 * SCAFFOLD STATE: every spec is wrapped in test.skip() until the backend
 * endpoints in CONTRACT §9 are live AND the test account has `algorythmo_crm`
 * enabled. The suite is shipped now so reviews of C.2 can read what D will
 * assert once the gates open.
 *
 * Provides:
 * - `mockLead()`    — builds a full Lead JSON matching the actual API shape
 *                     (includes embedded contact: {} block from B.0).
 * - `mockDefaultPipeline()` — stubs GET /pipelines/default for specs that need
 *                     the full 5-stage pipeline without a live backend.
 * - `mockLeads()`   — stubs per-stage GET /leads?stage_id=:sid so the board
 *                     hydrates against deterministic data and `networkidle`
 *                     actually settles.
 * - `dragLeadCard()` — HTML5 drag-and-drop via `locator.dragTo()`. C.2 uses
 *                     native dragstart/dragover/drop (composable `useDragLead`);
 *                     dragTo dispatches the events that composable listens to.
 *                     SortableJS was considered and rejected in design (Q-B drag-impl).
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

// PLAYWRIGHT_PASSWORD is required to actually RUN tests — no fallback.
// `--list` and collection still work without it; the error fires on first use.
// For local dev: copy spec/system/algorythmo/.env.test.example → .env.test
// In CI: set PLAYWRIGHT_PASSWORD as a secret environment variable.
export const ADMIN_PASSWORD: string = process.env.PLAYWRIGHT_PASSWORD ?? 'UNSET';

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

// CONTRACT_M1B v1.0.0 §2 — stage.kind ∈ { 'open' | 'won' | 'lost' }.
// Earlier scaffolds used 'new'/'qualified'/'proposal' — these are NOT in the
// contract. Open stages are differentiated by `data-stage-id`, not kind.
export const DEFAULT_PIPELINE_STAGES = [
  { id: 1, name: 'Novo', kind: 'open', position: 1, aging_coefficient: 1.0 },
  { id: 2, name: 'Qualificado', kind: 'open', position: 2, aging_coefficient: 4.0 },
  { id: 3, name: 'Proposta', kind: 'open', position: 3, aging_coefficient: 7.0 },
  { id: 4, name: 'Fechado ganho', kind: 'won', position: 4, aging_coefficient: 0.0 },
  { id: 5, name: 'Fechado perdido', kind: 'lost', position: 5, aging_coefficient: 0.0 },
];

/**
 * Stub GET /pipelines/default so the Kanban can initialize without a live backend.
 * Call this in beforeEach for specs that need the board to render.
 *
 * The route is scoped to `TEST_ACCOUNT_ID` — wildcard `accounts/*` would also
 * fire for the wrong account if login resolves a different one, silently
 * masking misconfig.
 */
export async function mockDefaultPipeline(
  page: Page,
  stageOverrides?: typeof DEFAULT_PIPELINE_STAGES
): Promise<void> {
  const stages = stageOverrides ?? DEFAULT_PIPELINE_STAGES;
  await page.route(
    `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/pipelines/default`,
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

/**
 * Stub the per-stage GET /leads?stage_id=:sid endpoint that KanbanBoard
 * fires for all 5 stages on mount. Returns the matching subset from `leads`
 * (or [] for empty stages).
 *
 * Without this, `goToCrm`'s `waitUntil: 'networkidle'` hangs because the
 * 5 parallel /leads requests never settle.
 */
export async function mockLeads(
  page: Page,
  leads: ReturnType<typeof mockLead>[] = []
): Promise<void> {
  await page.route(
    `**/algorythmo/api/v1/accounts/${TEST_ACCOUNT_ID}/leads*`,
    async (route) => {
      const url = new URL(route.request().url());
      const stageIdParam = url.searchParams.get('stage_id');
      const stageLeads = stageIdParam
        ? leads.filter((l) => String(l.stage_id) === stageIdParam)
        : leads;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ leads: stageLeads, next_cursor: null }),
      });
    }
  );
}

// ---------------------------------------------------------------------------
// HTML5 drag helper
// ---------------------------------------------------------------------------

/**
 * Drag a Lead card to a target stage column via Playwright's HTML5 dragTo.
 *
 * C.2 ships native HTML5 drag-and-drop via the `useDragLead` composable —
 * dragstart/dragenter/dragover/drop/dragend handlers wired on the card +
 * column. SortableJS was considered and rejected (Q-B drag-impl).
 * `locator.dragTo()` dispatches the same HTML5 events the composable listens
 * to, so it is the correct mechanism here.
 *
 * NOTE: when un-skipping in Fase 2, run the first pass `--headed` in both
 * Chromium AND Firefox to confirm dragTo's synthesized DataTransfer survives
 * dragstart → dragover → drop in this Playwright version.
 */
export async function dragLeadCard(
  cardLocator: Locator,
  targetColumnLocator: Locator
): Promise<void> {
  await cardLocator.dragTo(targetColumnLocator);
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the sign-in form and wait for the dashboard to be ready.
 * Returns after networkidle so Vuex hydration + i18n are complete.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  if (ADMIN_PASSWORD === 'UNSET') {
    throw new Error(
      'PLAYWRIGHT_PASSWORD env var is required.\n' +
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
  // CONTRACT_M1B v1.0.0 §2 — only 'open' | 'won' | 'lost' are valid.
  stageKind?: 'open' | 'won' | 'lost';
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
// Re-exports
// ---------------------------------------------------------------------------

export const test = base;
export { expect };
