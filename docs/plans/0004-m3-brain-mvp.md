# Plano 0004 — M3 Brain MVP (Algorythmo OS)

**Status:** READY_FOR_DISPATCH (planner). Contrato único para os agentes `engineer` (4 trilhas paralelizáveis).
**Versão:** 5.0 (2026-05-25 — concurrency lock + brain-per-account M3.5 architecture absorvendo `/codex review` v4. v4 removeu per-tenant directory; v5 adiciona Redis advisory lock pra serializar writes ao `~/.gbrain/` Day-1 e reescreve R9/ADR-0014 com brain-per-account via `GBRAIN_DATABASE_URL` — mecanismo upstream real, NÃO OAuth scope sobre brain compartilhado).
**Owner:** Gustavo (founder/CEO Algorythmo).
**Linhagem:** v4.0 → v5.0 (concurrency-and-deferral absorption). v3 absorveu spike runtime. v4 absorveu premise audit upstream (drop `--dir`). v5 absorve codex v4: (1) novo attack surface concorrência no `~/.gbrain/` compartilhado entre Rails/Sidekiq/MCP; (2) M3.5 OAuth scope dentro de brain compartilhado é overclaim — upstream tem operation scopes (read/write/admin), não row-level account partitioning. v5 corrige ambos: lock Day-1 + brain-per-account M3.5 via `GBRAIN_DATABASE_URL`.

> **Boundary:** este documento é contrato. Toda decisão de produto, escopo e arquitetura está trancada nos footers do dossiê de office-hours. Ambiguidade arquitetural sobre o motor (GBrain) **defaulta pro upstream** (`feedback_architecture_defer_upstream.md`). Engineer agent não volta pro founder pra detalhes de código — só para os riscos enumerados em §7.

---

## §0 Contexto

O M3 entrega o **Brain MVP do Algorythmo OS** consumindo **GBrain (garrytan/gbrain, MIT, ~18.9k stars) como motor pronto** — não inventamos retrieval, multi-tenant, MCP, knowledge graph nem dream cycle. Construímos só os **5 complementos** que ligam GBrain ao painel Algorythmo OS e ao fork Chatwoot:

1. **UI Ajustes + Viewer + Onboarding** no painel (Vue + Rails endpoint).
2. **Ingestion worker** noturno que move conversas Chatwoot resolvidas pro Brain (forward-only).
3. **Auth bridge MCP** (stdio Day-1, HTTP+OAuth no M3-late).
4. **Configuração de Dream Cycle** (dedup ON, enriquecimento externo OFF — gate explícito).
5. **Instrumentação D5** (snapshot diff semanal + gut-check founder).

Day-1 = dogfooding interno Algorythmo (D1). Founder = único usuário do brain, lead user, single source of truth do knowledge da empresa. Cliente PME externo só no M3.5. Tudo o que está aqui está trancado no dossiê — esta sessão **não reabre decisões**, só estrutura execução.

---

## §1 Escopo (in / out)

### Dentro do escopo M3

1. UI Brain no painel: nav raiz **Brain**, submenus **Viewer** (default landing), **Ajustes**, **Histórico**, **Config**.
2. Empty state Day-1 com onboarding 3 passos (D-D3).
3. 2 componentes novos no design system: `.alg-compiled-truth` e `.alg-timeline-event` (D-D design system).
4. Tabela engine `algorythmo_brain_ingestion_logs` (flag `brain_indexed_at` por conversation — preserva schema Chatwoot upstream). Coluna `account_id` presente como **scaffold M3.5** (Day-1 é sempre o account do founder; M3.5 generaliza).
5. Sidekiq worker `Algorythmo::Brain::IngestionWorker` + cron noturno 02:00 timezone tenant. Worker recebe `account_id` no `perform` como **scaffold M3.5** (Day-1 é sempre o account do founder). **Worker grava no brain sob Redis advisory lock — ver item 15.**
6. Sidekiq worker `Algorythmo::Brain::SnapshotDiffWorker` + cron semanal segunda 06:00. **Grava sob Redis advisory lock — ver item 15.**
7. **Controller concern fail-closed** `Algorythmo::Brain::TenantResolution` incluído em `Algorythmo::Api::V1::Brain::BaseController` — herda da chain Chatwoot existente (`Api::BaseController` → `Api::V1::Accounts::BaseController` → engine `BaseController`), valida membership como gate explícito de defesa em profundidade (D-A8). Day-1 trivialmente verifica que `current_account` é o único Algorythmo account (ID resolvido por `ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence` — env unset = 403 fail-closed, NÃO 500); M3.5 generaliza pra múltiplos tenants via `AccountBrainRegistry`. **Não é Rack middleware** — runtime fact validado pelo spike.
8. Endpoint Rails que aceita ajustes (markdown + frontmatter), grava no brain repo, **dispara `gbrain capture` via worker enfileirado** (não foreground) → write serializado pela queue.
9. MCP stdio handshake Day-1 (founder consome via Cursor/Claude Code). **Transport = stdio subprocess por sessão** — cada conexão Cursor/Claude inicia `gbrain serve` (stdio), finaliza ao desconectar. Subprocess é stdio long-lived enquanto o cliente MCP mantém conexão aberta (pode rodar horas em sessão Cursor ativa), NÃO é daemon shared multi-cliente. **MCP writes (capture via Cursor tool) também passam pelo Redis advisory lock — ver item 15.** HTTP mode (`gbrain serve --http`, daemon long-running) fica em M3.5 com estratégia brain-per-account (ADR-0014).
10. ADR-0012 (GBrain **SHA pin + cadência bi-semanal + hotfix lane**), ADR-0013 (dream cycle gate dedup-only), **ADR-0014 (multi-tenant infra M3.5 — brain-per-account via `GBRAIN_DATABASE_URL`)**.
11. **Tabela `algorythmo_mcp_sessions`** (source-of-truth de tokens MCP) com TTL 8h sliding (D-A5). Coluna `account_id` presente como **scaffold M3.5**; Day-1 é sempre o account do founder.
12. Pin de GBrain via **commit SHA de 40 chars** no manifesto (Gemfile ou package.json conforme upstream — defer pro engineer no Day-0).
13. Smoke test Ollama `nomic-embed-text` no Day-0 do M3 (10 queries reais PT-BR).
14. **PR M3-1.5 — integration test lane real** contra GBrain SHA pinado (CI nightly + manual trigger). **Inclui stress test de concorrência (Rails + Sidekiq + MCP simultâneos) — ver item 15.**
15. **Redis advisory lock `gbrain:write:lock` (NOVO v5)** — toda invocação de `gbrain capture` ou `gbrain export` (Rails foreground, Sidekiq workers, MCP capture-from-Cursor) adquire lock antes de spawn do subprocess, libera no completion. TTL 30s (cobre p99 de operação). Bloqueia → enfileira retry via Sidekiq. Wrapper: `Algorythmo::Brain::WriteLock.with_lock { ... }` em `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb`. Garante serialização sem depender de Sidekiq queue config (que é process-global, não per-queue). PGLite (default GBrain) usa file lock interno — concorrência sem advisory lock causaria `database is locked` errors em writes simultâneos.

### Fora do escopo M3 (fica em M3.5 / M4 / M5 — §9)

- Manu (M4) consumindo Brain via `gbrain think` — só **smoke gate manual** no fim do M3.
- Onboarding flow de cliente PME externo, painel multi-tenant de admin de tenants.
- Schema pack customizado pra B2B sales (`lead`, `objection`, `pricing-policy`).
- HTTP+OAuth+DCR completo pro MCP — **scaffolded** no M3-late, ativo só quando M4 acender. **Multi-tenant infra (brain-per-account via `GBRAIN_DATABASE_URL` + daemon HTTP por account) é M3.5+ via ADR-0014.** OAuth scope upstream é operation-level (read/write/admin), NÃO row-level account partitioning — corrigido em v5.
- **Per-tenant directory isolation (`/var/algorythmo/tenants/<account_id>/brain`) — fora Day-1.** Plano v3 inventou; v4 removeu. Brain único Day-1 em `~/.gbrain/` (default upstream); M3.5 = N brains via `GBRAIN_DATABASE_URL` distintos.
- **Filesystem isolation OS-level (UID per tenant, `useradd`, `chown`, `setuid`, `bwrap`/`firejail`) — fora Day-1.** Single user = nada pra isolar de. M3.5 backlog se segurança extra justificar (mais provável: 1 daemon HTTP per-account + DB isolation).
- Enriquecimento externo (Linkedin lookup, CNPJ, dossiê IA, fix_citations_external, score_salience_external) — **M5**, hard line.
- Mobile responsivo da UI Brain — desktop-only Day-1.
- Deploy cloud, hosting Git privado pra tenants externos (Gitea/Gogs/bare repo+SSH) — M4+.
- Reatribuição manual de owner de ajuste, audit log granular cross-leitor (suficiente o que GBrain entrega upstream).
- Backfill de conversas históricas pré-M3 — forward-only por decisão (D-ING).

---

## §2 Decisões trancadas — referência rápida

Todas as decisões abaixo estão materializadas nos dois footers do dossiê `docs/algorythmo/M3-brain/office-hours.md`. **Engineer NÃO reabre nenhuma** — defer pra upstream GBrain quando faltar detalhe arquitetural (`feedback_architecture_defer_upstream.md`).

| ID | Tópico | Escolha trancada | Footer |
|---|---|---|---|
| **D-A1** | Pin de versão GBrain | **Pin por commit SHA** (não tag — upstream não publica release tags; v2.0 correction). Cadência **bi-semanal** (segunda da semana ímpar) + **hotfix lane** pra CVE/regression. ADR-0012 documenta. | plan-eng |
| **D-A4** | MCP transport | stdio Day-1 (Cursor/Claude Code); HTTP+OAuth+DCR scaffolded no M3-late, antes do spike M4 Manu. **Multi-tenant ativo só em M3.5** (via brain-per-account `GBRAIN_DATABASE_URL`, NÃO OAuth scope no shared brain — corrigido v5). | plan-eng |
| **D-A5** | MCP token storage | Tabela `algorythmo_mcp_sessions` (source-of-truth) + Redis cache de validação (TTL 5min). TTL 8h **sliding** (renova em cada call). Invalidação via `UPDATE … revoked_at` + `DEL` no cache; **janela de tolerância de até 5min se DEL falhar — founder aceitou Day-1 (spike v3.0)**. Token entregue ao founder via arquivo `~/.config/algorythmo/mcp-token` (`0600`), nunca CLI arg. Validação per-call no stdio. DTA não tem logout event confiável → override `SessionsController#destroy` é **defense-in-depth**, não mecanismo principal; expiração real = TTL 8h sliding. | plan-eng |
| **D-A8** | Resolução de tenant_id | `account_id` Chatwoot + **controller concern `Algorythmo::Brain::TenantResolution`** incluído em `Algorythmo::Api::V1::Brain::BaseController` (herda chain Chatwoot existente). **Day-1: verificação trivial de que `current_account.id == ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence`; env unset = 403 fail-closed via `head :forbidden` + `Rails.logger.error("ALGORYTHMO_PRIMARY_ACCOUNT_ID not set")`, NÃO 500 por `KeyError`**. Sidekiq workers recebem `account_id` **explícito como arg** + setam `Current.account` no `perform` (scaffold M3.5 — Day-1 sempre é o founder). **ActiveRecord usa `where(account_id:)` explícito — não `default_scope`**. **Sem per-tenant filesystem path Day-1** — brain único em `~/.gbrain/` (default upstream). | plan-eng |
| **D-LOCK** *(NOVO v5)* | Concorrência writes ao Brain | **Redis advisory lock `gbrain:write:lock` (SET NX EX 30s)** envolve toda invocação `gbrain capture`/`gbrain export`. Aplicável: Rails foreground (adjustment), Sidekiq workers (ingestion/snapshot), MCP path quando Cursor pede capture. Wrapper `Algorythmo::Brain::WriteLock.with_lock { … }` em `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb`. Lock contention → retry via Sidekiq (re-enqueue com backoff 2s/4s/8s, max 3). Stress test em PR M3-1.5 valida. Day-0 spike (10min, 3 terminais concorrentes) confirma se PGLite single-writer file lock comporta ou se precisa apertar TTL/backoff. | plan-eng |
| **D-OQ5** | Embedding provider | Ollama local (`nomic-embed-text`). Zero custo, zero envio externo. Smoke test no Day-0 valida. | plan-eng |
| **D-ING** | Backfill de conversas | Forward-only (a partir do Day-1 do M3). Brain nasce limpo. | plan-eng |
| **D-DREAM** | Dream Cycle escopo | `auto_link: on`, `dedup_entities: on`; todos `*_external: off`. ADR-0013 documenta. | plan-eng (P5) |
| **D-ARCH** | Stack/arquitetura interna | Seguir GBrain upstream sem inventar abstração própria. Brain repo storage, Postgres layout, ingestion granularity, dream cycle internals — defaults do motor. **v4: removeu per-tenant directory + `--dir` flag inventados. v5: removeu OAuth scope sobre brain compartilhado como mecanismo M3.5 — substitui por brain-per-account via `GBRAIN_DATABASE_URL` (mecanismo upstream real).** | plan-eng |
| **D-D1** | Brain placement na sidebar | Menu raiz **Brain** (não subseção CRM). Cross-cutting nature reflete D2 + D4. | plan-design |
| **D-D2** | Brain landing screen | **Viewer** (Compiled Truth + Timeline). Reforça D5 toda sessão. Ajustes a 1 clique. | plan-design |
| **D-D3** | Empty state Day-1 | Onboarding 3 passos. Não auto-popula (preserva D2 "ato de colar é metade do valor"). | plan-design |

