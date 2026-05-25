# M3 — Brain MVP · Office Hours (Algorythmo OS)

**Sessão:** Office Hours YC (gstack `/office-hours`) — Startup mode
**Data:** 2026-05-25
**Branch:** algorythmo/main
**Repo:** FocusOnTheProgress/algorythmo-platform (fork Chatwoot)
**Status:** APPROVED
**Mode:** Startup (intrapreneurship — produto real Algorythmo OS)
**Supersedes:** — (primeira sessão M3)

**Próximo consumidor:** `/plan-eng-review` em sessão subsequente. Doc redigido com camada executiva (founder) + detalhe arquitetural (eng reviewer).

---

## Resumo executivo (1 parágrafo)

M3 entrega o **Brain MVP do Algorythmo OS** usando **GBrain (Garry Tan, MIT, garrytan/gbrain) como motor pronto** — não inventamos retrieval, multi-tenant, MCP nem knowledge graph. Construímos só os 5 complementos que ligam GBrain ao painel Algorythmo OS: UI de ajustes, ingestão de conversas Chatwoot, auth bridge MCP, configuração de Dream Cycle (só dedup), e instrumentação de "Brain ganhando conhecimento" semana a semana. Day-1 é dogfooding interno da Algorythmo — founder é o lead user, consulta via Cursor/Claude Code MCP, sente cada falha como cliente. Escopo: 3-4 semanas. Sucesso = founder vê o Brain ficar mensuravelmente mais inteligente sobre a Algorythmo a cada semana, por 4 semanas consecutivas.

---

## Problem Statement

A Algorythmo OS prometeu (ADRs D2/D3) que cada cliente PME tem um **Brain próprio** — memória + contexto + ajustes do negócio — vivendo no ambiente isolado dele e alimentando agentes operacionais (Manu vendas etc.) com conhecimento profundo. Sem Brain, **Manu (M4) é um chatbot genérico**: não sabe o tom da empresa, não conhece pricing, não lembra de conversas passadas, não distingue lead bom de ruim pra essa PME específica. A promessa "indistinguível de humano" (memória D7) cai por terra.

O M3 tem que entregar a primeira versão do Brain — pequena o suficiente pra rodar no laptop do founder durante o MVP (ADR-0011) e grande o suficiente pra Manu (M4) ter algo real pra consumir.

## Demand Evidence (D1)

**Decisão:** Day-1 do Brain = **dogfooding interno Algorythmo**. Nenhum cliente PME externo no M3.

**Por quê:**
- Único usuário sem risco contratual durante MVP.
- Founder vira lead user — sente cada falha em primeira pessoa.
- Knowledge da Algorythmo é o mais profundo disponível (founder = single source of truth) → matéria-prima mais rica pra Brain mastigar.
- Path natural pra primeiro cliente externo (M3.5) com sistema já amaciado pelo uso real, não pelo design.

**Não-evidência (honesto):** ainda não há cliente PME externo pedindo Brain. M3 é construção de capacidade interna que vira produto vendável a partir do M3.5. **Premissa de demanda externa fica testada só no M3.5.**

## Status Quo (D2)

**Hoje, na Algorythmo:**
- Conhecimento do negócio vive **na cabeça do founder + Notion/Drive solto**.
- Sem hierarquia, sem versionamento de "esta é a versão atual da política de preço", sem agente capaz de ler.
- Founder é **o gargalo** — ninguém mais responde lead com seu tom/precisão.
- Quando responde, founder improvisa a partir de memória + busca rápida no Notion.

**Custo do status quo:**
- Founder não escala. Toda contratação futura (vendedor humano) sofre o mesmo gargalo.
- Manu (M4), sem Brain, herda essa lacuna multiplicada.
- Inconsistências (preço dito de jeitos diferentes em conversas diferentes) já acontecem.

**Insight da resposta:** o ato de **externalizar** conhecimento tácito pro Brain é metade do valor do M3. Brain não é só indexador — é forçador de externalização. Founder vai descobrir lacunas em seu próprio modelo da empresa enquanto cola ajustes.

## Target User & Narrowest Wedge

