# Algorythmo OS Engine

Rails engine that adds CRM, Brain and Agent capabilities to the Chatwoot fork.

## Running locally

Prerequisites: Docker Desktop installed and running.

```bash
cp .env.example .env          # already has Algorythmo OS branding defaults
docker compose up             # starts Rails + Sidekiq + Vite + PostgreSQL + Redis + Mailhog
```

First boot runs migrations automatically (including engine migrations).
Open http://localhost:3000 and sign up.

## Structure

```
engines/algorythmo/
  app/
    controllers/algorythmo/   Engine controllers (namespace-isolated)
    dispatchers/algorythmo/   AsyncDispatcher extension (listener registration)
    listeners/algorythmo/     Event listeners (CrmListener in M1)
    models/algorythmo/        CRM models (Lead, Stage, Pipeline — added in M1)
    services/algorythmo/      Business logic services
  config/
    locales/                  i18n overlay — overrides Chatwoot brand strings
    routes.rb                 Engine routes (mounted at /algorythmo in host routes.rb)
  db/
    migrate/                  Engine migrations (auto-appended to host db:migrate)
  docs/
    adr/                      Engine-level ADRs
  lib/
    algorythmo/
      engine.rb               Rails::Engine definition (isolate_namespace Algorythmo)
    tasks/algorythmo/         Rake tasks (seed, etc.)
  spec/algorythmo/            RSpec specs (≥90% coverage target for new code)
```

## Engine namespace

All Ruby code lives under `Algorythmo::*`. Models use `algorythmo_*` table prefix.
The engine is mounted at `/algorythmo` in the host `config/routes.rb`.

## Feature flags

Algorythmo flags live in `config/features.yml` with the `algorythmo_` prefix (ADR-0002 Q2):
- `algorythmo_show_captain` — controls visibility of all Captain AI surfaces (default: false)
- More flags added in M1 (algorythmo_crm) and M2 (algorythmo_brain, algorythmo_manu)

## Frontend i18n overlay

Algorythmo OS overrides user-visible "Chatwoot" brand strings in the Vue frontend
via a deep-merge mechanism in `app/javascript/dashboard/i18n/index.js`.

Override files live at:
```
engines/algorythmo/app/javascript/i18n/
  deepMerge.js          Lightweight recursive object merge utility (no external deps)
  overrides/
    en.json             English overrides (~30 keys) — M0 complete
    pt_BR.json          Brazilian Portuguese overrides — M0 complete
```

**Known limitation (M5 debt):** Only `en` and `pt_BR` locales are overridden in M0.
The remaining ~40 upstream locales (ar, de, fr, es, etc.) still contain "Chatwoot"
in the same ~30 key positions. These locales are used by a small fraction of
early-stage users. Full multi-locale override is tracked as M5/production work.

## Soft-fork zone

Certain host-app files are edited inline (not via overlay) because no overlay mechanism
exists for that file type. Every such file MUST contain a tag `// algorythmo: rebrand-m0`
or `// algorythmo: soft-fork` on every modified line so the monthly upstream sync can
identify and re-apply our changes after a rebase.

**Accepted inline edits (soft-fork zone):**

| Path | Line | Tag | Reason |
|---|---|---|---|
| `app/javascript/v3/views/auth/signup/Index.vue` | 14 | `// algorythmo: rebrand-m0` | Signup page title hard-coded "Chatwoot" |
| `app/javascript/widget/i18n/index.js` | overlay block | `// algorythmo: widget-i18n-overlay` | Widget i18n entry point |
| `app/javascript/survey/i18n/index.js` | overlay block | `// algorythmo: survey-i18n-overlay` | Survey i18n entry point |
| `app/javascript/survey/views/Response.vue` | 177 | `<!-- algorythmo: rebrand-m0 -->` | Image alt text "Chatwoot logo" |

The script `engines/algorythmo/bin/check-soft-fork-zone.sh` validates that each path in
this table exists in the filesystem and contains the expected tag. Run it before opening
a PR to catch regressions early. It also runs as a CI step.

## Sync with upstream Chatwoot

Files touched by Algorythmo are tagged with `// algorythmo: <tag>` (JS/Vue) or
`# algorythmo: <tag>` (Ruby/YAML). These markers make merge conflicts from upstream
easy to identify and resolve. See ADR-0001 (sync strategy).

## Tests

```bash
# Backend (engine specs + Captain feature-gate)
bundle exec rspec \
  engines/algorythmo/spec \
  enterprise/spec/listeners/captain_listener_spec.rb \
  enterprise/spec/controllers/api/v1/accounts/captain/feature_gate_spec.rb

# Frontend (Vitest — escopo Algorythmo)
TZ=UTC pnpm exec vitest run \
  engines/algorythmo/app/javascript \
  app/javascript/dashboard/composables/specs/useAlgorythmoFeatureGate.spec.js \
  app/javascript/dashboard/helper/specs/routeHelpers_algorythmo.spec.js \
  app/javascript/dashboard/i18n/i18n_overlay.spec.js \
  app/javascript/survey/i18n/i18n_overlay.spec.js \
  app/javascript/widget/i18n/i18n_overlay.spec.js \
  app/javascript/dashboard/components-next/copilot/specs/CopilotLauncher.spec.js \
  --no-coverage

# E2E smoke (Playwright — requires running stack)
pnpm exec playwright test e2e/smoke.spec.ts
```

## CI strategy — free tier + local pre-push gate

O fork vive em repo privado no GitHub free plan (2 000 min de Actions/mês).
Estratégia em dois andares pra caber no orçamento:

1. **Local pre-push gate** (`bin/validate_push`, ativado por husky):
   roda soft-fork-check + ESLint + Vitest (Algorythmo scope) + Rubocop +
   RSpec (Algorythmo scope) antes de cada `git push`. Em Windows sem Ruby
   instalado, os gates Ruby são pulados com aviso e o CI cobre.
2. **GitHub Actions** (`.github/workflows/run_foss_spec.yml`): mesmo conjunto
   de gates, mas escopado APENAS a código Algorythmo (não roda a suíte
   inteira do Chatwoot). Workflows pesados herdados do upstream
   (`run_mfa_spec`, `test_docker_build`, `size-limit`, `frontend-fe` duplicado)
   vivem em `.github/workflows/disabled/` e reativam quando migrarmos pra
   org paga ou self-hosted runners.

Para bypassar o gate local em emergência: `git push --no-verify`.
Para reativar workflows: `git mv .github/workflows/disabled/<file>.yml .github/workflows/`.