### Premissa P3 reinterpretada (v5)

P3 do office hours original ("multi-tenant Day-1 upstream"). 
- **v3 mis-leu** como "wire per-tenant directory + `--dir` flag Day-1" — overengineering, e `--dir` não existe upstream.
- **v4 corrigiu** pra "motor GBrain TEM capacidade multi-tenant" + defer ativação pra M3.5 via OAuth scope.
- **v5 corrige novamente:** upstream fornece **single-account single-brain** + OAuth scopes que são **operation-level** (read/write/admin), NÃO row-level account partitioning. Multi-account = **multiple brain instances** (uma por account), NÃO scopes sobre brain compartilhado. **Day-1: single brain único em `~/.gbrain/` (founder).** **M3.5: N brains, um por account, isolados por `GBRAIN_DATABASE_URL` distinto (mecanismo upstream real — `~/.gbrain/config.json` resolve DB URL via env var). ADR-0014 documenta.**

Hard lines herdadas do dossiê:
- Cliente PME nunca vê markdown, MCP, Obsidian, Chatwoot — só painel Algorythmo OS (D5 estendida).
- Sem mudança em schema upstream Chatwoot (preserva sync mensal D1).
- BYOK estendido — chave do tenant paga embeddings + LLM. Day-1, founder usa sua própria.

---

## §3 Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Painel Algorythmo OS                          │
│                                                                      │
│  Sidebar Nav (root):   [CRM]   [Brain ★ M3]   [Settings]             │
│                                  │                                   │
│                                  ▼                                   │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │ /brain (Vue routes — algorythmo_brain feature gate)          │   │
│   │   Viewer / Ajustes / Histórico / Config                      │   │
│   └──────────────────────────────────────────────────────────────┘   │
│                                  │  HTTP (axios → Rails)             │
└──────────────────────────────────┼───────────────────────────────────┘
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    Rails — engine `algorythmo`                       │
│                                                                      │
│   Algorythmo::Api::V1::Brain::BaseController                         │
│   ↳ chain: Api::Base (DTA) → Accounts::Base (current_account) →      │
│           Algorythmo::Api::V1::Base (feature gate) → Brain::Base     │
│   ↳ includes Algorythmo::Brain::TenantResolution (concern)           │
│   ↳ Day-1: ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence guard       │
│      env unset → 403 + Rails.logger.error (NEVER 500)                │
│                                  │                                   │
│   Algorythmo::Api::V1::BrainController                               │
│   POST  /brain/adjustments  →  enqueue IngestionWorker (NOT sync)    │
│   GET   /brain/compiled_truth                                        │
│   GET   /brain/timeline                                              │
│   POST  /brain/mcp_token                                             │
│   GET   /brain/snapshots                                             │
│                                  │                                   │
│   Algorythmo::Brain::Client (thin wrapper over GBrain CLI)           │
│   ↳ initialize(account_id) — Day-1 ignora; M3.5 resolve via          │
│     AccountBrainRegistry → GBRAIN_DATABASE_URL (ADR-0014)            │
│   ↳ All write methods wrap in Algorythmo::Brain::WriteLock           │
│                                  │  subprocess Open3 + Redis lock    │
└──────────────────────────────────┼───────────────────────────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌──────────────────┐    ┌──────────────────────┐   ┌──────────────────┐
│ Redis            │    │ GBrain (subprocess)  │   │ Sidekiq Workers  │
│                  │    │                      │   │                  │
│ gbrain:write:    │◄───┤ ~/.gbrain/           │   │ IngestionWorker  │
│ lock (NX EX 30s) │    │ (PGLite default)     │◄──┤  (cron 02h)      │
│                  │    │                      │   │  acquires lock   │
│ mcp:session:*    │    │ Embeddings: Ollama   │   │  → gbrain capture│
│ (TTL 5min)       │    │  (nomic-embed-text)  │   │                  │
└──────────────────┘    │                      │◄──┤ SnapshotDiff     │
                        │ Dream Cycle (cron)   │   │  (cron Mon 06h)  │
                        │  ✓ auto_link         │   │  acquires lock   │
                        │  ✓ dedup_entities    │   │  → gbrain export │
                        │  ✗ enrich_external   │   └──────────────────┘
                        └──────────┬───────────┘
                                   │ MCP protocol
                                   ▼
                ┌──────────────────────────────────────────┐
                │ MCP stdio                                │
                │  Cursor/Claude → `gbrain serve` (stdio)  │
                │  long-lived per session, exits on close  │
                │  capture-from-Cursor → goes through      │
                │  Rails endpoint → acquires write lock    │
                └──────────────────────────────────────────┘
                          ▲
                          │  founder consults daily (D4)
                      ┌───┴────┐
                      │ Cursor │  Claude Code
                      └────────┘

       Cliente Chatwoot upstream (mensagens entram normal)
                │
                ▼
   ┌──────────────────────────────────────────┐
   │ algorythmo_brain_ingestion_logs           │
   │ (conv_id + brain_indexed_at + account_id) │  ← preserva schema upstream
   │ + FK conversations(id) + trigger account  │
   └──────────────────────────────────────────┘

   M3.5 (FUTURO — ADR-0014):
   ┌──────────────────────────────────────────────────────────────┐
   │ algorythmo_account_brains (account_id, database_url, …)      │
   │   → Brain::Client.new(account_id) resolves DB URL            │
   │   → subprocess invoked with GBRAIN_DATABASE_URL=<url>        │
   │   → each account has its own brain DB (Postgres+pgvector)    │
   │   → HTTP daemon per account OR shared daemon with per-call   │
   │     env switch (TBD em ADR-0014 quando primeiro PME entrar)  │
   └──────────────────────────────────────────────────────────────┘
```

**Pontos arquiteturais críticos:**

- Toda escrita ao Brain passa pelo `Algorythmo::Brain::Client` — wrapper fino, sem abstrair contract do GBrain.
- **Day-1 = um único brain** no diretório default do upstream (`~/.gbrain/` no host do Chatwoot process user). Sem `--dir` arg (não existe upstream), sem per-tenant path.
- **Day-1 concorrência protegida por Redis advisory lock** `gbrain:write:lock` (NX EX 30s). Wrapper `Algorythmo::Brain::WriteLock.with_lock { … }` envolve toda chamada que invoca `gbrain capture` ou `gbrain export`. Aplicável: Rails foreground, Sidekiq workers, MCP capture-from-Cursor (path roteado via Rails endpoint, não direto pro daemon stdio). Lock contention = retry via Sidekiq backoff (2s/4s/8s, max 3). PGLite usa file lock interno; advisory lock evita o lock conflict no nível Ruby antes mesmo de o subprocess tentar.
- **MCP stdio é majoritariamente leitura.** Cursor `search`/`think` queries não pegam lock. Quando Cursor pede `capture` (escrita), o path correto é o user trigger no painel ou ferramenta separada que enfileira via Rails — NÃO direto via `gbrain serve` stdio. Plan §4 T3 documenta. v5 deferral: se M3.5 expor `capture` via MCP tool diretamente, então `gbrain serve` daemon precisa adquirir o mesmo lock — fora escopo Day-1.
- Tenant é resolvido **no controller** (HTTP, via concern + before_action) ou **explicitamente no `perform`** (Sidekiq); Day-1 é sempre o único Algorythmo account, mas o arg `account_id` é preservado como scaffold M3.5.
- **Sidekiq jobs setam `Current.account` explicitamente** + initializer `algorythmo_sidekiq_current_reset.rb` reseta entre jobs.
- Queries Brain do ActiveRecord **explicitam `where(account_id: …)`** — sem `default_scope`.
- **TenantResolution é controller concern, não Rack middleware** (fato spike). Day-1: `current_account.id.to_s == ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence` → 403 se env unset (NÃO 500 via `ENV.fetch`). Protótipo: `.worktrees/spike-m3-validation/engines/algorythmo/app/controllers/concerns/algorythmo/brain/tenant_resolution.rb`.
- A tabela `algorythmo_brain_ingestion_logs` é o único toque em DB no fork. Inclui **FK real pra `conversations(id)`** e **trigger constraint** `brain_ingestion_assert_account_match` (`BEFORE INSERT OR UPDATE`) validando `account_id = (SELECT account_id FROM conversations WHERE conversations.id = NEW.conversation_id)`. Engineer pode optar por deferrable composite FK `(conversation_id, account_id) REFERENCES conversations(id, account_id)` se índice composto existir upstream. **Wording v5: "trigger constraint OR deferrable composite FK", NÃO "check constraint" (Postgres rejeita subquery em CHECK).**
- **GBrain stdio = subprocess por sessão MCP**. Cada conexão Cursor inicia `gbrain serve` (stdio) novo. Ingestion/snapshot workers invocam `gbrain capture`/`gbrain export` como CLI calls síncronos (subprocess curto).
- **M3.5 deferral path (ADR-0014):** brain-per-account via `GBRAIN_DATABASE_URL` distinto por subprocess invocation. Tabela `algorythmo_account_brains` (account_id → database_url) registra mapping. `Brain::Client.new(account_id)` Day-M3.5 resolve via essa tabela; Day-1 ignora porque há um único brain.
- Dream cycle config é YAML versionado (`config/gbrain_dream_cycle.yml`) — toggles ON/OFF por arquivo, ADR-0013 explica o gate.

---

## §4 Trilhas de implementação

**v5.0:** **T0 é o gate** (PR M3-1 — serial, bloqueia tudo). Depois T1–T4 paralelizam respeitando o grafo de §10. Cada trilha é PR-sized. Dependências marcadas em "Depende de".

### Trilha T0 — Gate (PR M3-1) — serial, bloqueia T1/T2/T3/T4

**Owner sugerido:** engineer agent (sozinho, PR antes de qualquer dispatch paralelo).
**Esforço:** S (2-3 dias).
**Depende de:** pre-dispatch global (§8).

**Files (criar):**

- `engines/algorythmo/app/controllers/concerns/algorythmo/brain/tenant_resolution.rb` — Controller concern. `before_action :resolve_tenant!`. Valida `current_account` + revalida `AccountUser` membership. **Day-1 guard: `ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence` (NÃO `ENV.fetch`). Env unset OR mismatch → `Rails.logger.error("ALGORYTHMO_PRIMARY_ACCOUNT_ID not set")` + `head :forbidden`. Nunca 500.** Tag Sentry `account_id` + `user_id`. M3.5 generalizará via `AccountBrainRegistry` lookup (ADR-0014).
- `engines/algorythmo/app/controllers/algorythmo/api/v1/brain/base_controller.rb` — `< Algorythmo::Api::V1::BaseController`, `include Algorythmo::Brain::TenantResolution`. Comment header documenta auth chain (5 níveis).
- `engines/algorythmo/spec/algorythmo/controllers/api/v1/brain/tenant_resolution_spec.rb` — cases:
  - sem auth → 401 (Chatwoot chain rejeita)
  - user sem membership → 401/403
  - user com membership + env match → 200 + `Current.account` setado
  - `current_account.id != ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']` → 403
  - **env var UNSET → 403 + `Rails.logger.error` capturado, NÃO 500 (P2 codex v4 closure)**
  - ordem do `before_action`: roda DEPOIS de `current_account` + `ensure_algorythmo_crm_enabled!`
- `engines/algorythmo/app/services/algorythmo/brain/client.rb` — **skeleton** (interface frozen). Construtor `initialize(account_id)`. Métodos: `capture(file:)`, `search(query:, limit:)`, `think(prompt:, context:)`, `export(out:)`, `stats`. Body `raise NotImplementedError`. Comment: **"Day-1: account_id ignored, single brain at ~/.gbrain/. Day-M3.5: account_id → brain_path/database_url resolved via AccountBrainRegistry (table `algorythmo_account_brains`, TBD em ADR-0014)."**
- `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb` — **NOVO v5.** Wrapper Redis advisory lock. Interface:
  ```ruby
  module Algorythmo::Brain
    class WriteLock
      LOCK_KEY = 'gbrain:write:lock'
      LOCK_TTL = 30  # seconds, covers p99 capture/export

      def self.with_lock(timeout: 5, &block)
        token = SecureRandom.uuid
        acquired = Redis.current.set(LOCK_KEY, token, nx: true, ex: LOCK_TTL)
        raise LockContended unless acquired
        block.call
      ensure
        # Release only if we still own the lock (Lua script for atomicity)
        release_if_owned(token) if acquired
      end

      class LockContended < StandardError; end
    end
  end
  ```
  Body skeleton no PR M3-1 (interface frozen, full impl em M3-2).
- `engines/algorythmo/spec/algorythmo/services/brain/client_interface_spec.rb` — valida 5 métodos + arity + `NotImplementedError`.
- `engines/algorythmo/spec/algorythmo/services/brain/write_lock_interface_spec.rb` — `with_lock` aceita block; `LockContended` raise é classe definida.
- `engines/algorythmo/config/routes.rb` — TODAS rotas Brain consolidadas (`compiled_truth`, `timeline`, `adjustments`, `mcp_token`, `mcp_sessions`, `snapshots`, `oauth/dcr`). Stub controller responde `head :not_implemented` (501).
- `docs/architecture/decisions/0012-gbrain-pin-and-bump-cadence.md` — ADR-0012 completo (inalterado vs v4).
- `docs/architecture/decisions/0013-dream-cycle-gate.md` — ADR-0013 (dream cycle gate). **v5: appendix "Multi-tenant deferred to ADR-0014" — body principal só dream cycle.**
- `docs/architecture/decisions/0014-multi-tenant-brain-per-account.md` — **ADR-0014 (NOVO v5).** Conteúdo em §5 abaixo.
- **Manifesto pin:** `Gemfile` ou `package.json` referencia `garrytan/gbrain@<sha40>`.

