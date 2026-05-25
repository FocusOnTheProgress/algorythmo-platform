# Algorythmo Cut Flags — operational map

The 13 cut flags live in `accounts.algorythmo_feature_flags` (signed `bigint`,
isolated from Chatwoot's upstream `feature_flags` column). Source-of-truth list:
[`Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES`](../../../app/models/concerns/algorythmo/feature_flag_bits.rb).
The same list is mirrored in the dashboard at
[`app/javascript/dashboard/constants/algorythmoCutFlags.js`](../../../app/javascript/dashboard/constants/algorythmoCutFlags.js).

## Semantic

Cut flags use **inverted semantics**:

| Flag state | Cut state          | Surface visibility |
|------------|--------------------|--------------------|
| `false`    | Cut **inactive**   | Surface **visible** (upstream Chatwoot behavior) |
| `true`     | Cut **active**     | Surface **hidden** (sidebar link gone + route guard redirects to `/dashboard`) |

The default for a new account is `false` everywhere. Operators opt in via the
super-admin UI at `/super_admin/accounts/:id/algorythmo_flags` (or via the rails
console: `Account.find(id).update!(algorythmo_cut_<name>: true)`).

`show_captain` and `crm` live in the same column but use **enable** semantics
(flag true = surface visible). They are intentionally outside this batch — see
[`engines/algorythmo/spec/algorythmo/feature_flags_spec.rb`](../../../engines/algorythmo/spec/algorythmo/feature_flags_spec.rb).

## The 13 cuts

| # | Flag                       | Route cut (with `:account_id`)                                     | Sidebar i18n key                    | Sidebar context                  | When ON                          | When OFF                       |
|---|----------------------------|--------------------------------------------------------------------|-------------------------------------|----------------------------------|----------------------------------|--------------------------------|
| 1 | `campaigns`                | `/app/accounts/:account_id/campaigns`                              | `SIDEBAR.CAMPAIGNS`                 | top-level sidebar                | sidebar hidden + redirect        | sidebar visible + route loads |
| 2 | `help_center`              | `/app/accounts/:account_id/portals`                                | `SIDEBAR.HELP_CENTER.TITLE`         | top-level sidebar                | sidebar hidden + redirect        | sidebar visible + route loads |
| 3 | `sla`                      | `/app/accounts/:account_id/settings/sla`                           | `SIDEBAR.SLA`                       | Settings nav                     | Settings nav hides SLA + redirect | Settings nav shows SLA |
| 4 | `audit_logs`               | `/app/accounts/:account_id/settings/audit-logs`                    | `SIDEBAR.AUDIT_LOGS`                | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 5 | `custom_roles`             | `/app/accounts/:account_id/settings/custom-roles`                  | `SIDEBAR.CUSTOM_ROLES`              | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 6 | `security_settings`        | `/app/accounts/:account_id/settings/security`                      | `SIDEBAR.SECURITY`                  | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 7 | `billing_settings`         | `/app/accounts/:account_id/settings/billing`                       | `SIDEBAR.BILLING`                   | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 8 | `agent_bots`               | `/app/accounts/:account_id/settings/agent-bots`                    | `SIDEBAR.AGENT_BOTS`                | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 9 | `macros`                   | `/app/accounts/:account_id/settings/macros`                        | `SIDEBAR.MACROS`                    | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 10 | `dashboard_apps`          | `/app/accounts/:account_id/settings/integrations/dashboard_apps`   | `INTEGRATION_SETTINGS.DASHBOARD_APPS.TITLE` | in-page tab (Settings > Integrations) | tab hidden + redirect           | tab visible + route loads     |
| 11 | `advanced_assignment`     | `/app/accounts/:account_id/settings/assignment-policy`             | `SIDEBAR.AGENT_ASSIGNMENT`          | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |
| 12 | `reports_bot`             | `/app/accounts/:account_id/reports/bot`                            | `SIDEBAR.REPORTS_BOT`               | Reports nav                      | Reports tab hides + redirect     | Reports tab visible           |
| 13 | `conversation_workflow`   | `/app/accounts/:account_id/settings/conversation-workflow`         | `SIDEBAR.CONVERSATION_WORKFLOW`     | Settings nav                     | Settings nav hides + redirect    | Settings nav shows entry      |

> `dashboard_apps` is the only cut surface without a sidebar entry — it is a
> sub-tab inside the Integrations settings page. Its Playwright spec therefore
> passes `sidebarLabel: null` and asserts route + heading only.

## How to test locally

1. **Boot the stack** (or attach to an existing one):
   ```sh
   docker compose up -d
   ```
2. **Seed the test admin** (creates `test@algorythmo.com` and an account):
   ```sh
   ALGORYTHMO_SEED_PASSWORD='<your-test-pass>' bundle exec rake algorythmo:seed:smoke_test_account
   ```
3. **Export Playwright env** (or copy `spec/system/algorythmo/.env.test.example`):
   ```sh
   export PLAYWRIGHT_BASE_URL=http://localhost:3000
   export PLAYWRIGHT_EMAIL=test@algorythmo.com
   export PLAYWRIGHT_PASSWORD='<your-test-pass>'
   export PLAYWRIGHT_SUPER_ADMIN_EMAIL=super@algorythmo.com
   export PLAYWRIGHT_SUPER_ADMIN_PASS='<super-admin-pass>'
   ```
4. **Run the Ruby smoke first** — it fails in ~1s if data drifts:
   ```sh
   bundle exec rspec engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb
   ```
5. **Then the browser suite** (one project, 13 specs):
   ```sh
   pnpm playwright test --project algorythmo-cuts --reporter=line
   ```
   To target one flag while iterating:
   ```sh
   pnpm playwright test spec/system/algorythmo/cuts/campaigns.spec.ts --headed
   ```

## Adding a new cut flag

The bit-map has 48 unused positions (3 used by enable flags, 13 by current
cuts). To add a 14th cut surface (i.e. a 16th bit overall):

1. **Ruby source of truth** — append to `Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES`
   (do NOT reorder existing entries — order is the bit position, and reordering
   corrupts existing bigint data).
2. **JS mirror** — append to `ALGORYTHMO_CUT_FLAG_NAMES` in
   `app/javascript/dashboard/constants/algorythmoCutFlags.js`.
3. **Route gate** — add `meta.algorythmoCutFlag: 'algorythmo_cut_<name>'` to
   every route belonging to the surface. The dev-time warning in
   `dashboard/helper/routeHelpers.js` catches typos that would otherwise
   silently leave the surface ungated.
4. **Sidebar gate** — wrap the sidebar entry in a `v-if` that consults the
   account flag (use the existing `isFeatureEnabledonAccount` pattern in
   `Sidebar.vue`).
5. **Smoke spec** — add an entry to `CUT_FLAGS_TO_ROUTE` and `CUT_FLAGS_TO_I18N_KEY`
   in `engines/algorythmo/spec/algorythmo/cuts_smoke_spec.rb`.
6. **Playwright spec** — create
   `spec/system/algorythmo/cuts/<name>.spec.ts` following the pattern of the
   existing 13 (one `describe` per direction, both wrapped in `withFlag`).
7. **This table** — add a row above so the operational map stays the index.

If any of steps 1–5 are missed, either the RSpec smoke or the dashboard
`algorythmoCutFlagCoverage.spec.js` will fail in CI before merge — the gate is
multilayered on purpose so the human reviewer doesn't have to remember the list.

## Why this docs page exists

Without this map, every new engineer has to triangulate `feature_flag_bits.rb`,
`algorythmoCutFlags.js`, `routeHelpers.js`, and the individual route files to
understand what a cut flag actually does. The smoke spec catches drift, but
this page is what someone reads first.
