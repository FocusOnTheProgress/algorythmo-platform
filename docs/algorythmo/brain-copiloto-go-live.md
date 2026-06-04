# Brain + Copiloto — Checklist de Go-Live

**Status do código:** COMPLETO no `algorythmo/main`. PRs: #127 (fundação), #130 (Ver), #131 (Histórico), #132 (Upload), #133 (Colar), #134 (tela Brain), #135 (Copiloto backend), #136 (Copiloto frontend).

O código está pronto e testado (com o motor gbrain **mockado** no CI). Esta é a fase de **ligar de verdade** — feita junto com o founder quando a chave do indexador OpenAI chegar. Os passos são sequenciais; cada um depende do anterior.

---

## Pré-requisitos (o que falta pra funcionar)

### 1. Chaves (BYOK) — founder fornece
- `DEEPSEEK_API_KEY` — síntese (`gbrain think`). **Founder JÁ tem.**
- `OPENAI_API_KEY` — indexador/embeddings (`text-embedding-3-small`). **PENDENTE.** Sem ele a ingestão de documento falha (status `failed`) e a busca não funciona — o cérebro não fica consultável.
- Setar as duas no Easypanel (env dos serviços **app** E **sidekiq**), nunca no código/chat.

### 2. gbrain instalado na imagem de produção — INFRA ✅ RESOLVIDO (branch `algorythmo/brain-engine-image`)
**Resolvido:** o `docker/Dockerfile` agora instala o motor.
- Runtime confirmado contra o binário real no SHA pinado: **GBrain é um CLI Bun** (`engines: bun >=1.3.10`, entrypoint `src/cli.ts`), **não** Node/pnpm. A nota antiga do `package.json` do engine estava errada e foi corrigida.
- Instalação: `bun install -g github:garrytan/gbrain#<SHA>`, lendo `engines/algorythmo/GBRAIN_PINNED_SHA` (fonte única do pin, sem duplicação). bun + o install global ficam em `/usr/local/bun` no pre-builder e são copiados pro estágio final slim.
- Sem `--ignore-scripts`: o `postinstall` do gbrain é auto-protegido (no-op na instalação) e o `@electric-sql/pglite` (trustedDependency) roda o setup do WASM.
- Smoke no próprio build (`gbrain --version`) falha cedo se o motor não entrar na imagem.
- **Validado end-to-end** numa imagem com o mesmo formato de produção (Alpine + Ruby, sem npm/curl): `init --pglite` + `capture` + `stats` → cérebro nasce com `Pages: 0`, captura 1 doc → `Pages: 1`. bun 1.3.14, gbrain 0.42.25.0.
- Portão final: build completo no GitHub Actions na branch (publica só tag `sha-…`, não toca `latest`/produção) antes do merge.

### 3. Volume persistente pro cérebro — INFRA (crítico)
O cérebro vive em `GBRAIN_HOME_BASE/<account_id>/.gbrain` (arquivo PGLite). **Sem volume persistente, o cérebro é apagado a cada deploy** — todo o conhecimento anexado some (mesma lição do Active Storage, ver memória `project_active_storage_persistent_volume`).

**Lado-imagem (já feito nesta branch):** o Dockerfile crava `ENV GBRAIN_HOME_BASE=/app/.gbrain-accounts` e cria o diretório. Sem o volume o motor ainda roda; só não persiste.

**Lado-Easypanel (founder roda uma vez, antes do primeiro provisionamento):** montar um volume persistente em `/app/.gbrain-accounts` nos serviços **app** E **sidekiq** do projeto `os-empresarial` — idêntico ao volume `storage` já provado.

Pela UI (mais simples): em cada serviço → **Mounts** → **Add Mount** → tipo **Volume**, Name `gbrain-accounts`, Mount Path `/app/.gbrain-accounts`. Repetir no `app` e no `sidekiq` (mesmo Name → mesmo volume compartilhado). Depois **Deploy** em cada serviço.