**Target user Day-1:** founder Gustavo (CEO Algorythmo). Single user.
**Target user secundário (Day-30, dentro do M3):** ninguém — Manu chega só no M4.
**Target user M3.5:** primeiro cliente PME externo nominado (a recrutar após M3 fechar).

**Narrowest wedge (D3, escolha founder):** Ajustes via UI + ingestão de conversas Chatwoot + Dream Cycle parcial (só dedup/normalização de entidades). É a opção mais ambiciosa entre as três oferecidas — founder escolheu sabendo que arranha o limite do M5. **Hard line:** Dream Cycle pode dedup, NÃO pode enriquecer com fontes externas (P5).

**Por que não menor:** "só ajustes" não dá pra Brain provar que está "ganhando conhecimento" (D5 critério founder) — só cresce com colagem manual. Sem conversas históricas, o knowledge graph fica anêmico e Manu (M4) não tem memória cross-conversa.

**Por que não maior:** schema pack customizado (Approach C) é design especulativo — contraria a doutrina GBrain (`gbrain schema detect` aprende a partir do uso real). Multi-tenant exercitado com cliente externo (variante explorada) contraria D1 e introduz risco contratual.

## Constraints

- **Roda local no laptop do founder durante MVP** (ADR-0011). Sem deploy cloud no M3.
- **Cliente PME nunca vê Chatwoot, Obsidian, markdown, MCP** (D5 estendida). Toda interação humana é via painel Algorythmo OS.
- **BYOK obrigatório** (ADR-0010, estendido em P4) — chave do cliente também paga embeddings do Brain dele. Durante dogfooding, founder usa sua própria chave OpenAI/Anthropic.
- **Sem mudança no schema upstream do Chatwoot.** Ingestão de conversas usa API interna do fork, não mexe em tabelas Chatwoot (preserva D1 — sync mensal upstream).
- **Multi-tenant arquitetural Day-1, mas só Algorythmo ativo.** Não bloquear path pra cliente externo no M3.5.
- **Dream Cycle escopo travado:** auto-link + dedup ON, enriquecimento externo OFF (esse é o M5).
- **Latência de retrieval aceitável Day-1:** sub-segundo pra `gbrain search`, sub-3-segundos pra `gbrain think`. Não bloqueante pra M4 Manu, mas precisa ser confortável pro founder consultar pelo Cursor.

## Premises (P1–P10) — aprovadas em sessão

| # | Premissa | Origem |
|---|----------|--------|
| **P1** ★ | **Motor GBrain.** MCP-over-markdown + Compiled Truth/Timeline + embeddings + knowledge graph. Vs. inventar nosso. | Founder propôs, sessão trancou |
| **P2** | Brain roda no laptop founder durante MVP, side-car do fork. Container-per-tenant futuro. | ADR-0011 |
| **P3** | Multi-tenant Day-1 (feature upstream do GBrain, fuzz-tested). Só tenant Algorythmo ativo. | GBrain upstream (company-brain mode) + D1 |
| **P4** ★ | BYOK estendido pra embeddings — chave do cliente paga embeddings + LLM. | D10 + sessão |
| **P5** ★ | Dream Cycle só dedup + auto-link. Enriquecimento externo = M5 (hard line). | Memória `project_algorythmo_os_product_vision.md` + sessão |
| **P6** ★ | UI no painel Algorythmo OS pra colar ajustes. Cliente nunca vê markdown/Obsidian. | D5 estendida + sessão |
| **P7** | Ingestão de conversas via worker noturno, API interna do fork, sem mudar schema Chatwoot. | D1 (sync mensal upstream) |
| **P8** ★ | MCP exposto Day-1 pro founder consumir do Cursor/Claude Code. Não espera Manu (M4). | D4 |
| **P9** | Sem limite hard de tamanho no MVP (single user). Limites por tenant entram em multi-tenant ativo. | Pragmatismo |
| **P10** | Brain repo Git por cliente, cliente é owner. Algorythmo hospeda (D6 padrão) ou cliente self-hosts (premium). | D3 memória + D6 |

★ = novas premissas confirmadas explicitamente nesta sessão.

## Cross-Model Perspective