**Critérios de aceitação (gate):**

- `bundle exec rspec engines/algorythmo/spec/algorythmo/controllers/api/v1/brain/tenant_resolution_spec.rb` verde (todos 5 cases, incluindo env unset = 403).
- `grep -r 'default_scope' engines/algorythmo/app/models/algorythmo/brain/` vazio.
- `engines/algorythmo/config/routes.rb` lista rotas + controllers stub respondem 501.
- ADR-0012 + ADR-0013 + ADR-0014 commitadas com SHA pinado citado.
- **Route audit spec** `engines/algorythmo/spec/algorythmo/routes/brain_routes_spec.rb` (NOVO v5) — itera sobre `Rails.application.routes.routes`, filtra Brain routes, asserta que cada controller herda de `Algorythmo::Api::V1::Brain::BaseController`. Request specs específicos pra cada rota: non-founder → 403, founder → 200/201/501.

---

### Trilha T1 — UI Ajustes + Viewer + Onboarding + Histórico + Config

**Owner sugerido:** engineer agent + designer agent.
**Esforço:** L (8-10 dias).
**Depende de:** PR M3-1 (gate) e PR M3-2 (`Brain::Client` + `WriteLock` body). **Contract test (T1↔T2 boundary) é blocking pro merge.**

**Files (criar):**

- `app/javascript/dashboard/routes/dashboard/brain/brain.routes.js` — rotas `/brain`, `/brain/adjustments`, `/brain/history`, `/brain/config` com `meta.algorythmoFeatureFlag: 'algorythmo_brain'`.
- `app/javascript/dashboard/routes/dashboard/brain/views/Viewer.vue` — landing. Compiled Truth + Timeline. Empty state condicional (D-D3).
- `app/javascript/dashboard/routes/dashboard/brain/views/Adjustments.vue` — lista + AlgDrawer editor. Submit envia markdown + frontmatter pro Rails (que **enfileira via worker**, não chama gbrain sync).
- `app/javascript/dashboard/routes/dashboard/brain/views/History.vue` — timeline de snapshots semanais.
- `app/javascript/dashboard/routes/dashboard/brain/views/Config.vue` — MCP token gen, embedding provider read-only, ingestion toggle.
- `app/javascript/dashboard/routes/dashboard/brain/views/components/OnboardingThreeSteps.vue` — 3 passos (D-D3).
- `app/javascript/dashboard/routes/dashboard/brain/views/components/CompiledTruthBlock.vue` — usa `.alg-compiled-truth`.
- `app/javascript/dashboard/routes/dashboard/brain/views/components/TimelineEventCard.vue` — usa `.alg-timeline-event`.
- `app/javascript/dashboard/helper/algorythmo/brainApi.js` — axios wrapper.
- `app/javascript/dashboard/composables/algorythmo/useBrain.js` — store: `viewer`, `timeline`, `adjustments[]`, `snapshots[]`, `ingestionEnabled`, `mcpTokenLastIssued`.

**Files (modificar):**

- `app/javascript/dashboard/constants/algorythmoFeatureFlags.js` — adicionar `'algorythmo_brain'`.
- `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` — item raiz "Brain".
- `app/javascript/dashboard/routes/dashboard.routes.js` — montar brain.routes.
- `app/javascript/dashboard/i18n/locale/{en,pt_BR}/index.js` — strings BRAIN_*.
- `engines/algorythmo/app/assets/stylesheets/_components.scss` — `.alg-compiled-truth` + `.alg-timeline-event`.
- `engines/algorythmo/DESIGN.md` — §3.11 + §3.12.

**Testes mínimos:**

- `Viewer.spec.js`, `Adjustments.spec.js`, `Config.spec.js`, `useBrain.spec.js` (Vitest).
- **`engines/algorythmo/spec/algorythmo/contracts/brain_api_contract_spec.rb` — BLOCKING.** Valida shape JSON real dos endpoints contra fixtures Vue.

**Critérios de aceitação:**

- Cliente sem flag `algorythmo_brain` não vê sidebar.
- Founder Day-1 (Viewer vazio) vê 3 passos onboarding.
- Histórico mostra primeiro snapshot até segunda 06:00 da semana 1.
- Config emite token MCP 1× via download, comando exibido NÃO contém token cru.
- Lighthouse a11y ≥ 95.

---

### Trilha T2 — Ingestion worker forward-only

**Owner sugerido:** engineer agent.
**Esforço:** M (4-5 dias).
**Depende de:** PR M3-1 (gate) e PR M3-2 (`Brain::Client` + `WriteLock` body).

**Files (criar):**

- `engines/algorythmo/db/migrate/<ts>_create_brain_ingestion_logs.rb` — tabela `algorythmo_brain_ingestion_logs`. Colunas: `id`, `account_id` (FK `accounts(id)`, NOT NULL — scaffold M3.5), `conversation_id` (FK `conversations(id)` ON DELETE CASCADE), `brain_indexed_at`, `brain_page_path`, `outcome` (enum), `last_error`, timestamps. Index único `(account_id, conversation_id)`. **Invariant `account_id = conversations.account_id`: implementar como TRIGGER `BEFORE INSERT OR UPDATE` OU deferrable composite FK `(conversation_id, account_id) REFERENCES conversations(id, account_id)` (se índice composto existir/criar). "Check constraint" NÃO é viável (Postgres rejeita subquery em CHECK) — wording corrigido v5.**
- `engines/algorythmo/app/models/algorythmo/brain/ingestion_log.rb` — AR model. `belongs_to :account`, `belongs_to :conversation`. Sem `default_scope`.
- `engines/algorythmo/app/workers/algorythmo/brain/ingestion_worker.rb` — Sidekiq worker. `perform(account_id, conversation_id = nil)`. Primeira linha: `Current.account = Account.find(account_id)`. Lê conversas resolvidas + `created_at > account.algorythmo_m3_start_date`. Para cada: `Algorythmo::Brain::WriteLock.with_lock { Algorythmo::Brain::Client.new(account_id).capture(file: …) }`. Lock contention → re-enqueue com backoff (sidekiq retry).
- `engines/algorythmo/app/services/algorythmo/brain/conversation_to_markdown.rb` — markdown gen.
- `engines/algorythmo/app/services/algorythmo/brain/client.rb` (body) — subprocess via `Open3.popen3` invocando `gbrain <subcommand>` SEM flag de path Day-1 (default upstream). **v5: explicit comment "account_id ignored Day-1; M3.5 will set GBRAIN_DATABASE_URL via Open3 env hash from AccountBrainRegistry."**
- `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb` (body) — full Redis NX EX + Lua release. Stress test conjugado em M3-1.5.
- `engines/algorythmo/config/initializers/sidekiq_ingestion_cron.rb` — cron diário 02:00.
- `engines/algorythmo/config/gbrain_dream_cycle.yml` — `auto_link: on`, `dedup_entities: on`, todos `*_external: off`.

**Testes mínimos:**

- `ingestion_worker_spec.rb` — idempotência; forward-only; falha grava log; `Current.account` setado pré-query; trigger/FK rejeita `account_id` divergente; **lock contention re-enqueues** (mock `WriteLock` raising `LockContended`).
- `conversation_to_markdown_spec.rb` — frontmatter completo, filtra `private: true`.
- `client_spec.rb` — subprocess sem `--dir`; stderr surface em raise; stdio mode exits ao stdin close.
- `write_lock_spec.rb` — acquire/release happy path; concurrent acquire raises `LockContended`; TTL expiry; Lua release script só libera se token bate.
- `gbrain_dream_cycle_spec.rb` — nenhuma chave `*_external` ativa.

**Critérios de aceitação:**

- Conversa nova resolvida → worker corre → `gbrain capture` chamado sob lock → log atualizado.
- Re-run não duplica.
- Pre-`m3_start_date` ignorada.
- Concurrent jobs serializados pelo lock (verificável via stress test M3-1.5).

---

### Trilha T3 — MCP auth bridge (stdio Day-1 + HTTP scaffold M3-late)

**Owner sugerido:** engineer agent.
**Esforço:** M (5-6 dias).
**Depende de:** PR M3-1 + PR M3-2.

**Files (criar — stdio MCP Day-1):**

- `engines/algorythmo/db/migrate/<ts>_create_mcp_sessions.rb` — tabela `algorythmo_mcp_sessions`. Colunas: `id` (uuid), `user_id` (FK), `account_id` (FK — scaffold M3.5), `token_hash` (sha256), `scope` (enum), `expires_at`, `revoked_at`, `last_used_at`, timestamps. Index unique `(token_hash)`; partial `(user_id, account_id) WHERE revoked_at IS NULL`.
- `engines/algorythmo/app/models/algorythmo/mcp_session.rb` — scope `active`; `revoke!`; `touch_usage!` (sliding 8h).
- `engines/algorythmo/config/mcp_scopes.rb` — 4 escopos.
- `engines/algorythmo/app/services/algorythmo/brain/mcp_token_issuer.rb` — gera bearer; persiste só `token_hash`; popula Redis 5min.
- `engines/algorythmo/app/services/algorythmo/brain/mcp_token_validator.rb` — per-call validation. Cache Redis → DB fallback. Distingue `mcp/auth_expired` vs `mcp/auth_unavailable`. **v5 explicit deferral note: "Day-1 stdio carries no per-call account context. Single-account assumption (ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']) guards correctness. M3.5: MCP transport upgrades to HTTP+OAuth where account is in token claims → validator asserts session.account_id == claim.account_id."**
- `engines/algorythmo/app/controllers/algorythmo/api/v1/brain/mcp_tokens_controller.rb` — `POST /brain/mcp_token` retorna `{ token, token_file_path, command, expires_at, mode }`. Token nunca em CLI arg.
- `engines/algorythmo/app/controllers/algorythmo/api/v1/brain/mcp_sessions_controller.rb` — `DELETE /brain/mcp_sessions` revoga todas + `DEL` cache best-effort. **Janela 5min documentada.**
- Override `Devise::SessionsController#destroy` — defense-in-depth.
- `docs/algorythmo/M3-brain/mcp-setup.md` — setup instructions.

**Files (criar — HTTP scaffold M3-late):**

- `engines/algorythmo/app/controllers/algorythmo/oauth/dcr_controller.rb` — DCR endpoint. Flag `algorythmo_brain_mcp_http` OFF default.
- `engines/algorythmo/spec/algorythmo/oauth/dcr_controller_spec.rb` — flag OFF = 404; ON = registra.

**Testes mínimos:**

- `mcp_token_issuer_spec.rb`, `mcp_token_validator_spec.rb`, `mcp_session_spec.rb`.
- Integration spec stdio handshake via `Open3`.
- `mcp_sessions_controller_spec.rb` — DELETE revoga; cross-user isolation (scaffold spec).
- Devise hook spec (defense-in-depth).

**Critérios de aceitação:**

- Founder gera token → arquivo `0600` → Cursor consulta funciona.
- TTL 8h sliding; revogação UI propaga ≤5min.
- Per-call validation. Cache Redis evicted + DB ok = repopula. Ambos down = `auth_unavailable`.
- Subprocess stdio exits ao desconectar.
- Bearer NÃO aparece em logs/`ps aux`/shell history.

---

### Trilha T4 — Instrumentação D5 (snapshot diff + Histórico + gut-check)

**Owner sugerido:** engineer agent.
**Esforço:** S-M (3-4 dias).
**Depende de:** PR M3-1 + PR M3-2 + PR M3-4.

**Files (criar):**

- `engines/algorythmo/app/workers/algorythmo/brain/snapshot_diff_worker.rb` — `perform(account_id)`. Segunda 06:00. Primeira linha: `Current.account = Account.find(account_id)`. **Chama `Algorythmo::Brain::WriteLock.with_lock { Algorythmo::Brain::Client.new(account_id).export(out: tmp) }` (export é tecnicamente read mas serialização defensive — evita race com capture concurrent).** Compara com snapshot anterior. Grava em `docs/algorythmo/M3-brain/weekly-snapshots/YYYY-WW.md`. Dispara Mailer.
- `engines/algorythmo/db/migrate/<ts>_create_brain_snapshots.rb` — tabela `algorythmo_brain_snapshots` (account_id scaffold M3.5).
- `engines/algorythmo/app/models/algorythmo/brain/snapshot.rb` — sem default_scope.
- `engines/algorythmo/app/mailers/algorythmo/brain/snapshot_mailer.rb` — email semanal.
- `engines/algorythmo/app/controllers/algorythmo/api/v1/brain/snapshots_controller.rb` — `GET /brain/snapshots` + `POST /brain/snapshots/:id/gut_check`.
- `engines/algorythmo/config/initializers/sidekiq_snapshot_cron.rb` — arquivo separado (T2 owns ingestion, T4 owns snapshot).

**Files (modificar):**

- `History.vue` — feed real consumindo `/brain/snapshots`.
- `Viewer.vue` — header stat "Brain respondeu N perguntas via MCP" (consome `gbrain stats`, read-only sem lock).

**Testes mínimos:**

- `snapshot_diff_worker_spec.rb` — baseline + diff entry; `Current.account` pré-query; **lock acquired around export**.
- Mailer spec.
- History.vue spec.