Pela API Easypanel (tRPC), o equivalente exato (rodar nos dois serviços):
```
mounts.createMount  { json: { projectName: "os-empresarial", serviceName: "app",
                              values: { type: "volume", name: "gbrain-accounts",
                                        mountPath: "/app/.gbrain-accounts" } } }
mounts.createMount  { json: { projectName: "os-empresarial", serviceName: "sidekiq",
                              values: { type: "volume", name: "gbrain-accounts",
                                        mountPath: "/app/.gbrain-accounts" } } }
```
Conferir com `mounts.listMounts` no serviço `app` (em `db`/`redis` dá "Invalid service type"). Sem isso, o passo 4 (provisionar) cria um cérebro que o próximo deploy apaga.

### 4. Provisionar o cérebro da Modeloja — comando no container
Rodar uma vez (founder roda no container, ou via deploy hook), com as chaves no env:
```
ACCOUNT_ID=2 bundle exec rake algorythmo:brain:provision
```
Isso roda `gbrain init --pglite --force --embedding-model openai:text-embedding-3-small ...` + `gbrain config set models.think deepseek:deepseek-chat`, com `GBRAIN_HOME` isolado da Modeloja (account 2). O cérebro nasce **zerado** (0 páginas — sem nada do dogfooding do founder, isolamento P0-5).
- Setar `ALGORYTHMO_PRIMARY_ACCOUNT_ID=2` no env.

### 5. Prova de integração real — o portão (ADR-0013 / PR0)
Antes de confiar no Copiloto, rodar o gate:
```
GBRAIN_REAL=1 OPENAI_API_KEY=... DEEPSEEK_API_KEY=... bundle exec rspec engines/algorythmo/spec/algorythmo/services/brain/gbrain_real_integration_spec.rb
```
Prova: `capture → stats → search` funciona contra o gbrain real no SHA pinado, e o cérebro nasce com 0 páginas. Se passar, o motor está OK de verdade (até aqui tudo foi mockado).

### 6. Deploy
O merge no main já dispara o build (GH Actions → ghcr.io). Falta o pull/deploy no Easypanel (via API ou painel). Pipeline externalizado — ver memória `project_deploy_pipeline_external_build`.

### 7. Smoke ao vivo (founder)
- Inteligência → Brain → Ajustar → anexar um documento real (PDF/docx/md) → confirmar status `indexado` (não `failed`).
- Inteligência → Copiloto → perguntar algo coberto pelo documento → resposta `grounded` com chip de citação.
- Perguntar algo fora do documento → "não encontrei no Cérebro" (não inventa).

---

## Ordem de dependência

```
chave OpenAI (2)  ─┐
gbrain na imagem (2)├─► provisionar (4) ─► prova de integração (5) ─► deploy (6) ─► smoke (7)
volume persistente (3)┘         ▲
                                └── precisa das chaves + gbrain rodando
```

Sem a chave OpenAI, nada além da UI funciona (upload cai em `failed`, Copiloto retorna `engine_unconfigured`/503 honestamente). A UI em si (tela do Brain + chat do Copiloto) já fica visível e navegável pós-deploy — útil pra revisão visual do founder mesmo antes da operação real.

---

## O que JÁ está garantido (não precisa fazer)
- Isolamento de cérebro por conta (`GBRAIN_HOME`), cérebro da Modeloja nasce zerado.
- Chaves só via env, nunca em código/log/argv (redigidas).
- Upload admin-only, validado (zip-bomb/pdf-bomb/exe/magic-bytes/path-traversal fechados).
- Copiloto read-only (não escreve em lugar nenhum), fronteira de flag-injection trancada do nosso lado, máquina de estados honesta (motor desligado ≠ "não sei"), rate-limit + semáforo de concorrência (cobre RAM da VPS 4GB), anti-XSS no front.
- Tudo revisado por adversarial-reviewer (Opus) e corrigido antes do merge.