Phase 3.5 (second opinion via Codex) não rodada — sessão convergiu rápido e founder pediu ritmo. Recomendação: rodar `/codex review` sobre este doc + sobre o output do `/plan-eng-review` subsequente como sanity check independente antes de M3 começar.

## Approaches Considered

### Approach A — Personal mode (PGLite, founder-only)
- **Summary:** GBrain CLI rodando localmente em PGLite, founder edita markdown direto via Cursor, MCP via stdio pro Claude Code. Zero integração com painel Algorythmo OS.
- **Effort:** S (1 semana).
- **Pros:** ship em dias; founder dogfoodando imediatamente; zero acoplamento.
- **Cons:** não é produto Algorythmo OS — só founder usando ferramenta de prateleira; M4 Manu precisa re-arquitetura pra conectar; nada pra mostrar pra cliente PME externo no M3.5.
- **Reuses:** GBrain upstream.

### Approach B — Company brain dentro do Algorythmo OS · **RECOMENDADO**
- **Summary:** GBrain como side-car (Postgres + pgvector co-located com Chatwoot). Brain repo Git por tenant (Day-1 só Algorythmo). UI nova no painel pra ajustes. Worker noturno ingere conversas Chatwoot. MCP exposto via OAuth scoped (founder admin, Manu write futuro, vendedor humano read+write futuro). Dream cycle só dedup + auto-link. Schema = `gbrain-base` default.
- **Effort:** M (3-4 semanas).
- **Pros:** cumpre D1–D5 + P1–P10 inteiros; multi-tenant é feature do upstream (zero código nosso); synthesis layer (`gbrain think`) viabiliza D4 sem trabalho extra; aproveita Postgres existente; path direto pra M3.5 + M4.
- **Cons:** acoplamento com upstream em desenvolvimento ativo (mitigação: pin versão + monthly review estilo D1 Chatwoot); brain repo Git por tenant exige storage de Git privados (Algorythmo hospeda no padrão D6).
- **Reuses:** GBrain upstream completo, Chatwoot Postgres, painel CRM (componentes Vue existentes), ADR-0011 isolation, padrão de monthly review do D1.

### Approach C — B + custom schema pack upfront
- **Summary:** Tudo de B + custom schema pack autoreado antes de dogfooding (tipos `lead`, `objection`, `pricing-policy`, `deal-stage`).
- **Effort:** L (5-6 semanas).
- **Pros:** retrieval/synthesis mais precisos pra B2B sales.
- **Cons:** design especulativo — contraria doutrina GBrain (`schema detect` a partir do uso, não top-down); se errar schema, custa migração depois.
- **Reuses:** tudo de B + 14 verbos `gbrain schema *` do upstream.

## Recommended Approach — B (Company brain dentro do Algorythmo OS)

### O que construímos (os 5 complementos)

1. **UI de Ajustes no painel** (Vue + Rails endpoint)
   - Menu novo no painel Algorythmo OS: **"Brain"** (adjacente ao **"CRM"**).
   - Tela "Ajustes": editor de blocos de instrução em linguagem natural (tom, pricing, objections, política, FAQ). Cada bloco vira página markdown no padrão **Compiled Truth + Timeline** (topo = versão atual, embaixo = log imutável de mudanças).
   - Tela "Brain" (read-only): viewer das páginas atuais do Compiled Truth + timeline events (cliente vê "o que o Brain sabe sobre meu negócio").
   - Backend Rails: endpoint grava arquivo no brain repo do tenant + git commit + dispara `gbrain capture` (ou usa o file watcher do GBrain).

2. **Ingestion worker de conversas Chatwoot** (Sidekiq job)
   - Cron noturno (configurável; default 02:00 horário do tenant).
   - Lê conversas finalizadas do Postgres do fork (tabela `conversations` + `messages`) que ainda não foram indexadas.
   - Formata cada conversa como markdown com frontmatter (`lead_id`, `channel`, `started_at`, `agent`, `outcome`) e corpo = transcript.
   - Chama `gbrain capture --file` ou usa o `IngestionSource` contract pra ingestion estruturada.
   - Idempotência via flag `brain_indexed_at` na conversation (não no schema Chatwoot — em tabela engine Algorythmo OS).