**Critérios de aceitação:**

- 4 semanas consecutivas = 4 arquivos markdown.
- Founder recebe email Mon 06:00 (timezone).
- Gut-check resposta arquivada.
- D5 critério passa se: ≥1 nova página OR ≥3 timeline events OR ≥1 typed edge em 4/4 semanas + gut-check "sim" em ≥3/4.

---

## §5 ADRs a escrever (junto da primeira PR M3)

### ADR-0012 — GBrain como motor do Brain Algorythmo OS (SHA pin + bi-semanal + hotfix lane)

**Decide:** GBrain (garrytan/gbrain, MIT) é o motor.

**Pin:** commit SHA 40 chars (não tag). Manifesto referencia `garrytan/gbrain@<sha40>`.

**Cadência:** bi-semanal (segunda da semana ímpar ISO). Hotfix lane pra CVE/regression urgente.

**Allowed drift checks** (PR M3-1.5 valida): embedding default flip, CLI flag removal, MCP transport change, migration schema.

**Política breaking change:** hold 1 janela bi-semanal (2 sem) + hotfix sempre disponível.

**Defer permanente pro upstream:** brain storage, Postgres layout, ingestion granularity, dream cycle internals, **mecanismo multi-tenant (brain-per-account via `GBRAIN_DATABASE_URL` — ADR-0014)**.

### ADR-0013 — Dream Cycle gate (dedup ON, external OFF até M5)

**Decide:** Dream Cycle roda subset travado em YAML: `auto_link: on`, `dedup_entities: on`. Todos `*_external: off` até M5. Spec gate: YAML não pode ter chave `/_external$/` truthy.

**v5 cleanup:** filesystem isolation appendix removido — substituído por ADR-0014 dedicado a multi-tenant.

### ADR-0014 — Multi-tenant brain-per-account M3.5 (NOVO v5)

**Decide:** Quando primeiro PME externo entrar (M3.5), Algorythmo provisiona **um brain GBrain separado por account**, via `GBRAIN_DATABASE_URL` distinto por subprocess invocation. **NÃO via OAuth scope sobre brain compartilhado** — upstream OAuth scopes são operation-level (`read`/`write`/`admin`), NÃO row-level account partitioning (premise correction codex v4).

**Mecanismo upstream confirmado:** GBrain expõe `GBRAIN_DATABASE_URL` env var (alternativa: `DATABASE_URL`). Cada invocação `gbrain <cmd>` com env var distinta conecta a brain DB distinto. Default `~/.gbrain/config.json` aponta para PGLite local; setting `GBRAIN_DATABASE_URL` override pra Postgres remoto.

**Account onboarding sequence (M3.5):**

1. Account criada em Chatwoot (signup flow).
2. Sidekiq job `Algorythmo::Brain::ProvisionAccountBrainWorker.perform_async(account_id)`:
   - Cria DB Postgres dedicado (ou schema/database dentro de instance compartilhada — TBD M3.5 quando dimensionarmos custo).
   - Roda `gbrain init` com `GBRAIN_DATABASE_URL=<new_url>` (subprocess env).
   - Opcional: seed defaults de `brain-template` (founder cura template Day-1).
3. Registra mapping em tabela `algorythmo_account_brains`:
   ```
   id | account_id (FK accounts) UNIQUE | database_url (text, encrypted) | created_at | algorythmo_m3_start_date
   ```
4. `Brain::Client.new(account_id)` resolve via `AccountBrainRegistry.lookup(account_id) → database_url` e passa via `Open3.popen3(env: { 'GBRAIN_DATABASE_URL' => url }, ...)`.
5. Primeira conversa resolvida do account dispara `IngestionWorker(account_id)` → escreve no brain do account.

**Forward-only per-account:** cada account tem seu próprio `algorythmo_m3_start_date` (column em `algorythmo_account_brains`, default = `created_at` no provisioning). Forward-only a partir daquele timestamp. **Sem cross-account backfill.** Founder's start_date = M3 ship date; PME start_date = onboarding date.

**MCP path M3.5:**
- **Day-1 (M3):** MCP stdio per session, single-account, single-brain. Token validation single-account assumption.
- **M3.5:** MCP transport upgrade pra HTTP+OAuth+DCR. Token claims carregam `account_id`. `mcp_token_validator` asserta `session.account_id == claim.account_id`. Cada Cursor session conecta via HTTP a daemon que internamente switcha `GBRAIN_DATABASE_URL` por request (OU N daemons HTTP, um por account — decisão TBD em ADR-0014 quando primeiro PME entrar, baseado em custo de operação).

**Concorrência M3.5:** advisory lock vira **per-account** (`gbrain:write:lock:<account_id>`) — accounts diferentes não contendem entre si.

**Filesystem isolation OS-level M3.5:** ainda não obrigatório. Brain-per-account já isola dados no nível DB. Container/UID isolation adicional só se assessment de segurança M3.5 justificar.

**Migration path founder → primeiro PME:**
1. Founder dogfooding continua no `~/.gbrain/` original (PGLite local).
2. Migration job opcional: `migrate_founder_brain_to_postgres.rb` → cria DB Postgres pro founder e copia data (preserva timeline).
3. Cada PME novo provisiona DB próprio via passos 2-5 acima.

**Decisão TBD em ADR-0014 quando primeiro PME entrar (não Day-1):**
- Postgres database-per-account vs schema-per-account vs row-level com prefixo (depende de count esperado + custo).
- HTTP daemon shared (com per-request env switch) vs daemon-per-account (isolação mais forte, mais memória).
- Encryption-at-rest da `database_url` column (Rails encrypted credentials ou Vault).

**Defesa em profundidade preservada:** controller concern fail-closed (D-A8 generalizado), `Current.account` Sidekiq, FK + trigger ingestion logs, `where(account_id:)` explícito.

---

## §6 Testes — barra mínima

| Camada | Spec | Trilha / PR |
|---|---|---|
| Controller concern | `tenant_resolution_spec.rb` — sem auth → 401; sem membership → 401/403; com membership → 200 + `Current.account`; mismatch ENV → 403; **env UNSET → 403 + `Rails.logger.error`, NUNCA 500**; ordem before_action | PR M3-1 |
| **Route audit** | **`brain_routes_spec.rb` (NOVO v5) — itera `Rails.application.routes.routes`, filtra Brain, asserta cada controller herda de `Brain::BaseController`. Request specs por rota (`compiled_truth`, `timeline`, `adjustments`, `snapshots`, `mcp_token`, `mcp_sessions`): non-founder = 403, founder = 200/201** | PR M3-1 |
| **Write lock** | **`write_lock_spec.rb` (NOVO v5) — acquire/release happy; concurrent raises `LockContended`; TTL expiry; Lua release só libera se token bate; integration: 3 threads paralelas chamando `with_lock { gbrain_capture }` serializa sem `database is locked`** | PR M3-2 |
| Sidekiq worker | `ingestion_worker_spec.rb` — idempotência, forward-only, falha, `Current.account` pré-query, trigger/FK rejeita divergente, **lock contention re-enqueues** | T2 / PR M3-3 |
| Sidekiq worker | `snapshot_diff_worker_spec.rb` — baseline, diff, `Current.account`, **lock acquired around export** | T4 / PR M3-7 |
| Service | `conversation_to_markdown_spec.rb` — frontmatter, filtra `private: true` | T2 / PR M3-3 |
| Service | `mcp_token_issuer_spec.rb`, `mcp_token_validator_spec.rb`, `mcp_session_spec.rb` | T3 / PR M3-6 |
| Defense-in-depth | `devise_logout_revoke_spec.rb` — documenta DTA sem logout event | T3 / PR M3-6 |
| Service | `client_spec.rb` — subprocess SEM `--dir`; stdio exits ao stdin close | T2 / PR M3-2 |
| Config | `gbrain_dream_cycle_spec.rb` — nenhuma `*_external` ativa | T2 / PR M3-2 |
| Vue | `Viewer.spec.js`, `Adjustments.spec.js`, `Config.spec.js` | T1 / PR M3-4/5 |
| **Contract** | **`brain_api_contract_spec.rb` BLOCKING** | PR M3-4/5 |
| **Stress concurrency** | **`gbrain_concurrent_writes_spec.rb` (NOVO v5, M3-1.5) — runner spawn: Rails capture + 2 Sidekiq workers + MCP stdio capture simultâneos. Asserta zero corrupção + zero `database is locked` + N writes refletem no `gbrain stats`. Marca plan "concurrency-validated"** | PR M3-1.5 |
| Real integration | `gbrain_real_integration_spec.rb` — SHA pinado em dir temp; capture/search/think/export; MCP stdio envelope; migration smoke. CI nightly + manual | PR M3-1.5 |
| Integration | stdio MCP handshake via `Open3` — token do arquivo `0600`, não CLI arg | T3 / PR M3-6 |

**Day-0 spike (NOVO v5, manual antes do PR M3-1 mergar):** 10min, 3 terminais bash em paralelo:
```
# Terminal 1
for i in $(seq 1 20); do gbrain capture <<< "test page $i terminal 1"; done

# Terminal 2  
for i in $(seq 1 20); do gbrain capture <<< "test page $i terminal 2"; done

# Terminal 3
for i in $(seq 1 20); do gbrain capture <<< "test page $i terminal 3"; done
```
Observação: se PGLite SQLite WAL aguenta (zero `database is locked` errors, 60 pages totais no `gbrain stats`), Day-1 advisory lock é defensive overhead aceitável. Se quebra (errors visíveis), advisory lock é mandatory + considerar reduzir TTL pra 10s ou increment backoff. Resultado documentado em §6 (Testes) + §8 (Readiness).

**Smoke gate manual fim do M3:**
- Founder roda 10 queries Cursor MCP → 10 retornam ≥2 citações reais.
- Manu (M4 spike) chama `gbrain think` com contexto → ≥2 citações.

**Sobre M3-1.5 integration lane:** helper `spec/support/gbrain_real.rb` instancia GBrain via SHA pinado em diretório temp. **Mecanismo temp dir Day-0:** default = `HOME=$tmp` (Unix) ou `USERPROFILE=$tmp` (Windows) — env var que GBrain lê pra resolver `~/.gbrain/`. Day-0 spike confirma qual env var GBrain realmente usa (Ruby `Dir.home` segue HOME no Unix, USERPROFILE no Windows). **NÃO usar `GBRAIN_HOME` no integration lane Day-1 — premise audit não encontrou essa var upstream.** Cost-control: CI nightly + manual trigger.

---

## §7 Riscos

| # | Risco | Probabilidade | Mitigação |
|---|---|---|---|
| **R1** | GBrain drift rápido + breaking changes entre bumps. | Média-alta | SHA pin + bi-semanal + hotfix lane (ADR-0012). M3-1.5 lane real + drift checks explícitos. |
| **R2** | Ollama `nomic-embed-text` retrieval ruim PT-BR. | Média-alta | Smoke test Day-0 + escalation pra `multilingual-e5-large` se ruim. |
| **R3** | MCP token sliding-8h UX vs segurança. | Média-baixa | TTL sliding observado 2 sem; UI regen sempre disponível. |
| **R-new (R10) v5** | **Brain write contention.** Múltiplos processos (Rails capture, Sidekiq ingestion, Sidekiq snapshot export, MCP capture from Cursor) escrevendo concurrent no `~/.gbrain/` Day-1. PGLite (default GBrain) usa SQLite WAL com file lock interno; sem advisory lock no Ruby side, writes simultâneos podem dar `database is locked` errors ou corrupção parcial. | **Média-alta** | **Redis advisory lock `gbrain:write:lock` (NX EX 30s)** wrapping toda chamada `capture`/`export`. Lock contention → Sidekiq retry com backoff. Day-0 spike (10min, 3 terminais) confirma PGLite behavior. Stress test M3-1.5 (`gbrain_concurrent_writes_spec.rb`) prova zero corrupção. **Fallback:** se PGLite quebrar mesmo com lock, apertar TTL pra 10s + considerar dedicar Sidekiq process com `--concurrency=1` pra queue `algorythmo_brain_writes` (hybrid). |

**Riscos secundários:**

- **R4** — HTTP+OAuth scaffolded mas não exercitado → technical debt se M4 atrasar. Mitigação: scaffold completo.
- **R5** — Brain repo Git local no host founder Day-1 = sem backup central. Mitigação: commits manuais semanais.
- **R6** — Esquecer `where(account_id:)` num scope vaza dados M3.5+. Mitigação: code review + spec por model.
- **R7** — Trigger Postgres pra invariant adiciona latency. Mitigação: índice em `conversations(id, account_id)`; benchmark Day-0; deferrable composite FK como alternativa.
- **R8** — MCP token sobrevive logout até TTL. Mitigação: founder regen via UI.
- **R9** *(reescrito v5)* — **Multi-tenant Day-1 ausente é fricção zero hoje, story dedicada em M3.5 via brain-per-account `GBRAIN_DATABASE_URL` (ADR-0014).** Plano v3 inventou per-tenant directory; v4 deferiu pra OAuth scope (também errado — operation-level, não row-level); v5 corrige pra brain-per-account via `GBRAIN_DATABASE_URL` (mecanismo upstream real). Risco intermediário: founder dogfooding gera ingestion massiva; M3.5 precisa migrar dados pra modelo multi-tenant. Mitigação: ingestion logs já têm `account_id` scaffold; `Brain::Client(account_id)` Day-1 ignora arg, Day-M3.5 resolve via `AccountBrainRegistry`. Migration path = founder mantém PGLite local + cada PME novo provisiona Postgres DB próprio (forward-only per-account `algorythmo_m3_start_date` = onboarding date). ADR-0014 documenta sequência completa.

