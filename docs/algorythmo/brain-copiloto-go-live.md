# Brain + Copiloto — Checklist de Go-Live

**Status do código:** COMPLETO no `algorythmo/main`. PRs: #127 (fundação), #130 (Ver), #131 (Histórico), #132 (Upload), #133 (Colar), #134 (tela Brain), #135 (Copiloto backend), #136 (Copiloto frontend).

O código está pronto e testado (com o motor gbrain **mockado** no CI). Esta é a fase de **ligar de verdade** — feita junto com o founder quando a chave do indexador OpenAI chegar. Os passos são sequenciais; cada um depende do anterior.

---

## Pré-requisitos (o que falta pra funcionar)

### 1. Chaves (BYOK) — founder fornece
- `DEEPSEEK_API_KEY` — síntese (`gbrain think`). **Founder JÁ tem.**
- `OPENAI_API_KEY` — indexador/embeddings (`text-embedding-3-small`). **PENDENTE.** Sem ele a ingestão de documento falha (status `failed`) e a busca não funciona — o cérebro não fica consultável.
- Setar as duas no Easypanel (env dos serviços **app** E **sidekiq**), nunca no código/chat.

### 2. gbrain instalado na imagem de produção — INFRA (gap aberto)
**Hoje o `docker/Dockerfile` NÃO instala o gbrain.** O `engines/algorythmo/package.json` declara a dependência pinada (`garrytan/gbrain#<SHA>`, ADR-0013) mas a imagem não a instala nem coloca o binário no PATH. Antes do deploy:
- Adicionar ao Dockerfile a instalação do gbrain no SHA pinado (confirmar o runtime real — Node CLI via `pnpm install` no engine, ou bun; o package.json diz Node/pnpm, a auditoria do motor menciona bun+PGLite — **verificar contra o binário real**).
- Garantir `gbrain --version` funcionando dentro do container e `GBRAIN_BIN` resolvendo (default `gbrain` no PATH).
- NÃO fazer no escuro: uma instalação errada quebra o build inteiro. Fazer com verificação de runtime + a prova de integração (passo 5).

### 3. Volume persistente pro cérebro — INFRA (crítico, decorre do #2)
O cérebro vive em `GBRAIN_HOME/<account_id>/.gbrain` (arquivo PGLite). **Sem volume persistente, o cérebro é apagado a cada deploy** — todo o conhecimento anexado some (mesma lição do Active Storage, ver memória `project_active_storage_persistent_volume`).
- Montar um volume persistente no caminho do `GBRAIN_HOME` (base, ex.: `/app/.gbrain-accounts`) nos serviços **app** + **sidekiq** (os dois acessam o cérebro).
- Setar `GBRAIN_HOME_BASE` (ou o env equivalente) apontando pro volume.

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