3. **Auth bridge MCP** (Rails + GBrain OAuth)
   - Usuário logado no painel → token MCP scoped emitido via DCR (Dynamic Client Registration do GBrain).
   - Escopos: founder = `admin`; Manu (M4) = `write`; vendedor humano = `read+write`; cliente PME = `read` da própria tenant.
   - Token persistido por sessão de painel. Refresh automático.
   - **D5 estendida:** cliente PME consome MCP só indiretamente via painel UI (não recebe URL/token direto).

4. **Configuração do Dream Cycle**
   - Liga: `auto_link` (extração de entity refs + edges, zero LLM cost), `dedup_entities` (fundir mesma pessoa/empresa em páginas diferentes).
   - Desliga: `enrich_external` (lookup de empresa em fontes externas), `fix_citations_external`, `score_salience_external`. Tudo que sai pra fora = M5.
   - Documentar quais crons GBrain padrão estão ON vs OFF em `docs/algorythmo/M3-brain/dream-cycle-config.md` (gerar no plan-eng).

5. **Instrumentação D5** ("Brain ganhando conhecimento")
   - Snapshot semanal automático: cron Rails roda toda segunda 06:00, faz `gbrain export` do tenant Algorythmo, compara com snapshot da semana anterior.
   - Métricas: páginas novas, páginas com Compiled Truth atualizado, novos timeline events não-triviais, novas entidades no graph, novas typed edges.
   - Relatório markdown gravado em `docs/algorythmo/M3-brain/weekly-snapshots/YYYY-WW.md` + email pro founder.
   - Founder responde por email "sim/não" pra "sei mais sobre Algorythmo hoje do que há 7 dias?". Resposta arquivada no próprio snapshot.

### Setup por tenant (mesmo Algorythmo Day-1)

```
tenant create algorythmo
  └─ Postgres schema isolado (algorythmo_brain) com pgvector
  └─ Brain repo init em /var/algorythmo-os/tenants/algorythmo/brain (Git privado)
  └─ Schema pack ativo: gbrain-base
  └─ MCP server boot (porta única + OAuth scope-gated)
  └─ Crons Dream Cycle ativadas (subset configurado)
  └─ Snapshot diff cron ligado
  └─ Founder convidado como admin (token emitido)
```

### O que NÃO construímos (fica out-of-scope explícito)

- ❌ Painel multi-tenant de admin (gerência de tenants) — entra no M3.5 quando primeiro externo chegar.
- ❌ Onboarding flow de cliente PME — M3.5.
- ❌ Schema pack customizado pra B2B sales — M3.5 (depois de aprender via dogfooding).
- ❌ Enriquecimento externo (Linkedin lookup, CNPJ lookup, dossiê IA) — **M5**.
- ❌ Hosting cloud (deploy) — depois do M4, quando primeiro cliente externo entrar.
- ❌ Modo degradado (LLM cliente cai) — herdado do M4 Manu, não Brain.
- ❌ Audit log granular de quem leu o quê — herdado do GBrain upstream, suficiente Day-1.

## Open Questions (pro `/plan-eng-review` resolver)

1. **Brain repo storage**: Git local em filesystem do laptop founder Day-1 funciona. Quando deploy chegar, Algorythmo OS hospeda Git privado per tenant — escolha de backend (Gitea self-hosted? Gogs? bare repo + SSH?). Decidir no plan-eng ou adiar pra deploy.
2. **Schema do Postgres**: GBrain quer Postgres dedicado ou aceita schema separado no mesmo Postgres do Chatwoot? Validar com `docs/INSTALL.md` do GBrain durante plan-eng.
3. **MCP transport**: stdio (Claude Code/Cursor) é suficiente Day-1, mas Manu (M4) provavelmente quer HTTP (Sidekiq job chamando MCP). Confirmar setup HTTP MCP com OAuth no GBrain Day-1.
4. **Pin de versão GBrain**: qual versão pinar Day-1 e qual a cadência de bump (mensal alinhado a D1 do Chatwoot?). Definir em ADR-0012 no plan-eng.
5. **Embedding provider Day-1**: GBrain suporta 16 providers. Founder usa OpenAI Day-1 ou ZeroEntropy (default do GBrain)? Trade-off de custo/qualidade documentado em `docs/integrations/embedding-providers.md` do upstream.
6. **Onde o "Ajustes" UI cabe no painel**: novo menu raiz "Brain" ou subseção de "CRM"? Coordenar com `/plan-design-review` antes do plan-eng.
7. **Granularidade de ingestion**: conversa inteira como uma página, ou cada mensagem como evento timeline? Provavelmente conversa-como-página + lead como entidade canônica. Decidir no plan-eng.