---

## §8 Readiness checklist (pre-dispatch por trilha)

### Pre-dispatch global

- [ ] M2-B1 (PR #58) mergeado.
- [ ] M2-B (todas) mergeada.
- [ ] Bun instalado (GBrain requirement).
- [ ] Postgres com `pgvector`.
- [ ] Ollama + `nomic-embed-text` baixado.
- [ ] `algorythmo-brain-seed.md` escrito por Gustavo.
- [ ] ADR-0012 + ADR-0013 + **ADR-0014** redigidas.
- [ ] SHA do GBrain travado no manifesto.
- [ ] CI workflow `nightly-gbrain-integration.yml` criado.
- [ ] `ALGORYTHMO_PRIMARY_ACCOUNT_ID` env var definido (dev/staging/prod).
- [ ] **Day-0 spike de concorrência rodado** (10min, 3 terminais → 60 writes paralelos no `~/.gbrain/`); resultado documentado.
- [ ] **Redis acessível** (advisory lock + MCP cache).

### PR M3-1 (gate)

- [ ] Padrão `algorythmo_cut_flags` (M2-B1) reusado.
- [ ] Spec fail-closed do concern escrita ANTES (TDD).
- [ ] Engineer leu spike doc + premise audit footers (v3 + v4).
- [ ] Protótipo `.worktrees/spike-m3-validation/.../tenant_resolution.rb` consultado.
- [ ] Interface `Brain::Client` + `WriteLock` frozen.
- [ ] `routes.rb` consolidado.
- [ ] **Route audit spec passa** (NOVO v5).
- [ ] ADR-0012 + ADR-0013 + ADR-0014 entram nesse PR.

### PR M3-1.5

- [ ] GBrain SHA pinado bootando local.
- [ ] `Dir.mktmpdir` strategy via `HOME=$tmp` (Unix) / `USERPROFILE=$tmp` (Windows) validada — Day-0 confirma qual env GBrain lê pra resolver `~/.gbrain/`.
- [ ] Workflow GitHub Actions criado.
- [ ] **Stress concurrency spec verde.**

### Trilha T1

- [ ] PR M3-1 + PR M3-2 mergeados.
- [ ] Contract test verde.
- [ ] Designer validou anatomia.

### Trilha T2

- [ ] PR M3-1 + PR M3-2 mergeados.
- [ ] GBrain CLI funcionando local.
- [ ] `algorythmo_m3_start_date` coluna adicionada.

### Trilha T3

- [ ] PR M3-1 + PR M3-2 mergeados.
- [ ] GBrain stdio mode bootando.
- [ ] Redis acessível.
- [ ] Engineer ciente DTA defense-in-depth.

### Trilha T4

- [ ] PR M3-1 + PR M3-2 + PR M3-4 mergeados.
- [ ] `gbrain export` funcionando.
- [ ] Action Mailer configurado.

---

## §9 Out of scope — deferrals explícitos

### M3.5 (primeiro cliente PME externo) — ADR-0014 governa

- Painel multi-tenant de admin.
- Onboarding flow PME externo.
- Schema pack B2B sales.
- Hosting Algorythmo pra Brain DB per tenant.
- Telemetria cross-tenant.
- **Multi-tenant ativada via brain-per-account `GBRAIN_DATABASE_URL`** (ADR-0014). Tabela `algorythmo_account_brains` + provisioning worker + per-account `algorythmo_m3_start_date` (forward-only por account, sem cross-account backfill).
- **TenantResolution concern generaliza:** Day-1 check `ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID']` removido; concern volta a só validar membership + resolve account → brain via `AccountBrainRegistry`.
- **MCP transport upgrade HTTP+OAuth+DCR** — token claims com `account_id`; validator asserta `session.account_id == claim.account_id` (P2 codex v4 deferral closure).
- **Advisory lock per-account** — `gbrain:write:lock:<account_id>`.
- **Filesystem isolation OS-level** opcional — DB isolation já protege; sandbox extra só se security assessment justificar.

### M4 (Manu integrada ao Brain)

- Manu chamando `gbrain think` no contexto de conversa.
- HTTP+OAuth+DCR ON em produção.
- Scope `write` exercitado por Manu.
- Vendedor humano scope `read+write`.

### M5 (Dream Cycle externo + enriquecimento)

- `enrich_external: on` — Linkedin/CNPJ/dossiê IA.
- `fix_citations_external: on`.
- `score_salience_external: on`.
- Dossiê enriched automático.
- ADR adendo flipa ADR-0013.

### Pós-MVP

- Mobile responsive Brain.
- Light theme.
- Reatribuir owner ajuste.
- Audit log granular cross-leitor.
- Modo degradado LLM caiu.
- Versionamento custom Compiled Truth.

---

## §10 Sequência de PRs sugerida

1. **PR M3-1 (gate)** — Concern + BaseController + spec (5 cases incl. env unset) + `Brain::Client` skeleton + **`WriteLock` skeleton (NOVO v5)** + routes consolidados (controllers stub 501) + **route audit spec (NOVO v5)** + ADR-0012 + ADR-0013 + **ADR-0014 (NOVO v5)** + SHA pinado. **≤380 linhas + 3 ADRs.**
2. **PR M3-1.5** — `spec/support/gbrain_real.rb` + workflow nightly + manual trigger + **stress concurrency spec (NOVO v5)**. ≤220 linhas.
3. **PR M3-2** — `Brain::Client` body + **`WriteLock` body (Lua release script)** + `gbrain_dream_cycle.yml` + smoke Ollama. ≤200 linhas.
4. **PR M3-3** — Ingestion worker (com lock wrap) + `algorythmo_brain_ingestion_logs` (FK + trigger/composite FK invariant — wording fixed v5) + `conversation_to_markdown` + `sidekiq_ingestion_cron.rb`. ≤360 linhas.
5. **PR M3-4** — UI Viewer + Onboarding + 2 componentes design system + DESIGN.md + endpoints reais + `brain_api_contract_spec.rb` BLOCKING. ≤400 linhas.
6. **PR M3-5** — UI Ajustes + AlgDrawer + POST /adjustments **enfileira via worker (não foreground)** → write serializado via queue + lock. ≤400 linhas.
7. **PR M3-6** — MCP stdio + `algorythmo_mcp_sessions` + token issuer + validator (com **deferral note M3.5 account assertion**) + Devise hook defense-in-depth + Config view download `0600`. ≤420 linhas.
8. **PR M3-7** — Snapshot diff worker (com lock wrap) + `algorythmo_brain_snapshots` + History real + Mailer + gut-check + `sidekiq_snapshot_cron.rb`. ≤400 linhas.
9. **PR M3-8** — MCP HTTP+OAuth+DCR scaffold Rails-side (flag OFF). ≤180 linhas.

**Total v5.0: 9 PRs, ~2580 linhas de produção** (vs ~2480 v4.0, +4% absorvendo WriteLock + ADR-0014 + route audit; vs ~3070 v3.0, ainda ~16% menor).

**Grafo de dependências:**

```
M3-1 (gate) ──┬── M3-1.5 (integration + stress, paralelo)
              ├── M3-2 ──┬── M3-3
              │          ├── M3-4 ── M3-5
              │          ├── M3-6
              │          └── M3-7 (precisa de M3-4 também)
              └── M3-8 (independente, story final)
```

---

## §11 Validação Outside Voice (auditado 5x)

Founder pattern: `/codex review` em decisões duras.

- **v1.0:** Codex → 9 P1 + 5 P2 (NO-GO).
- **v2.0:** Codex → 14/20 fechados + 5 novos P1 (misconceptions arquiteturais, NO-GO).
- **Spike runtime validation:** engineer 1 dia, worktree throwaway. Output `docs/algorythmo/M3-brain/spike-runtime-validation.md`. Resolveu 5 P1 v2.
- **v3.0 codex v3 + premise audit:** 5/5 P1 v2 + 7/7 holds v1 fechados, MAS premise audit Claude (WebFetch upstream docs) revelou **per-tenant directory + `--dir` invented**, não upstream. NO-GO.
- **v4.0:** subtractive simplification — removeu per-tenant directory + `--dir` + filesystem isolation Day-1. Defer M3.5 via OAuth scope. Codex v4 → NO-GO (2 P1 + 8 P2; 0 regressões), porque (1) `~/.gbrain/` compartilhado entre Rails/Sidekiq/MCP é novo attack surface concorrência; (2) OAuth scope upstream é operation-level, NÃO row-level account partitioning → M3.5 path overclaimed.
- **v5.0 (este doc):** absorve codex v4. (P1 #1) Redis advisory lock `gbrain:write:lock` + Day-0 spike + stress test M3-1.5. (P1 #2) Reescreve R9 + ADR-0014 com brain-per-account via `GBRAIN_DATABASE_URL` (mecanismo upstream real confirmado via WebSearch upstream docs). 8 P2 cleanup: trigger wording, env unset 403 spec, GBRAIN_HOME removido, account_id scope deferral, route audit spec, MCP session.account deferral, R9/ADR-0014 concretiza migration, per-account forward-only start_date.
- **Recomendação pós-v5.0:** re-rodar `/codex review` antes do dispatch. Espera GO ou GO-WITH-CAVEATS (P1 fechados; 0 nova arquitetura inventada).

`/design-review` browser-real sobre primeiro PR de UI Brain (provável PR M3-4).

---

## §12 Changelog v4.0 → v5.0 (2026-05-25 — concurrency + brain-per-account absorption)

v5 absorve `/codex review` v4 (2 P1 + 8 P2; 0 regressões). Mudanças:

- **P1 #1 (concorrência `~/.gbrain/`) — D-LOCK NOVO.** Redis advisory lock `gbrain:write:lock` (SET NX EX 30s) envolve toda chamada `gbrain capture`/`gbrain export`. Aplicável: Rails foreground (POST /adjustments enfileirado), Sidekiq IngestionWorker, Sidekiq SnapshotDiffWorker, MCP capture-from-Cursor (path roteado via Rails endpoint, NÃO direto via daemon stdio). Wrapper `Algorythmo::Brain::WriteLock.with_lock { ... }` em `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb` — interface frozen em PR M3-1, body com Lua release script em PR M3-2. Lock contention → Sidekiq retry backoff (2s/4s/8s, max 3). Stress test em PR M3-1.5 (`gbrain_concurrent_writes_spec.rb`) prova zero corrupção. **Day-0 spike (10min, 3 terminais)** valida PGLite SQLite WAL behavior antes de PR M3-1 mergar. Novo risco R10 em §7. Hybrid path documentado: se PGLite quebrar mesmo com lock, apertar TTL + dedicar Sidekiq process com `--concurrency=1` pra queue `algorythmo_brain_writes`.
- **P1 #2 (M3.5 OAuth scope ≠ tenant isolation) — R9 reescrita + ADR-0014 NOVO.** Upstream OAuth scopes são operation-level (`read`/`write`/`admin`), NÃO row-level account partitioning. M3.5 path corrigido: **brain-per-account via `GBRAIN_DATABASE_URL` env var por subprocess invocation** (mecanismo upstream confirmado via WebSearch — `GBRAIN_DATABASE_URL` é env var oficial GBrain pra apontar a DB distinto). Tabela `algorythmo_account_brains` (M3.5, NÃO Day-1) registra mapping account_id → database_url. `Brain::Client.new(account_id)` Day-1 ignora; Day-M3.5 resolve via `AccountBrainRegistry` e passa env via `Open3.popen3(env: { 'GBRAIN_DATABASE_URL' => url }, ...)`. ADR-0014 documenta: provisioning sequence (5 passos), forward-only per-account `algorythmo_m3_start_date`, migration path founder → primeiro PME, MCP transport upgrade HTTP+OAuth com `account_id` em token claims. Premissa P3 reinterpretada v5 (terceira interpretação): "motor suporta multi-account via multiple brain instances, NÃO scopes sobre brain compartilhado".
- **8 P2 cleanup absorvido:**
  1. **P2 area 1 #1** — wording "check constraint" → "trigger constraint OR deferrable composite FK" em §3, §4 T2, §6 (Postgres rejeita subquery em CHECK).
  2. **P2 area 1 #2** — `TenantResolution` spec novo case "env UNSET → 403 + `Rails.logger.error`, NUNCA 500". Controller usa `ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence`, NÃO `ENV.fetch`.
  3. **P2 area 2 #1** — `GBRAIN_HOME` removido do corpo ativo (§6, §8). Default integration lane = `HOME=$tmp` (Unix) / `USERPROFILE=$tmp` (Windows). Day-0 spike confirma qual env var GBrain realmente lê pra resolver `~/.gbrain/`.
  4. **P2 area 2 #2** — `Brain::Client.new(account_id)` comment explícito: "Day-1: account_id ignored, single brain. Day-M3.5: account_id → brain_path/database_url via AccountBrainRegistry (ADR-0014)".
  5. **P2 area 3 #1** — Route audit spec `brain_routes_spec.rb` NOVO (PR M3-1). Itera `Rails.application.routes.routes`, filtra Brain, asserta cada controller herda `Brain::BaseController`. Request specs específicos por rota: non-founder = 403, founder = 200/201.
  6. **P2 area 3 #2** — MCP validator deferral note explícito (§4 T3): "Day-1 stdio carries no per-call account context. Single-account assumption guards correctness. M3.5: MCP HTTP+OAuth, validator asserta `session.account_id == claim.account_id`."
  7. **P2 area 4 #2** — R9 migration sequence concretizada via ADR-0014: 5-step provisioning + tabela `algorythmo_account_brains` + migration path founder dogfooding → primeiro PME.
  8. **P2 area 4 #3** — Per-account `algorythmo_m3_start_date` em `algorythmo_account_brains` (ADR-0014): cada account own start_date = onboarding date; forward-only por account; sem cross-account backfill.
- **ADR-0013 cleanup** — appendix multi-tenant removido (substituído por ADR-0014 dedicado).
- **PR sizes:** PR M3-1 sobe pra ≤380 (de ≤350) absorvendo WriteLock skeleton + route audit + ADR-0014. PR M3-1.5 sobe pra ≤220 (de ≤200) com stress concurrency spec. PR M3-3/M3-7 mantêm tamanho mas adicionam lock wrap. Total ~2580 linhas (vs ~2480 v4.0, +4%; vs ~3070 v3.0, -16%).
- **§11 Outside Voice:** "audited 5x" (v1, v2, spike, v3+premise audit, v4 → v5 absorption).

---

## Changelog v3.0 → v4.0 (2026-05-25 — subtractive simplification driven by premise audit)

Re-edição subtractive pós premise audit dos docs upstream `garrytan/gbrain` (`docs/GBRAIN_V0.md`, `docs/operations/headless-install.md`, `docs/integrations/README.md`, README). v4 corrige violação de `feedback_architecture_defer_upstream.md` introduzida em v3 (per-tenant directory + `--dir` flag inventados, não upstream). Mudanças concretas — **nenhuma decisão de produto reaberta**; só absorve fatos upstream + simplifica arquitetura pra alinhar com motor real:

- **v4.0 — subtractive simplification.** Drop per-tenant directory (`/var/algorythmo/tenants/<account_id>/brain`) + `--dir` flag (não existe upstream, premise audit confirmou via 4 docs upstream). Drop filesystem isolation Day-1 (single user = founder, nada pra isolar de). Defer multi-tenant infra activation to M3.5 (via OAuth scope on `gbrain serve --http`, the upstream mechanism). Keep scaffolds (TenantResolution concern com Day-1 check `ALGORYTHMO_PRIMARY_ACCOUNT_ID`, `account_id` column on session/ingestion tables, Sidekiq `account_id` arg, FK + trigger constraint) as cheap M3.5 future-proofing.
- **Premissa P3 reinterpretada.** "Multi-tenant Day-1 upstream" originalmente significava "motor TEM capacidade multi-tenant pronta" (TRUE — via OAuth scope HTTP mode), NÃO "wire multi-tenant infra Day-1 para 1 usuário". v3 mis-leu. v4 corrige: Day-1 motor multi-tenant feature dormant; M3.5 ativa via OAuth scope upstream. **[v5 NOTA: v4 ainda errado — OAuth scope upstream é operation-level, NÃO row-level account partitioning. v5 reescreve M3.5 como brain-per-account via `GBRAIN_DATABASE_URL`.]**
- **ADR-0013 reescrita.** Body principal só cobre dream cycle gate (dedup ON, external OFF). Filesystem isolation seção movida pra appendix "Multi-tenant filesystem isolation (M3.5 backlog, NOT M3)". **[v5 NOTA: appendix removido; substituído por ADR-0014 dedicado.]**
- **Defesa em profundidade Day-1 mantida.** Controller concern fail-closed (D-A8) + `Current.account` explícito nos workers + FK + trigger constraint + `where(account_id:)` explícito em todos os scopes.
- **PR sizes shrink.** PR M3-1 ≤350 linhas; PR M3-2 ≤180; PR M3-6 ≤420; PR M3-8 ≤180. Total ~2480 linhas.
- §1, §3, §4, §7 R9, §9, §10, §8 todas atualizadas pra refletir subtractive simplification.

---

## Changelog v2.0 → v3.0 (2026-05-25 — spike-driven absorption)

Re-edição cirúrgica pós spike runtime validation (`docs/algorythmo/M3-brain/spike-runtime-validation.md`). Mudanças concretas — **nenhuma decisão de produto reaberta**; só absorve fatos do runtime real e 2 decisões trancadas pelo founder:

- **D-A8 (tenant resolution) — Rack → controller concern.** Spike Q1 confirmou: auth Chatwoot é controller `before_action` chain, Rack roda antes e não vê `current_account`. Fecha P1 B1.
- **ADR-0013 addendum — filesystem isolation simplificado.** `0700` + `--dir` argument substituem `useradd` + `chown` + `setuid`. Spike Q2: container roda root. Fecha P1 B4. **[v4 NOTA: removido inteiro — `--dir` não existe upstream.]**
- **GBrain stdio = subprocess per session.** Spike Q3 confirmou: `gbrain serve` (stdio) finaliza ao desconectar. Fecha P1 B5. **[v4 NOTA: `--dir` arg removido.]**
- **D-A5 — janela 5min aceita Day-1.** Founder decision a. Fecha P1 B2.
- **D-A5 — DTA defense-in-depth.** Override `Devise::SessionsController#destroy` permanece mas plan declara não-confiável. Fecha P1 B3.
- **PR sizes:** PR M3-1 ≤400; PR M3-2 ≤220; PR M3-8 ≤250. Total ~3070 linhas.

---

## Changelog v1.0 → v2.0 (2026-05-25)

Re-edição cirúrgica pós `/codex review`. Mudanças concretas (decisões de produto em §2 ficaram trancadas; só corrigi implementação):

- **D-A8 (tenant resolution):** Sidekiq workers recebem `account_id` como arg explícito + setam `Current.account` no `perform`. ActiveRecord usa `where(account_id:)` explícito. FK real `conversation_id → conversations(id)` + trigger check constraint.
- **D-A5 (MCP token):** Nova tabela `algorythmo_mcp_sessions` + Redis cache (5min TTL). TTL **8h sliding**. Validação **per-call**. Token entregue via arquivo `0600`.
- **ADR-0012:** SHA pin (não tag) + cadência bi-semanal + hotfix lane.
- **ADR-0013:** Addendum filesystem isolation.
- **PR sequence:** 8 → **9 PRs**. Gate M3-1 absorve middleware + Brain::Client skeleton + routes + ADRs. Novo M3-1.5 integration lane. M3-6 absorveu `mcp_sessions`. Cron splits.
- **Contract tests:** `brain_api_contract_spec.rb` blocking.
- **Risks:** R1 reescrito (cadência bi-semanal); R3 reescrito (sliding 8h); R6 reescrito (sem default_scope); R7 (latency trigger).

---

*Fim do plano 0004 v5.0. Engineer agent começa por PR M3-1 (gate) — concern + ADRs (3) + `Brain::Client` skeleton + `WriteLock` skeleton + routes consolidados + route audit spec, brain único upstream default + lock Day-1. Sem ele, nada mais corre.*

---

## GSTACK REVIEW REPORT — `/codex review` (2026-05-25)

**Reviewer:** Codex CLI (gpt-5-codex, reasoning high), read-only, escopo restrito ao repo (ignorou `~/.claude/`, `agents/openai.yaml`).
**Tokens:** ~1.07M. **Verdict:** **NO-GO** — 9 P1, 5 P2.

### D-A8 — Tenant resolution
- **[P1]** Middleware Rack não protege Sidekiq. `IngestionWorker` e `SnapshotDiffWorker` precisam receber `tenant_id` como arg explícito do job + setar contexto dentro do `perform`, não depender do middleware (plan §4 T2 L252, T4 L327).
- **[P1]** `default_scope { where(tenant_id: Current.tenant_id) }` é trap: este repo já tem `Algorythmo::Sidekiq::CurrentResetMiddleware` que reseta `Current` em background jobs → scope verá `nil` se cada job não setar tenant explícito (ver `engines/algorythmo/config/initializers/algorythmo_sidekiq_current_reset.rb`).
- **[P1]** Resolver tenant a partir de `:account_id` raw da URL antes da auth do controller não é airtight. Middleware tem que **verificar membership do user autenticado naquele account**, não só mapear `account_id → tenant_id` (plan L288).
- **[P1]** `conversation_id` sem FK permite tenant A logar/ingestar `conversation_id` do tenant B, a menos que toda query faça join com `conversations.account_id`. "FK lógico" não é fronteira de segurança (plan L250).
- **[P1]** Path compartilhado `/var/algorythmo/tenants/<t>/brain` não tem isolamento de OS/processo. Check no Rails não impede subprocess GBrain comprometido/bugado ler diretórios irmãos. Considerar `seccomp`/`chroot`/user separado por tenant, ou ao menos `0700` + UID por tenant (plan L137).

### D-A5 — MCP session-only tokens
- **[P1]** "Panel session lifetime" está indefinido e provavelmente errado: Chatwoot usa Devise Token Auth com `token_lifespan = 2.months` (`config/initializers/devise_token_auth.rb`), e cookie session sem `expire_after`. Isso **não é** TTL diário/browser-session. Plan precisa ou redefinir "sessão" explicitamente, ou criar tabela própria de MCP sessions com TTL curto (plan L294).
- **[P1]** Invalidação em re-login não tem data model. Enumerar tokens prévios via Redis `KEYS` é proibido em prod. Adicionar **index set por `user_id`/`session_id`/`tenant_id`** (ex.: `SADD mcp:user:<id>:tokens <token_id>`) ou não dá pra implementar com segurança (plan L313).
- **[P1]** Conexões MCP stdio são long-lived. Validar token só no handshake = token expirado/revogado continua válido até o próximo restart. Validar per-call = Cursor/Claude falham mid-query e precisam UX explícita pra re-auth. Plan tem que escolher e documentar (plan L308).
- **[P2]** Eviction Redis antes do TTL não tratado. Token sumido deve produzir erro de auth claro + flow de regen no painel, não parecer flakiness do GBrain/Cursor (plan L294).
- **[P2]** Retornar `gbrain mcp --token=...` vaza bearer via process args / shell history. Usar env var, stdin, ou config file com `0600` (plan L295).

### 4-Trilha parallelization
- **[P1]** Grafo de dependência inconsistente: T3 é "first PR" e bloqueia todas, mas T3 depende da decisão de pin GBrain que está em T2. Dispatch deadlock a menos que pin/ADR-0012 mova pra M3-1 (plan L282, L494).
- **[P1]** `Algorythmo::Brain::Client` é consumido por T1/T2/T3/T4 mas só aterrissa em M3-2. M3-4 (UI) dependendo só de M3-1 força fake contracts e UI tests false-positive. Mover Brain::Client pra M3-1 OU adicionar dependency explícita M3-4 → M3-2 (plan L246, L497).
- **[P2]** `sidekiq_brain_cron.rb` owned por T2 e T4 ao mesmo tempo. Solução: split em `sidekiq_ingestion_cron.rb` + `sidekiq_snapshot_cron.rb`, ou consolidar em PR único (plan L255, L332).
- **[P2]** Route ownership confuso: T2 adiciona Brain stubs, T1 stub no mesmo PR, T3 adiciona token/DCR, T4 adiciona snapshots. Centralizar `engines/algorythmo/config/routes.rb` em M3-1 ou esperar conflitos seriais (plan L260, L300, L331).
- **[P2]** Endpoint stub pode esconder integration failures. Exigir **contract tests** contra route shape real antes do UI PR merge, não só payloads hardcoded `{ compiledTruth: null }` (plan L428).

### ADR-0012 — GBrain pin + monthly bump
- **[P1]** "Pin via tag exata" não é viável como escrito. Upstream `garrytan/gbrain` no GitHub mostra **0 releases** e **1 tag visível** (eval baseline, não release tag). **Pin por commit SHA, não tag** — tags upstream podem ser movidas/deletadas e não existem release tags ainda.
- **[P1]** Cadência mensal é fantasia pra velocidade do upstream: changelog mostra **v0.36.0 → v0.36.6.0 entre 17-19 May 2026** (6 patches em 3 dias). Batches mensais acumulam breaking demais. Cadência realista: **bi-semanal**, com hotfix lane.
- **[P1]** Specs mockadas não pegam drift comportamental ou de migração. CI precisa lane de integração com SHA pinado real: brain temporário, `capture`, `search`, `think`, `export`, MCP stdio handshake, e upgrade/migration smoke (plan L379, L393).
- **[P2]** "Hold on main por 1 sprint" significa fixes de segurança/compat stalled por 30 dias. Adicionar **hotfix lane** pra CVEs upstream, desacoplado do D1 mensal (plan L358).
- **[P2]** Upstream muda defaults e surfaces, não só internals: **v0.36.2.0 flipa embedding default pra ZeroEntropy** e **v0.36.0 remove skillpack install/uninstall**. ADR precisa "allowed drift checks" explícitos pra essas categorias.

### Recommendation
**Bloquear dispatch dos 4 engineer agents até resolver os 9 P1.** O plano não tem bugs de implementação — tem **fronteiras de segurança não resolvidas** (tenant via Rack não cobre Sidekiq, token session-lifetime indefinido, FK conversation_id ausente, path filesystem sem isolamento OS) **e premissa upstream contradita pelos fatos** (GBrain não tem release tags, cadência de patches é dias-não-meses). Próximo passo:

1. **Reescrever PR M3-1** absorvendo: ADR-0012 (SHA pin + bi-semanal + hotfix lane), `Algorythmo::Brain::Client` skeleton (mover de M3-2), `Current.tenant_id` setter explícito nos workers, MCP sessions table (não confiar em Devise Token Auth lifespan), `routes.rb` consolidado, contract test harness, e isolamento filesystem por tenant (mínimo `0700` + UID).
2. **Reescrever ADR-0013** definindo "session" pro MCP token: tabela `algorythmo_mcp_sessions(id, user_id, account_id, expires_at, revoked_at)`, TTL 8h sliding, set `mcp:user:<id>:sessions` pra invalidação O(1).
3. **Adicionar PR M3-1.5** (entre M3-1 e M3-2) com integration test lane real contra GBrain SHA pinado — sem isso, monthly bump é roleta russa.

Depois disso, re-rodar `/codex review` no plano corrigido **antes** de dispatch.

---

*Fim do GSTACK REVIEW REPORT codex.*

---

## GSTACK REVIEW REPORT — `/codex review` v2 re-review (2026-05-25)

**Reviewer:** Codex CLI (gpt-5-codex, reasoning high), tokens ~168k. **Verdict:** **NO-GO**.

### Section A — Status dos 9 P1 + 5 P2 da review v1

| # | Origem | Status v2 | Linha v2 | Nota |
|---|--------|-----------|----------|------|
| 1 | D-A8 Sidekiq | CLOSED | L77, L168, L326-333 | account_id explícito + Current.account no perform ✓ |
| 2 | D-A8 default_scope | CLOSED | L77, L169, L348-350 | banido, where(account_id:) ✓ |
| 3 | D-A8 middleware pós-auth | **NEW-ISSUE [P1]** | L171, L203-205 | Rack middleware **não pode** rodar depois de controller `before_action` — é fundamental Rails. Tem que ser controller concern, não Rack. |
| 4 | D-A8 conversation_id FK | PARTIAL | L172, L313-318 | FK + trigger adicionados, mas decisão FK-vs-trigger ainda "engineer escolhe" |
| 5 | D-A8 filesystem isolation | PARTIAL | L175, L523-529 | UID/0700 documentado, mas assume root/`CAP_SETUID` que Chatwoot container provavelmente NÃO tem |
| 6 | D-A5 session lifetime | CLOSED | L76, L399-413 | tabela `algorythmo_mcp_sessions` + 8h sliding ✓ |
| 7 | D-A5 invalidação | **NEW-ISSUE [P1]** | L411-413, L416 | revogação não é imediata — Redis cache de 5min mantém token revogado válido até expirar |
| 8 | D-A5 per-call validation | CLOSED | L410-413, L454-455 | per-call documentado ✓ |
| 9 | D-A5 Redis eviction | CLOSED | L411-413, L443 | distinção auth_expired vs auth_unavailable ✓ |
| 10 | D-A5 token in CLI | CLOSED | L414, L418-421, L457 | arquivo 0600 ✓ |
| 11 | 4-trilha PR deadlock | CLOSED | L201-219, L548 | pin/ADRs em M3-1 ✓ |
| 12 | 4-trilha Brain::Client | CLOSED | L208-211, L236-237 | skeleton em M3-1 ✓ |
| 13 | 4-trilha cron shared | CLOSED | L360, L483, L565 | split ✓ |
| 14 | 4-trilha routes | CLOSED | L212-214, L548 | centralizado M3-1 ✓ |
| 15 | 4-trilha endpoint stubs | CLOSED | L282-285 | contract spec blocking ✓ |
| 16 | ADR-0012 tag→SHA | CLOSED | L74, L501-502 | SHA pin ✓ |
| 17 | ADR-0012 cadência | CLOSED | L503-505 | bi-semanal + hotfix ✓ |
| 18 | ADR-0012 specs mocked | PARTIAL | L508-516, L552 | lane real existe mas nightly/manual — não bloqueia PR que mexe em Brain::Client |
| 19 | ADR-0012 30d hold | CLOSED | L505-517 | hotfix lane ✓ |
| 20 | ADR-0012 drift checks | CLOSED | L508-516 | explícitos ✓ |

**Score:** 14 CLOSED, 3 PARTIAL, 2 NEW-ISSUE de 20 itens.

### Section B — Novos P1 introduzidos pelo v2

- **[P1] B1: TenantResolution não pode ser Rack middleware.** Plano diz "Rack middleware roda depois do auth Chatwoot". Falso — Rack roda ANTES dos controllers, não depois. Auth do Chatwoot é controller `before_action`, não Rack middleware. Tem que ser **controller concern** ou **base controller subclass** (L171, L203-205, L220-221). Esse é um misconception arquitetural fundamental que invalida a story D-A8 inteira como escrita.
- **[P1] B2: Revogação MCP não é imediata.** Validator aceita cache hit do Redis sem consultar DB. Logout só faz `UPDATE algorythmo_mcp_sessions SET revoked_at = NOW()`. Token revogado continua válido **até 5 minutos** (TTL do cache Redis). Pra ser imediato: ou `DEL` explícito no cache no revoke, ou validator consulta DB sempre (perde performance) (L411-413, L416, L454-455).
- **[P1] B3: Devise Token Auth não tem logout hook confiável.** Plano usa override em `Devise::SessionsController#destroy` pra disparar revogação. Mas Devise Token Auth é **token-based**, não cookie-session. Não há "logout event" garantido — tokens só expiram naturalmente. Re-login do founder em outro device pode não disparar nada (L416, L448, L542).
- **[P1] B4: UID isolation assume capabilities que Chatwoot container não tem.** `useradd`, `chown`, e `setuid` precisam de root ou `CAP_SETUID`. Container Chatwoot tipicamente roda como user non-root. Plano não documenta como isso vai funcionar em prod (L41, L353, L523-528).
- **[P1] B5: Isolamento filesystem falha se GBrain virar daemon compartilhado.** Se todos os tenants compartilham o MESMO processo `gbrain` (long-running daemon/pool), `0700` no diretório não ajuda — o processo lê tudo que tem permissão FS. Plano não especifica se GBrain é per-request subprocess ou daemon shared. Default doc do upstream sugere daemon (L170, L199, L528).

### Section C — Verdict

**NO-GO.** As decisões de produto (D1-D5, D-D1/D-D2/D-D3, wedge ajustes+ingestion+dedup, forward-only `algorythmo_m3_start_date`) seguem intactas. Mas v2 fecha 14 dos 20 findings da v1 introduzindo **5 novos P1 que são misconceptions arquiteturais**, não detalhes:

1. **Rack vs controller** — não dá pra colocar Rack depois de auth Chatwoot. Tem que ser controller concern.
2. **Revogação MCP** — 5min de cache + token revogado = janela de comprometimento aceitável? Founder precisa decidir.
3. **Devise Token Auth** — sem logout event confiável, "re-login invalida" é teoria, não realidade.
4. **UID isolation** — Chatwoot rodando non-root no container não pode fazer `chown` + `setuid`. Default precisa ser diferente.
5. **GBrain daemon vs subprocess** — se daemon, filesystem isolation por diretório é teatro.

### Recommendation

**Pare de iterar o plano no texto.** Esses 5 P1 são misconceptions arquiteturais que vêm de **falta de validação contra o runtime real**. Próximo passo recomendado:

1. **Spike técnico (1 dia, engineer agent):** prototipar o middleware **como controller concern** num branch throwaway. Validar como Chatwoot auth + tenant resolution se compõem na prática. Validar como `gbrain mcp` se inicia (subprocess vs daemon). Validar se Chatwoot container roda como root ou não.
2. **Founder decision needed (2 perguntas):**
   - (a) MCP revocation: 5min de janela é aceitável (simples) ou precisa ser imediato (complexo, sem cache)?
   - (b) Tenant filesystem isolation Day-1: aceita `0700` + same-user + trust GBrain como Day-1, com sandbox real (bwrap/firejail/separate container) como follow-up? Ou bloqueia Day-1 até sandbox real?
3. **Depois do spike + decisões, v3 do plano** absorve realidades. v3 será curta — só fecha esses 5 P1.

Iterar texto sem validar runtime vai introduzir mais misconceptions a cada round.

---

*Fim do GSTACK REVIEW REPORT codex v2.*

---

## GSTACK REVIEW REPORT — spike runtime validation (2026-05-25)

**Reviewer:** engineer agent (spike de 1 dia em worktree throwaway `.worktrees/spike-m3-validation/`, branch `spike/m3-runtime-validation` — NÃO merga). **Verdict:** **5 P1 da review v2 RESOLVIDOS — GO para v3.0 absorption.**

### Por que o spike rodou

Codex v2 fechou 14 de 20 findings da v1 mas introduziu 5 novos P1 sendo **misconceptions arquiteturais**, não detalhes de código. Continuar iterando texto sem validar runtime introduziria mais misconceptions. Founder autorizou spike técnico de 1 dia pra:

1. (Q1) Validar como Chatwoot auth + tenant resolution se compõem na prática — Rack ou controller concern?
2. (Q2) Validar qual UID o container Chatwoot prod roda como — root ou non-root?
3. (Q3) Validar como `gbrain serve` se inicia — subprocess curto por sessão ou daemon long-running?
4. (decisão founder a) MCP revocation: 5min de janela é aceitável (simples) ou precisa ser imediato (complexo)?
5. (decisão founder b) Tenant filesystem isolation Day-1: `0700` + same-user + trust GBrain ok? Ou bloqueia Day-1 até sandbox real?

### Fatos descobertos

**Q1 — Auth chain Chatwoot (`docs/algorythmo/M3-brain/spike-runtime-validation.md` §1.1):**
- `Api::BaseController#authenticate_access_token!` → sets `Current.user` (controller `before_action`)
- `Api::V1::Accounts::BaseController#current_account` → sets `Current.account` + valida `AccountUser` membership
- `Algorythmo::Api::V1::BaseController#ensure_algorythmo_crm_enabled!` → feature gate
- **Rack roda no step 0, antes de tudo. `Current.user`/`Current.account` são `nil` em Rack time.**
- **Conclusão:** TenantResolution **TEM** que ser controller concern, não Rack middleware. Protótipo já criado em `.worktrees/spike-m3-validation/engines/algorythmo/app/controllers/concerns/algorythmo/brain/tenant_resolution.rb` — engineer reescreve no PR M3-1.

**Q2 — Container UID:**
- `docker/Dockerfile` (prod, 152 linhas) **não tem `USER` directive** → container roda **root (UID 0)**.
- Devcontainer dev usa `USER vscode` (UID 1000) — não é o prod.
- `bwrap`/`firejail` **não estão instalados** no container prod (Dockerfile só instala `build-base openssl tzdata postgresql-client imagemagick git vips`).
- **Conclusão:** `chmod 0700` + `mkdir -p` triviais. Codex v2 estava ERRADO sobre "container non-root" pra esse fork. Day-1 simplificado: 0700 + root invoca subprocess + `--dir` argument.

**Q3 — GBrain runtime model (acessível via overview page do repo upstream — files individuais retornaram 404, repo muito novo):**
- `gbrain serve` (stdio default): subprocess per-session, designed for Claude Code / Cursor / Windsurf. Standard MCP stdio model.
- `gbrain serve --http`: long-running daemon, OAuth 2.1 + admin dashboard.
- `gbrain capture`: short-lived CLI synchronous.
- **Conclusão:** Stdio mode Day-1 = subprocess curto por sessão. `--dir` argument controla data directory por invocação. Codex B5 ("filesystem isolation é teatro se GBrain é daemon shared") aplica só ao HTTP mode (M3.5+), NÃO ao stdio Day-1.

### Decisões founder trancadas (2026-05-25)

- **(a) MCP revocation = 5min cache window aceitável.** Validator pode usar Redis cache 5min sem fallback síncrono pro DB. Revoke faz UPDATE + DEL best-effort; se DEL falha, token revogado fica válido até cache expirar (≤5min). Trade-off Day-1 aceito. Registrado em R8.
- **(b) Filesystem isolation Day-1 = 0700 + `--dir` simplificado.** Per-tenant UID/`useradd`/`setuid` → M3.5 backlog quando multi-tenant external entrar.

### Status dos 5 P1 da review v2

| # | P1 | Status v3 | Como fechou |
|---|-----|-----------|-------------|
| B1 | TenantResolution não pode ser Rack | **CLOSED** | Spike Q1 → controller concern; plan §3, §4 T0, §10 PR M3-1 atualizados |
| B2 | Revogação MCP não é imediata | **CLOSED** | Founder decision (a) + R8 + plan §2 D-A5, §4 T3 documentam |
| B3 | DTA sem logout event confiável | **CLOSED** | Plan declara Devise hook como defense-in-depth + TTL 8h sliding + UI regen mecanismo real; R8 registra |
| B4 | UID isolation assume root/CAP_SETUID | **CLOSED** | Spike Q2 → container roda root; plan §1 item 11, ADR-0013 addendum, §10 PR M3-8 simplificados |
| B5 | Filesystem theater se GBrain daemon | **CLOSED** | Spike Q3 → stdio = subprocess per session; plan §1 item 9, §3, §4 T3, R9 documentam HTTP mode M3.5+ |

**Score:** 5/5 CLOSED. **0 NEW-ISSUE introduzidos pelo v3** (apenas absorção factual + simplificação).

### Próximo passo

1. Re-rodar `/codex review docs/plans/0004-m3-brain-mvp.md` pra confirmar fechamento e procurar issues introduzidos pelas edições v3.
2. Se GO: dispatch PR M3-1 (gate). Engineer reescreve concern + spec a partir do protótipo spike (worktree é throwaway, não merga).
3. Worktree `.worktrees/spike-m3-validation/` permanece como referência consultiva até PR M3-1 mergar; depois pode ser descartado.

---

*Fim do GSTACK REVIEW REPORT spike runtime validation.*

---

## GSTACK REVIEW REPORT — `/codex review` v3 + premise audit (2026-05-25)

**Reviewer:** Codex CLI (gpt-5-codex, reasoning high, tokens ~593k) + premise audit Claude via WebFetch nos docs do upstream `garrytan/gbrain`.

### Section A — V2 P1 closure (codex v3 verdict)
- **B1 Rack-vs-concern**: [CLOSED] L36, L199, L219-221 — controller concern ✓
- **B2 MCP revoke 5min**: [CLOSED] L69, L361, L384 — janela aceita ✓
- **B3 DTA logout hook**: [CLOSED] L69, L362, L379, L517 — demoted to defense-in-depth ✓
- **B4 UID isolation root**: [CLOSED] L40, L202, L674 + verificado `docker/Dockerfile` sem `USER` ✓
- **B5 GBrain daemon-vs-subprocess**: [CLOSED] L38, L201, L518, L675 — Day-1 stdio, HTTP→M3.5 ✓

**5/5 P1 da v2 fechados.**

### Section C — V1 regression check (codex v3 verdict)
Todos os 7 itens [HOLDS]: Sidekiq `Current.account` explícito, `default_scope` banido, FK + trigger, Brain::Client skeleton em M3-1, SHA pin, bi-semanal, lane M3-1.5. **Zero regressões.**

### Section B — Issues novos do v3 (codex)
- **[P1] B6** Flag `--dir` é foundational mas não confirmado upstream. Se nome for outro, quebra ADR-0013, MCP setup, Brain::Client, filesystem path, Sidekiq workers (L321, L360, L363, L574, L630).
- [P2] Spike doc referenciado mas vive no worktree — engineer precisa do path canônico (L543, L661).
- [P2] "Subprocess curto" enganoso pra sessões Cursor abertas horas — é stdio long-lived, não daemon, mas não é curto também (L38, L201, L363).
- [P2] Sidekiq `capture`/`export` paga startup GBrain por subprocess — plano não orça throughput/latency (L295, L321, L402, L630).
- [P2] Redis revoke: stale cache é bounded pelo Redis TTL, não pelo MCP session TTL — linguagem precisa explicitar (L69, L361, L384).

### Section D-BIS — PREMISE AUDIT (Claude, fora do escopo codex)

Fazendo WebFetch nos docs upstream `garrytan/gbrain` pra confirmar flag `--dir`, descobri algo **maior que o P1 do codex** — uma premissa errada do plano inteiro.

#### Fato 1: Flag `--dir` não existe nos docs

`docs/GBRAIN_V0.md`, `docs/operations/headless-install.md`, `docs/integrations/README.md` e README — nenhum menciona `--dir`, `--data-dir`, `--home`, ou env var `GBRAIN_HOME`. O config é **único** em `~/.gbrain/config.json` (mode 0600). Plano v3 assume um flag que **provavelmente não existe**.

#### Fato 2: GBrain v0 era explicitamente single-user

`docs/GBRAIN_V0.md` literal: *"Single-user, local-only... No multi-user, no RLS, no OAuth in v0. Multi-user path (future): Supabase RLS + per-user API keys"*.

#### Fato 3: GBrain atual (v0.40.x) tem multi-user, mas via OAuth scope, NÃO via per-tenant directory

README atual: *"Each person on the team gets their own slice of the brain, **scoped by login**. When you query, you only see what you're allowed to see — never another person's notes."* + *"OAuth-based access control with scope-gating (read/write/admin)"*.

Modelo real do upstream: **UM brain compartilhado**, multi-user via OAuth scope dentro do GBrain. Não é "per-tenant directory" como o plano v3 desenha (`/var/algorythmo/tenants/<account_id>/brain`).

#### Implicação: o plano v3 está construindo arquitetura multi-tenant errada

O plano herdou da P3 do office hours ("multi-tenant Day-1 upstream") + D-A4 ("stdio Day-1, HTTP M3-late") uma combinação que **GBrain não suporta**:
- **Stdio mode = single-user.** Cursor/Claude conecta num brain local, sem tenant separation.
- **Multi-tenant requer HTTP+OAuth mode** (`gbrain serve --http --enable-dcr`). Mas isso é exatamente o que o plano deferiu pra M3-late (D-A4).
- **Per-tenant directory + `--dir`** é uma invenção do plano, não convenção upstream. Viola `feedback_architecture_defer_upstream.md`.

#### Resolução honesta (compatível com decisões trancadas)

D1 ("Algorythmo dogfooding interno, zero cliente PME externo no M3") + D-A4 (stdio Day-1) **já implicam single-tenant Day-1**. P3 ("multi-tenant Day-1 upstream") deve ser relido como "**o motor tem capacidade multi-tenant pronta quando precisarmos em M3.5**", não "wire multi-tenant infra Day-1 para um único usuário".

**Plano v4 simplifica dramaticamente:**
- ❌ Drop `/var/algorythmo/tenants/<account_id>/brain` per-tenant directory
- ❌ Drop `--dir` argument (não existe upstream)
- ❌ Drop filesystem isolation (single user = founder)
- ❌ Drop per-tenant `algorythmo_mcp_sessions` complexity (founder é o único user)
- ✅ Use single `~/.gbrain/` (convenção upstream) no host do founder
- ✅ Algorythmo backend escreve no único brain via `gbrain capture <markdown>` subprocess
- ✅ MCP stdio = founder → `gbrain serve` → `~/.gbrain/` (zero tenant logic)
- ✅ TenantResolution concern fica como **defense-in-depth para M3.5**: hoje só verifica que user é membro do único Algorythmo account; pronto pra escalar
- ✅ M3.5 (primeiro cliente PME): ativa HTTP+OAuth mode + scope per-account dentro do GBrain
- ✅ ADR-0013 reescrita: filesystem section vai inteira pra M3.5, dream cycle gate fica
- ✅ Sidekiq workers ainda passam `account_id` explícito (preserva future-proofing) mas não usam pra path lookup

### Verdict

**NO-GO.** Mas o problema **não é** os P1 anteriores (todos fechados). É **premissa errada sobre como GBrain faz multi-tenant** — descoberta só agora porque o plano nunca verificou contra docs upstream.

Plano v3 não está quebrado por bugs; está quebrado por **overengineering pra capacidade que o motor faz diferente**. v4 é **subtractive**: remove arquitetura multi-tenant Day-1, mantém estrutura single-tenant que casa com D1 dogfooding.

### Próximo passo

1. **Re-edição v4 subtractive** (planner agent): remover per-tenant directory, `--dir`, filesystem isolation, complexidade `algorythmo_mcp_sessions` per-tenant. Manter scaffolds que viram úteis em M3.5.
2. **Re-rodar `/codex review` no v4** — espera GO ou GO-WITH-CAVEATS porque a superfície vai encolher 30-40%.
3. **Update memória `project_brain_m3.md`**: P3 ("multi-tenant Day-1") reinterpretado como "motor pronto, infra plana wired em M3.5".

---

*Fim do GSTACK REVIEW REPORT codex v3 + premise audit.*

---

## GSTACK REVIEW REPORT — `/codex review` v4 (2026-05-25, pós plano v4.0)

**Veredito:** NO-GO (2 P1 + 8 P2). **0 regressões** dos fechamentos v3.

**Tokens used:** 144.264

### Status fechamentos v3 (TODOS HOLDARAM)

- ✅ Sidekiq `Current.account` explicit (L304/L316/L410)
- ✅ `default_scope` banido (L207/L241/L303/L412)
- ✅ FK real + trigger constraint ingestion_logs (L302/L340/L486)
- ✅ `Brain::Client` skeleton em PR M3-1 (L231)
- ✅ SHA pin + bi-semanal + hotfix + M3-1.5 integration lane (L43/L438-L453/L499/L508)
- ✅ Controller concern (não Rack) (L36/L208/L228)
- ✅ 5min MCP revoke + DTA defense-in-depth (L69/L370/L393)
- ✅ stdio subprocess long-lived per session (L38/L210/L372)

### Subtração v3→v4 (LIMPA)

Sem leftover `--dir`, per-tenant path, `useradd`, `chown`, `setuid`, `bwrap`, `firejail` no corpo ativo Day-1. Footers históricos L736+ preservados verbatim (intencional). Active mentions são statements negativos/removal em L51/L52/L204/L211/L330/L342/L465.

### Findings por área

**1. Regression Check**
- [P2] Ingestion-log invariant wording "check constraint" em L209 conflita com L302 (trigger or deferrable composite FK). Não é regressão; alinhar wording pra engineer não tentar CHECK impossível.
- [P2] `TenantResolution` usa `ENV.fetch('ALGORYTHMO_PRIMARY_ACCOUNT_ID')` (L228), mas spec só cobre mismatch (L230/L485). Unset env precisa ser controlled 403 fail-closed, não 500 acidental.

**2. Premise Audit Absorption**
- [P2] `GBRAIN_HOME` ressuscitou no corpo ativo em L508/L563 como temp-dir mechanism, apesar do premise audit (L944) dizer que não foi encontrado upstream. Default integration lane = `HOME=$tmp`; só usar `GBRAIN_HOME` se Day-0 provar que existe.
- [P2] Scaffolds são coerentes pro boundary Rails/DB, mas não pro boundary GBrain. `Brain::Client.new(account_id)` ignora `account_id` Day-1 (L231/L330), enquanto R9 promete M3.5 "activate scope without schema change" (L527). Falta mapping explícito: account_id → upstream OAuth client/scope.

**3. New Attack Surfaces**
- **[P1] Concorrência no `~/.gbrain/` compartilhado.** Múltiplos processos escrevem: Rails adjustment `gbrain capture` (L37), Sidekiq capture/export (L210/L330/L410), long-lived MCP `gbrain serve` (L38/L210/L372). Upstream topology diz que default single brain serve "one agent, no Conductor parallelism"; a única garantia explícita de concorrência achada é pra dois `sync` no mesmo commit, não cobre capture/export/serve mixed writes.
- [P2] Route-level leakage protection depende de TODO Brain controller herdar `Brain::BaseController` (L229) e TODA rota estar sob consolidated Brain routes (L233). Adicionar route audit/request spec específico pra `compiled_truth`, `timeline`, `adjustments`, `snapshots`, `mcp_token`, `mcp_sessions`. Smoke genérico (L243) não chega.
- [P2] MCP validator retorna session by token hash (L368), mas não tem Day-1 assertion de que session.account == requested account (stdio não tem request account). Não exploitable founder-only, mas precisa ser deferral M3.5 explícito antes de múltiplas contas.

**4. M3.5 Deferral Story**
- **[P1] Plan overclaims upstream OAuth scope como tenant isolation.** L467/L610 dizem que OAuth scope por conta faz queries retornarem só data daquela conta. Docs upstream descrevem **operation scopes** (`read`, `write`, `admin`), NÃO row-level account partitioning dentro de brain compartilhado. **M3.5 path NÃO está provado.**
- [P2] R9 migration hand-wavy: "tag brain existing as account=founder, create scopes" (L527), ADR successor prometido (L467/L610), mas não é onboarding sequence concreta. M3.5 precisa de ADR/tool concreto antes do primeiro PME.
- [P2] Forward-only semantics do primeiro PME indefinida. M3 exclui historical backfill (L57) com `algorythmo_m3_start_date` (L579); quando segunda conta chega, plan não diz se conversas existentes são backfilled, ignored, ou gated por per-account start date.

### Section E — Regression vs new issue ratio

- **Regressões v3 closures: 0.**
- New issues v4 subtraction/deferral: **6** (2 P1 + 4 P2).
- Leftover plan-hygiene issues v3 também tinha ou parcial: 3 P2.

### Veredito codex v4 (verbatim)

> VERDICT: NO-GO. The v3 security closures held, and the bad per-tenant directory architecture is mostly removed. The blocker is that v4 replaced it with an unproven shared-brain concurrency model and an overclaimed M3.5 OAuth-scope isolation story. Add a serialization/lock strategy for Day-1 `~/.gbrain/` access and verify upstream actually supports account-level data isolation, not just read/write/admin operation scopes.

### Próximo passo

1. **v5 absorção (planner agent):**
   - **P1 #1 concurrency**: Sidekiq queue dedicada `brain_writes` com `concurrency=1` (ou advisory lock Redis); spec stress (Rails capture + worker + MCP serve simultâneos) que prove zero corrupção. Investigar GBrain upstream pra lock interno.
   - **P1 #2 OAuth scope**: aceitar que M3.5 vai precisar de **1 brain por conta** (via `~/.gbrain-<account>/` separados, ou daemon HTTP isolado por account). Reescrever R9 + adicionar ADR-0014 (multi-tenant infra real M3.5).
   - **8 P2 cleanup**: alinhar wording check constraint vs trigger; spec unset env = 403 fail-closed; remover `GBRAIN_HOME` ressuscitado; explicitar account_id → OAuth scope mapping (ou marcar como Day-1 ignore + M3.5 brain-per-account); route audit specs; MCP validator session.account assertion; concretizar R9 migration; definir forward-only semantics segundo PME.
2. **Re-rodar `/codex review` no v5** — esperar GO ou GO-WITH-CAVEATS.
3. **Update memória `project_brain_m3.md`**: P3 reinterpretado novamente — "M3.5 = brain-per-account, não OAuth scope no shared brain".

---

*Fim do GSTACK REVIEW REPORT codex v4.*
