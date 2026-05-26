# ADR-0015 — Multi-tenant Brain por account (M3.5 via GBRAIN_DATABASE_URL)

**Status:** Aceita (implementação diferida para M3.5)  
**Data:** 2026-05-26  
**Decisor:** Gustavo (founder/CEO Algorythmo)  
**Depende de:** [ADR-0013](0013-gbrain-sha-pin-and-bump-cadence.md), [ADR-0014](0014-dream-cycle-gate.md)  
**PR:** M3-1 (gate — ADR commitada, scaffolds no código)

## Contexto

O M3 é dogfooding interno Day-1 (founder como único usuário). O M3.5 abre para o primeiro cliente PME externo. A premissa original P3 ("multi-tenant Day-1 upstream") passou por três interpretações ao longo dos codex reviews:

- **v3 (errado):** per-tenant directory + `--dir` flag — inventado, não existe upstream (premise audit confirmou).
- **v4 (errado):** ativar multi-tenant via OAuth scope sobre brain compartilhado — OAuth scopes upstream são operation-level (`read`/`write`/`admin`), NÃO row-level account partitioning.
- **v5 (correto):** brain-per-account via `GBRAIN_DATABASE_URL` env var por subprocess invocation — mecanismo upstream confirmado via WebSearch nos docs do GBrain.

**Mecanismo upstream confirmado:** GBrain expõe `GBRAIN_DATABASE_URL` como env var alternativa a `DATABASE_URL`. Cada invocação `gbrain <cmd>` com env var distinta conecta a um brain DB distinto. Default `~/.gbrain/config.json` aponta para PGLite local; setting `GBRAIN_DATABASE_URL` override para Postgres remoto.

## Decisão

### Day-1 (M3)

- **Um único brain** em `~/.gbrain/` (default upstream, PGLite local) no host do processo Rails/founder.
- `Brain::Client.new(account_id)` aceita `account_id` mas **ignora** em Day-1 — single brain.
- `TenantResolution` concern valida que `current_account.id == ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']`.
- Tabelas engine já têm coluna `account_id` como scaffold (não usado para isolamento Day-1).

### M3.5 (primeiro cliente PME externo)

Quando o primeiro PME externo entrar, provisionar um brain GBrain separado por account:

**Sequência de onboarding (5 passos):**

1. Account criada em Chatwoot (signup flow existente).
2. Sidekiq job `Algorythmo::Brain::ProvisionAccountBrainWorker.perform_async(account_id)`:
   - Cria DB Postgres dedicado (ou schema/database na instance compartilhada — custo TBD M3.5).
   - Roda `gbrain init` com `GBRAIN_DATABASE_URL=<new_url>` via subprocess env.
   - Seed opcional com `brain-template` curado pelo founder durante dogfooding.
3. Registra mapping na tabela `algorythmo_account_brains`:
   ```
   id | account_id (FK accounts, UNIQUE) | database_url (text, encrypted) |
      | created_at | algorythmo_m3_start_date
   ```
4. `Brain::Client.new(account_id)` Day-M3.5 resolve via `AccountBrainRegistry.lookup(account_id)` → `database_url`, passa via `Open3.popen3(env: { 'GBRAIN_DATABASE_URL' => url }, ...)`.
5. Primeira conversa resolvida do account dispara `IngestionWorker(account_id)` → escreve no brain do account.

**Forward-only por account:** cada account tem `algorythmo_m3_start_date` (coluna em `algorythmo_account_brains`, default = `created_at` no provisioning). Ingestion filtra `WHERE brain_indexed_at IS NULL AND created_at > account.algorythmo_m3_start_date`. Sem cross-account backfill.

**Concorrência M3.5:** advisory lock vira per-account — `gbrain:write:lock:<account_id>`. Accounts distintos não contendem entre si.

**MCP upgrade M3.5:** transport HTTP+OAuth+DCR. Token claims carregam `account_id`. `McpTokenValidator` asserta `session.account_id == claim.account_id`. N daemons HTTP (um por account) OU shared daemon com per-request env switch — decisão TBD quando primeiro PME entrar.

### Decisões TBD em M3.5 (não Day-1)

- Postgres database-per-account vs schema-per-account vs row-level (custo × isolamento).
- HTTP daemon shared (per-request env switch) vs daemon-per-account (forte isolamento, mais memória).
- Encryption-at-rest da coluna `database_url` (Rails encrypted credentials ou Vault).

### Defesa em profundidade mantida em M3.5

- Controller concern `TenantResolution` generaliza: remove guard `ALGORYTHMO_PRIMARY_ACCOUNT_ID`; valida membership + resolve account → brain via `AccountBrainRegistry`.
- `Current.account` Sidekiq explícito.
- FK + trigger `algorythmo_brain_ingestion_logs`.
- `where(account_id:)` explícito em todos os scopes (sem `default_scope`).

## Scaffolds commitados no PR M3-1

Os seguintes scaffolds estão no código Day-1 para facilitar M3.5 sem retrabalho:

- `Brain::Client#initialize(account_id)` — aceita arg, ignora Day-1, pronto para resolver em M3.5.
- Coluna `account_id` em `algorythmo_brain_ingestion_logs`, `algorythmo_mcp_sessions`.
- Sidekiq workers recebem `account_id` como arg explícito do job.
- Comentário explícito em `Brain::Client`: "Day-1: account_id ignored, single brain at ~/.gbrain/. Day-M3.5: account_id → brain_path/database_url resolved via AccountBrainRegistry (ADR-0015)."

## Consequências

- **Positivo:** Day-1 é máxima simplicidade (zero multi-tenant code ativo). M3.5 adiciona isolamento real no nível DB sem mudar a interface `Brain::Client`. Forward-only por account garante que cada PME começa com brain limpo.
- **Negativo:** migração do brain do founder (PGLite local → Postgres) requer job manual quando M3.5 chegar. Mitigação: migration job `migrate_founder_brain_to_postgres.rb` documentado.
- **Risco:** entre Day-1 e M3.5, único brain do founder pode acumular ingestion massiva. Mitigação: `account_id` já presente em todas as tabelas; `IngestionWorker` já filtra por account_id; isolamento por DB é cirúrgico quando M3.5 chegar.

## Histórico de revisão

- v5.0 (2026-05-25): ADR criada para separar multi-tenant da dream cycle gate (ADR-0014). Corrige v4 (OAuth scope ≠ row-level partitioning) e v3 (per-tenant directory + `--dir` inexistentes). Mecanismo correto: `GBRAIN_DATABASE_URL` por subprocess invocation (upstream real confirmado).
