# GBrain pinned SHA — single source of truth

`GBRAIN_PINNED_SHA` (sibling file) holds the exact 40-char commit SHA of
`garrytan/gbrain@master` that the Algorythmo Brain is built and tested against.
`package.json` mirrors it as `garrytan/gbrain#<sha>`.

## Pin & bump cadence

Governed by **ADR-0013** (`docs/decisions/0013-gbrain-sha-pin-and-bump-cadence.md`):

- Pin by 40-char commit SHA only — upstream publishes no semver tags.
- Bump bi-weekly (odd ISO-week Mondays), aligned with the Chatwoot upstream sync ritual.
- Hotfix lane (`hotfix/gbrain` label) for CVEs / confirmed breaking changes — no waiting for the window.
- On every bump, re-run the **allowed-drift checks** (ADR-0013 §4) and the
  real integration gate (`spec/.../gbrain_real_integration_spec.rb`, `GBRAIN_REAL=1`).

## Facts verified in source at the pinned SHA

These were read directly from the source at `9a0bae8d62cdd1e0dd6655e24e082fe6c69c5dac`
and are the contract PRs 1-7 build on. Re-verify on every bump.

| Fact | Where | Note |
|---|---|---|
| `GBRAIN_HOME` is the **parent** dir; gbrain appends `.gbrain` itself | `src/core/config.ts` `configDir()` (~L723-735) | `GBRAIN_HOME=/x/2` ⇒ configDir `/x/2/.gbrain`. Per-account isolation works by giving each account a distinct `GBRAIN_HOME`. |
| `init` flags: `--pglite`, `--force`, `--embedding-model <provider:model>`, `--embedding-dimensions <N>`, `--non-interactive`, `--skip-embed-check`, `--no-embedding` | `src/commands/init.ts` | `--non-interactive` ("Don't prompt; use defaults") is **required** for non-TTY provisioning — the provider picker blocks otherwise. |
| `think` accepts `--json`; does **not** accept `--context` | `src/commands/think.ts` | Without `--json`, think prints markdown (would break `JSON.parse`). |
| `think --json` shape | `src/core/think/index.ts` (`ThinkResponse`) | `{ answer, gaps[], modelUsed, pagesGathered, takesGathered, graphHits, citations[], warnings[], saved_slug, evidence_inserted }`. Citations: `{ page_slug: string, row_num: number\|null, citation_index?: number }`. |
| `config set models.think <value>` is valid without `--force` | `src/core/config.ts` `KNOWN_CONFIG_KEYS` / `KNOWN_CONFIG_KEY_PREFIXES` (`models.think`, `models.`) | |
| DeepSeek recipe reads `DEEPSEEK_API_KEY`; base URL hardcoded `https://api.deepseek.com/v1`; model `deepseek-chat`; provider prefix `deepseek` | `src/core/ai/recipes/deepseek.ts` | gbrain does **not** read `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL` — do not inject them. |
| Engine **default** embeddings = `zeroentropyai:zembed-1` / 1280 dims, reading `ZEROENTROPY_API_KEY` | `src/core/ai/defaults.ts` (L20-21), `src/core/config.ts` (L43, L409) | Founder directive 2026-06-04: use the motor default, not OpenAI. OpenAI stays swappable via the provisioner constants. Synthesis (think) uses DeepSeek. |