## Success Criteria (D5)

**Critério founder (qualitativo):** "Brain está ganhando conhecimento sobre a Algorythmo, semana a semana."

**Instrumentação (mensurável):**
- ✅ Snapshot diff semanal automatizado e arquivado.
- ✅ Crescimento mensurável (novas páginas / novas seções / novos timeline events não-triviais / novas typed edges) em **4 semanas consecutivas**.
- ✅ Founder responde "sim, sei mais sobre Algorythmo pelo Brain hoje do que há 7 dias" em **≥3 de 4 semanas**.
- ✅ Founder usa MCP via Cursor/Claude Code ≥1 consulta/dia em 4 semanas (instrumentado via `gbrain stats`).

**Critério adicional pro plan-eng:**
- Manu (M4 spike) consegue chamar `gbrain think` com contexto de uma conversa e devolver resposta sintetizada com ≥2 citações de páginas Brain reais (não alucinação). Teste manual no fim do M3, gate pra abrir M4.

**O que falha:** se em 4 semanas o snapshot diff for vazio (founder não cola ajustes, ingestion não puxa nada novo, graph não cresce) — sinal de que ou (a) founder não usa, ou (b) wedge tá errado. Volta pra prancheta, reavalia D3.

## Distribution Plan

**Day-1 (M3):** roda no laptop do founder. Sem distribuição externa. Dogfooding fechado.

**M3.5:** primeiro cliente PME externo recebe acesso via convite manual. Algorythmo hospeda (D6 padrão), cliente loga no painel Algorythmo OS, recebe seu próprio Brain repo + Postgres schema isolados.

**M4+:** cliente PME externo opera direto. Brain consumido por Manu (M4) automaticamente; por humano vendedor via painel; por founder via MCP no Cursor (mantém-se durante toda a vida do produto — founder é developer-user permanente).

**Onboarding de tenant futuro:** comando único `algorythmo:tenant:create[name]` rake task no Rails que orquestra os 6 passos do "Setup por tenant" acima. Plan-eng materializa.

## Dependencies

**Hard dependencies (bloqueiam M3 começar):**
- M2 fechada — UI cleanup mergeado, painel pronto pra receber novo menu "Brain".
- M2-B1 (PR #58) mergeado — algorythmo_cut_flags fail-closed validado em Playwright (cliente PME nunca vê Chatwoot via cuts). M3 adiciona novas superfícies que herdarão esse padrão.
- Postgres do Chatwoot com extension pgvector instalada. Validar Day-0 do M3.
- Bun instalado no ambiente dev (GBrain CLI usa bun).

**Soft dependencies:**
- `/plan-eng-review` rodado e aprovado antes de qualquer código M3.
- `/plan-design-review` pra UI do menu "Brain" + telas Ajustes/Viewer (coordenar com Q6 acima).
- ADR-0012 escrita: "GBrain como motor do Brain Algorythmo OS — versão pinada, cadência de bump, política de breaking changes" (criar durante plan-eng).
- Memória de projeto atualizada com `project_brain_m3.md` (criar no fim desta sessão).

**Dependências do M3 que liberam outras fases:**
- M4 Manu depende de Brain rodando + MCP exposto + synthesis layer (`gbrain think`) ativa.
- M3.5 (primeiro cliente PME externo) depende de M3 fechada + rake task de tenant creation.
- M5 (enriquecimento) depende de M3 + crons de Dream Cycle prontas pra acender.

## The Assignment

**Uma ação concreta pro founder antes do M3 começar:**

📌 **Cola 10 "ajustes" da Algorythmo num arquivo `algorythmo-brain-seed.md` esta semana** — antes mesmo do código M3 existir. Pode ser num Notion novo, num arquivo no Drive, no que for. Mas escreve. 10 blocos curtos:
- Tom de voz (com 2-3 exemplos de mensagem boa e mensagem ruim)
- Política de preço (faixas, descontos permitidos, gatilhos de aprovação)
- Top-5 objections + como você responde cada uma
- Política de prazo (entrega, resposta, follow-up)
- Pitch de 1 parágrafo
- Diferenciador vs competidor X (nominado)
- Quem NÃO é cliente da Algorythmo (perfil que você recusa)
- Política de discovery call (quantas perguntas, quais)
- Política de proposta (estrutura, validade, condições)
- Política de handoff de lead pra próximo passo (call, demo, contrato)

**Por que importa antes do código:** isso é a matéria-prima do Brain Day-1. Se você não consegue escrever 10 ajustes em uma semana, o problema não é o GBrain — é que o conhecimento ainda não está pronto pra ser externalizado. Esse exercício força a externalização que o Brain vai amplificar. Se você sentir dor escrevendo, ótimo — o Brain vai resolver dor real. Se você sentir que está inventando, sinaliza que algumas políticas ainda não existem (e o Brain vai te ajudar a construir).

Esse `algorythmo-brain-seed.md` vira o primeiro commit do brain repo da Algorythmo no Day-1 do M3.

## What I noticed about how you think

- **"Cabeça do founder + Notion/Drive solto" foi resposta honesta sem teatro.** Maioria dos founders dá "playbooks estruturados" mesmo quando sabe que é mentira. Você não. Isso é o que torna o Brain factível — você reconhece o gargalo que ele resolve.

- **Você escolheu "Ajustes + conversas + Dream Cycle dedup" sabendo que arranha o limite do M5.** Mesmo padrão de A3 (Lead=Pessoa contra recomendação adversarial). Você prefere ambição com hard line a conservadorismo seguro. Vou amarrar Dream Cycle no escopo "só dedup" como gate explícito pro plan-eng — esse é o teste se você consegue segurar o pedido por enriquecimento durante o M3.

- **A pivôtada pro GBrain mostrou search-before-building em ação.** Eu estava te empurrando pra desenhar um wedge sobre infra desconhecida ("ajustes + cache + retrieval" abstrato). Você trouxe a engine pronta de prateleira (do CEO da YC, MIT, 18.9k stars) e re-economizou o problema. Esse é o instinto certo de founder — não inventar o que já existe, comprar com tempo só os complementos. Recalibrei a recomendação inteira por causa disso.

- **"Perguntar pelo Cursor e receber resposta com meu próprio tom" como surpresa esperada** é a melhor formulação do produto que apareceu na sessão. É produto-pessoa, não produto-feature. Vale colar essa frase como vision statement do M3 inteiro — está mais clara do que qualquer "Brain as memory layer for AI agents".

- **D5 ("Brain ganhando conhecimento sobre empresa") em vez das opções estruturadas que eu ofereci** mostrou que você pensa em compound interest, não em conversion metric. Isso casa com a tese do GBrain Dream Cycle. Foi a resposta que mais reconfigurou meu entendimento do que é sucesso do M3.

---

## Próximos passos (handoff)

1. **Founder:** executar o `algorythmo-brain-seed.md` (10 ajustes) esta semana.
2. **Próxima sessão:** `/plan-eng-review` sobre este doc + as 7 Open Questions. Materializa em `docs/plans/0004-m3-brain-mvp.md`.
3. **Em paralelo:** `/plan-design-review` sobre o menu "Brain" + telas Ajustes/Viewer no painel. Coordenar com pasta `docs/algorythmo/M3-brain/design/` (criar quando rolar).
4. **Após plan-eng aprovado:** ADR-0012 escrita ("GBrain como motor M3 — versão pinada, cadência de bump"). Memória `project_brain_m3.md` atualizada.
5. **M2-B1 (PR #58) mergeado** antes de iniciar trabalho de código M3 — fail-closed cuts é pré-requisito de qualquer nova superfície adicionada ao painel.
6. **Opcional:** rodar `/codex review` sobre este doc + sobre o plan-eng output como sanity check independente (founder pattern por memória — usa codex em decisões duras).
