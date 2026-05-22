# Plano 0001 — MVP Algorythmo OS

**Status:** Rascunho — aguardando review (`/plan-eng-review` + `/plan-design-review`)
**Data:** 2026-05-22
**Owner:** Gustavo (founder/CEO Algorythmo)
**Linhagem:** consolida ADRs 0001-0011

> **Escopo do review:** plano vivo. M0-M2 detalhados e revisados agora. M3 (Brain) e M4 (Manu) ficam como esboço direcional — re-planejados via novo `/plan-eng-review` quando M2 fechar. Decidido em 2026-05-22 pra evitar travar agora decisões (stack do Brain, UX de escalation Manu) que amadurecem rodando CRM no laptop primeiro.

## 1. Visão do MVP

Algorythmo OS rodando localmente no laptop do founder, com:

- Painel integrado humanos + AI (sem telas separadas).
- CRM Kanban funcional com drag-and-drop entre estágios.
- Brain mínimo da empresa indexando conversas + leads + ajustes manuais.
- Manu (primeiro agente operacional, vendas) atendendo conversa ponta-a-ponta via BYOK plug-and-play.
- UI rebranded como Algorythmo OS, sem traços visíveis de Chatwoot.
- Funcionalidades upstream que poluem a experiência cortadas.

**Critério geral de MVP:** founder roda local, cria lead, conversa entra pelo widget, Manu responde com contexto do Brain, lead caminha no Kanban, deal é fechado — tudo num único painel, sem trocar de tela.

## 2. Restrições operacionais

- **Ambiente de dev:** laptop do founder (Windows 11). Stack Chatwoot intacta (Rails + Vue + PostgreSQL + Redis). Não trocar stack base — é trabalho desnecessário e quebra sync com upstream (ADR-0001).
- **Repo:** privado standalone (ADR-0009).
- **LLM:** BYOK por agente (ADR-0010). Lista de providers dia 1 em aberto (ver §7).
- **Hospedagem:** decisão adiada para o momento do deploy. Piloto inicial roda local.
- **Sync mensal com upstream** continua ativo durante todo o MVP (ADR-0001).

## 2.1 Decisões fixadas no `/plan-eng-review` (2026-05-22)

| ID | Decisão | Impacto |
|---|---|---|
| **A1** | Ambiente dev local: **Docker Desktop** | Setup idêntico ao deploy futuro, zero divergência. Trilha M0 documenta `docker compose up` como caminho único. |
| **A2-back** | Isolamento upstream backend: **Algorythmo OS como engine Rails sobre o fork** | Chatwoot upstream praticamente intocado. Todo código novo de backend (CRM, Brain, agentes) vive no engine. Sync mensal fica trivial no backend. Custo: M0 ganha uma trilha de fundação pra estabelecer estrutura do engine. |
| **A2-front** | Isolamento upstream frontend: **Inline com tag `algorythmo:` no upstream** (revisado eng-review) | Vite/Vue não tem conceito de engine. Mudanças nos arquivos Vue upstream são marcadas com comentário-tag `// algorythmo: <feature-gate-name>` em cada bloco editado. Sync mensal inspeciona tag-por-tag. Decisão D1 do eng-review (2026-05-22) — alternativa "app Vue paralelo" descartada por triplicar complexidade de build. |
| **A3** | Modelo de card do CRM: **Pessoa/Lead** | Cada card é uma pessoa com estado único no funil. Decisão D3 do eng-review (2026-05-22) — founder optou por manter ontologia simples mesmo após advertência do adversarial sobre cliente recorrente. Mitigação registrada (§7): permitir "reabrir" Lead fechado pra novo ciclo de venda sem perder histórico, via cadeia `previous_lead_id`. Aceito custo de migração futura Lead→Deal se padrão recorrente virar comum. |
| **A4** | Estágios do funil: **Renomeáveis (5 fixos)** | MVP entrega 5 colunas (Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido), cliente pode renomear via tela de configuração simples. Não adicionar/remover no MVP. |
| **A5** | Telemetria C-level: **Placeholder agora, coleta depois** | M0 adiciona campo `telemetry_consent` (default `false`) na conta + tabela `telemetry_events` vazia + sem job de envio. Respeita ADR-0007 sem implementar uso ainda. |
| **A6** | Captain AI do Chatwoot: **Esconder com flag `algorythmo_show_captain: false`** (novo eng-review) | Decisão D4 do eng-review (2026-05-22). Captain (AI nativa do upstream) fica no código mas oculto via feature flag. Cliente PME nunca vê Captain. Decisão final de cortar vs manter fica pós-M4 quando Manu maduro. Compatível com sync mensal. |
| **Q1** | Profundidade da limpeza M2: **Refinamento por tela** | Esconder botões, abas, dropdowns dentro de telas que ficam. Sem remoção de módulos inteiros. Lista de cortes construída em batches durante M2. |
| **Q2** | Estratégia de corte M2: **Estender sistema existente do Chatwoot com prefixo `algorythmo_`** (revisado eng-review) | Decisão D2 do eng-review (2026-05-22). Chatwoot já tem `config/features.yml` (60+ flags) + `lib/feature_helper.rb` + `featureFlags.js` + UI de admin. Nossas flags entram lá com prefixo `algorythmo_` (ex: `algorythmo_crm`, `algorythmo_brain`, `algorythmo_manu`, `algorythmo_show_captain`). Alternativa "overlay separado" descartada por duplicar UI de admin e gerar 2 sistemas paralelos com risco de divergência. Marcador `algorythmo: feature-gate` em PRs que mexem em arquivos upstream pra inserir checagem mantido. |
| **T1** | E2E framework: **Playwright instalado no M0** | Drag-and-drop do Kanban, fluxo conversa→CRM, widget→conversa, toggle de feature flag — caminhos que só são testáveis confiável com browser real. Setup em M0 + suite mínima validando login + criar lead. |
| **T2** | Cobertura de testes: **≥ 90% backend / ≥ 75% Vue interaction + E2E gate** (revisado eng-review) | Backend (models, services, controllers, jobs, helpers): ≥ 90% por arquivo. Vue de interação pesada (drag-and-drop, kanban, formulários complexos): ≥ 75% por arquivo, com **Playwright passando como gate obrigatório** (E2E cobre o que Vitest sozinho testaria só com mock). Composables/store/getters/utils Vue puros: ≥ 90%. Razão da revisão: forçar 90% em arquivo Vue de drag-and-drop empurra dev a testar contra o mock, não contra comportamento real. |
| **P1** | Position dos cards: **Float (`position` decimal)** | Simples pra MVP. Mitigação registrada (§7): quando precisão começar a degradar (raríssimo), migrar pra lexorank num PR posterior — schema continua compatível (string ou float, mesma coluna semântica). |
| **P2** | Cache de feature flag: **Em memória, restart-required no MVP** (revisado eng-review) | Engine carrega flags no boot, cacheia em memória. Toggle de flag exige restart do servidor no MVP. Razão da revisão: pub/sub Redis é over-engineered pro laptop e under-engineered pra multi-tenant (precisaria escopo por account). Quando entrar deploy multi-tenant, planejar invalidação per-account via cache `Rails.cache` com chave por account, não pub/sub global. Registrado em §7 como decisão de deploy. |

## 3. Marcos

### M0 — Fundação

**Saída:** o founder sobe `Algorythmo OS` no laptop dele via `docker compose up` e vê o painel sem rastro de "Chatwoot" na UI visível, com a estrutura de engine Rails pronta pra receber CRM/Brain/agentes.

- Repo confirmado privado no GitHub.
- Engine Rails `Algorythmo::Engine` estabelecida (mount point, namespace de models, controllers, views, assets, rotas).
- Estrutura de overlay i18n: arquivo de tradução `algorythmo.yml` sobrescreve strings de marca do Chatwoot sem editar arquivos upstream.
- Ambiente local rodando 100% via `docker compose up` (Rails + Sidekiq + PostgreSQL + Redis + frontend Vue, todos containerizados).
- **Rebrand M0 — reusa primitivos existentes do Chatwoot:** `INSTALLATION_NAME`, `BRAND_NAME`, `LOGO`, `LOGO_THUMBNAIL`, `BRAND_URL` no `.env` (já suportados por `config/installation_config.yml`). Search-replace controlado dos ~110 literais "Chatwoot" hard-coded em arquivos Vue + 36 hits em i18n upstream, **cada edição marcada com tag `// algorythmo: rebrand-m0`** (A2-front). Mecanismo de overlay próprio descartado — usar o que já existe.
- Rebrand cobre: logo, favicon, título do navegador, e-mails transacionais. App móvel fora do escopo do MVP (§7).
- Referências internas a "Chatwoot" em código/docs de engenharia permitidas (ADR-0008).
- Placeholder de telemetria: campo `telemetry_consent` em `accounts` (default `false`), tabela `telemetry_events` vazia.
- **Captain AI hidden via flag (A6):** flag `algorythmo_show_captain: false` adicionada em `config/features.yml` no batch M0. Confirma que UI do Captain não aparece em nenhuma tela cliente.
- **Playwright** instalado e configurado (T1). Suite mínima: login + criar Lead seed funcionando como smoke + busca por "Chatwoot" em DOM retorna zero.
- CI atualizado pra rodar RSpec + Vitest + Playwright + check de cobertura (≥ 90% backend, ≥ 75% Vue interaction com Playwright como gate, T2 revisado).
- CI verde no `algorythmo/main`.

**Critério de aceite (binário):**
1. `git clone && cp .env.example .env && docker compose up` → todos containers `healthy` em <5min.
2. Abrir `http://localhost:3000`, login funciona, criar conta de teste.
3. Buscar texto "Chatwoot" em qualquer tela visível ao cliente (Painel, Configurações, Inbox, Profile, e-mail de signup) → zero ocorrências.
4. `rails console` → `Algorythmo::Engine.routes` retorna rotas montadas.
5. `Account.first.telemetry_consent` retorna `false`.
6. UI do Captain (atalho `Cmd+K`, painel de sugestões, configurações) ausente — flag `algorythmo_show_captain` em `false` esconde todas as superfícies.
7. `grep -rn "Chatwoot" app/javascript/dashboard/` retorna só linhas marcadas `// algorythmo: rebrand-m0` (rastreabilidade).

### M1 — CRM Kanban

**Saída:** seção própria de CRM ao lado de Conversas, cards (Leads = pessoas) drag-and-drop entre colunas do funil.

- Menu "CRM" no sidebar (ADR-0004), ícone próprio.
- Modelo de dados (no engine Algorythmo, A2): `Algorythmo::Lead` vinculado 1:1 a `Contact` (já existe no upstream), com `stage_id` apontando pra `Algorythmo::Stage`. `Algorythmo::Pipeline` agrega Stages (1 pipeline no MVP, multi-pipeline pós-MVP — §7).
- Estágios padrão criados no seed: Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido. Tela "Configurar pipeline" permite **renomear** estágios. Não adicionar/remover (A4).
- Tela Kanban: 5 colunas, cards arrastáveis, drag-and-drop persiste via API.
- Criar/editar/excluir Lead. Editar Lead permite mudar dados (nome, e-mail, telefone, observações) e estágio.
- Vínculo bidirecional: conversa → lead ("Criar/vincular lead a partir desta conversa"), lead → conversas (lista no detalhe do Lead).
- Mitigação A3 (Lead que volta como novo): botão "Reabrir como novo Lead" em Leads fechados — cria novo Lead com link pro anterior em `previous_lead_id`. Histórico preservado.

**Critério de aceite (binário):**
1. Founder cria 5 Leads via UI, arrasta entre 5 colunas, refresh → posições persistidas.
2. Renomeia coluna "Proposta" pra "Orçamento enviado" via Configurar pipeline → todos cards refletem.
3. Abre uma conversa, clica "Criar lead", lead aparece em "Novo" com link pra conversa.
4. Fecha um Lead em "Fechado ganho", clica "Reabrir como novo", novo Lead criado com `previous_lead_id` correto.
5. **Fluxo real do widget (novo eng-review):** founder configura canal widget no painel, envia mensagem como "lead" de outra aba do navegador, conversa entra no painel, founder clica "Criar lead a partir desta conversa" → Lead aparece em "Novo" com `contact_id` correto e link pra conversa. Validado via Playwright.
6. Cobertura: ≥90% backend, ≥75% Vue interaction com E2E passando como gate (T2 revisado).

**Fora do escopo do MVP (§7):** múltiplas pipelines, filtros avançados, automações, relatórios.

### M2 — Limpeza (paralela a M1)

**Saída:** funcionalidades upstream que poluem a experiência escondidas via feature flag centralizada na engine (Q2). Refinamento por tela (Q1) — sem remoção de módulos inteiros.

- **Estende sistema existente do Chatwoot (Q2 revisado):** nossas flags entram em `config/features.yml` com prefixo `algorythmo_` (`algorythmo_crm`, `algorythmo_brain`, `algorythmo_manu`, `algorythmo_show_captain`, e flags de corte). Reaproveita helper `FeatureHelper` Ruby + `featureFlags.js` + UI de admin do Chatwoot.
- Lista de cortes em `docs/plans/cuts.md` — criada na trilha C (batch 1) e expandida na trilha E (batch 2). Founder valida cada batch antes de fechar.
- Critério de corte: feature que não cabe na visão AI-first + CRM-first do Algorythmo OS, e aparece como ruído visual ou cognitivo na experiência da PME.
- Qualquer alteração em arquivo Vue upstream pra inserir checagem de flag entra em PR separado marcado `// algorythmo: feature-gate <flag_name>` em cada bloco (rastreabilidade pro sync mensal).

**Critério de aceite (binário):**
1. `config/features.yml` contém todas as flags do batch com prefixo `algorythmo_` e default `false`.
2. Cada flag default-off esconde os elementos mapeados em `docs/plans/cuts.md` (validado via QA visual founder).
3. Toggle de uma flag pra `true` no admin do Chatwoot faz a funcionalidade reaparecer (regressão prevenida).
4. Sync mensal de teste (rebase contra `develop` atual) → conflitos só em arquivos marcados `algorythmo: feature-gate` (esperado), nenhum conflito em arquivos limpos.

### M3 — Brain MVP *(esboço — re-planejar após M2)*

> Conteúdo abaixo é direcional, não compromisso técnico. Decisões finais (stack de retrieval, formato de "ajustes", limites) ficam para o `/plan-eng-review` da próxima fase, depois de aprender com M1/M2 rodando no laptop.

**Saída pretendida:** memória mínima da empresa do cliente, alimentando agentes com contexto.

- Estrutura de memória: documentos (textos livres de instrução/política), entidades (leads, deals, contatos, conversas), eventos (mudanças de estágio, mensagens, anotações).
- Indexação automática de conversas + leads + deals à medida que acontecem.
- "Ajustes do cliente" — área onde founder/cliente cola instruções em linguagem natural ("nosso tom é informal", "nunca prometemos prazo abaixo de 5 dias úteis", "preço da plataforma começa em X").
- Retrieval simples por agente: dado uma conversa, traz contexto relevante (lead, deal, ajustes aplicáveis, conversas anteriores do contato).
- Cache local pra perguntas triviais (horário, FAQ) — Brain responde sem chamar LLM externa (princípio derivado do ADR-0003).

**Critério de aceite:** founder cola 3 ajustes em texto livre, abre uma conversa de teste, pede pra um endpoint debug "qual contexto Brain entregaria pra agente aqui?" e recebe contexto coerente.

**Decisões em aberto pra `/plan-eng-review`:**
- Stack de retrieval: PostgreSQL full-text + pgvector? Embeddings via LLM do cliente (custa tokens) ou modelo local pequeno?
- Estrutura de "ajustes" — texto livre estruturado por categoria, ou markdown único, ou interface tipo notion blocks?
- Limites de tamanho do Brain por cliente no MVP.

### M4 — Manu MVP *(esboço — re-planejar após M2)*

> Conteúdo abaixo é direcional. Decisões finais (providers BYOK dia 1, gestos de escalation, política de fallback) ficam para o `/plan-eng-review` da próxima fase.

**Saída pretendida:** Manu (vendas) plugada via BYOK, atendendo conversa de venda com contexto do Brain, aparecendo no painel como qualquer humano.

- Tela de configuração do agente Manu: campo "API Key" + dropdown "Provider" + botão "Testar conexão" (ADR-0010).
- Agente aparece no painel como humano: avatar próprio, status (ativo / aguardando chave / chave inválida), conversas atribuídas.
- Atribuição: regras padrão (conversa nova de um canal X vai pra Manu) configuráveis.
- Fluxo de atendimento: lead manda mensagem → Brain monta contexto → Manu chama LLM via chave do cliente → resposta volta como mensagem do "agente" Manu no painel.
- Escalation humano ↔ AI: humano pode "puxar" conversa de Manu, Manu pode pedir intervenção humana (tag, atribuição).
- Ações de Manu refletem no CRM: muda estágio de lead, cria deal, anota observação.

**Critério de aceite:** founder cria conta de teste, cola chave OpenAI/Claude em Manu, manda mensagem pelo widget como lead, Manu responde com tom + conteúdo coerentes com os ajustes do Brain, founder puxa a conversa, devolve pra Manu, deal avança no Kanban.

**Decisões em aberto pra `/plan-eng-review`:**
- Latência aceitável (timeout de resposta de Manu? UI de "Manu digitando..."?)
- Quantos providers ativar dia 1 (ver §7)?
- Política de fallback: se LLM externa cair, Manu cai pra modo degradado (templates locais) ou só falha visível?

## 4. Trilhas paralelas (após M0)

Trilhas do escopo atual (M0-M2). Trilhas de M3/M4 são planejadas no próximo ciclo de review.

### M0 — sequencial, founder gates
M0 não paraleliza. PR único (ou no máximo 2: engine-boot + rebrand) em worktree isolado, com adversarial-reviewer obrigatório antes de merge — é o trabalho que define a fundação do fork pelos próximos anos.

### Após M0 fechar, despacho em worktrees isolados:

| Trilha | Agente | Marco | Depende de | Worktree | Conflito potencial |
|---|---|---|---|---|---|
| A — CRM backend (Lead model + Stage + Pipeline + LeadsController + StagesController) | engineer | M1 | M0 | `worktree-crm-backend` | nenhum (engine namespace isolado) |
| B — CRM frontend (CrmKanban.vue + drag-and-drop + pipeline config) | engineer | M1 | **A merged** | `worktree-crm-frontend` | nenhum se A merged primeiro |
| C — Limpeza UI batch 1 (cortes mapeados durante M1) | engineer | M2 | M0 | `worktree-cleanup-batch1` | possíveis em arquivos Vue upstream também tocados por B — coordenar via marcação `feature-gate` |
| D — Design system Algorythmo OS | designer | cross-cutting | M0 | `worktree-design-system` | tokens/CSS — B precisa puxar branch de D antes de finalizar |

### Após M1 fechar:

| Trilha | Agente | Marco | Depende de | Worktree |
|---|---|---|---|---|
| E — Limpeza UI batch 2 | engineer | M2 | C, M1 | `worktree-cleanup-batch2` |

### Ordem de despacho recomendada

1. **M0** — engineer + adversarial-reviewer (sequencial, blocking).
2. **A + C + D** em paralelo logo após M0 mergear (3 worktrees independentes).
3. **B** começa quando A mergear (frontend precisa da API estável).
4. **E** começa após C mergear e M1 estar próximo de fechar.

### Coordenação de conflito B ↔ C

Tanto B (CRM frontend) quanto C (limpeza UI) tocam `app/javascript/dashboard/`. Para evitar guerra de merge:
- C foca em arquivos de telas **fora** do CRM (Settings, Reports, Inbox lateral, Captain UI).
- B foca em rotas novas `/app/accounts/:id/crm/*` que não existem no upstream → arquivos novos, zero colisão.
- Caso C precise mexer em arquivo que B também toca, sinaliza no PR → engineer coordena via rebase.

**Checkpoint após M2:** novo `/plan-eng-review` antes de despachar trilhas de Brain (M3) e Manu (M4).

## 5. Coordenação dos PRs

Para cada trilha, fluxo:
1. Engineer abre PR em worktree isolado.
2. Eu rodo `/review` + `/cso` + `/qa-only` no PR.
3. Adversarial-reviewer agent (modo CTO cético) entra em PRs estruturais (M0, M3, M4).
4. Founder aprova merge em PRs grandes ou com trade-off ambíguo.
5. `/ship` quando o marco fechar (não por PR individual — agrupado por marco).
6. `/canary` pós-deploy se a hospedagem estiver pronta; senão validação manual no laptop do founder.

## 6. Critérios de aceite de cada marco

Já especificados nos marcos (§3). Cada um é binário (passa / não passa) e validável no laptop do founder.

## 7. Decisões em aberto (consolidado)

**Resolvidas no `/plan-eng-review` 2026-05-22 (primeira passada + revisão adversarial):** A1 (Docker), A2-back (engine Rails) + A2-front (inline com tag `algorythmo:`), A3 (Lead=Pessoa, founder manteve contra recomendação adversarial), A4 (estágios renomeáveis), A5 (telemetria placeholder), A6 (Captain escondido com flag), Q1 (refinamento por tela), Q2 (estender sistema existente do Chatwoot), T1 (Playwright), T2 (≥90% backend / ≥75% Vue interaction + E2E gate), P1 (position float), P2 (em memória + restart no MVP).

**Mitigações registradas para revisitar pós-MVP:**
- A3 — **Quebra conhecida em cliente recorrente**: cadeia `previous_lead_id` cobre primeira recompra mas hist-órico se fragmenta com múltiplas. Se padrão recorrente virar comum (imobiliária, B2B SaaS), migrar pra modelo Deal+Contact em release planejada — custo: migração de schema com lead em produção.
- A4 — Estágios renomeáveis: adicionar/remover stages e múltiplas pipelines ficam pra v2.
- A6 — Captain: decidir cortar vs manter após M4 quando Manu maduro. Se Manu cobrir 100% dos casos do Captain, cortar; senão decidir convivência.
- P1 — Float position: migrar pra lexorank quando começar a degradar.
- P2 — Cache de flag: no momento do deploy multi-tenant, implementar invalidação per-account via `Rails.cache` com chave por account (não pub/sub global).

**Restam em aberto para M3-M4 (próximo `/plan-eng-review`):**
- Retrieval do Brain: pgvector vs vector DB externo. Embeddings via LLM do cliente vs modelo local pequeno.
- Estrutura de "ajustes do cliente" (texto livre vs blocos estruturados).
- Limites de tamanho/quota do Brain por cliente.
- BYOK providers dia 1 (ChatGPT só vs multi).
- Política de fallback quando LLM externa cai.
- Latência aceitável Manu, UX de "digitando...".
- Chip de contexto CRM dentro da conversa (mitigação ADR-0004).
- Escalation humano ↔ AI: gestos exatos no painel.

**Fora do escopo do MVP (deliberadamente diferido):**
- App móvel rebrand.
- Múltiplas pipelines CRM.
- Filtros, automações e relatórios do CRM.
- Coleta efetiva de telemetria (só placeholder no MVP).

## 8. Risco e mitigação macro

| Risco | Mitigação |
|---|---|
| Drift do upstream conforme fork diverge | Sync mensal mantido (ADR-0001), `develop` espelhada intocada. |
| M2 (limpeza) bloqueia M1/M3 por conflito em telas tocadas | Limpeza coordenada por marco; trilhas C/I atuam em áreas já estáveis. |
| Custo de tokens explode no piloto local | BYOK por agente (ADR-0010) — founder usa própria chave OpenAI durante dev, vê custo direto. |
| Brain vira motor invisível sem valor demonstrável | Critério de aceite do M3 inclui endpoint debug visível pelo founder. |
| Manu responde com qualidade ruim no MVP | M4 fecha só quando o critério de aceite passa em conversa real do founder — não é checklist de feature, é qualidade de saída. |

## 9. Próximo passo

Founder roda `/plan-design-review` neste plano. Após aprovação, despacho M0 (sequencial, single PR). Após M0 mergear, despacho A + C + D em paralelo. Após A mergear, B entra. Após C mergear e M1 fechar, E entra. Após M2 fechar, novo ciclo de review pra M3/M4.

## 10. Implementation Tasks (M0-M2)

### M0 — Fundação (sequencial)

- [ ] M0.1 — Criar estrutura `engines/algorythmo/` com `Algorythmo::Engine`, mount point em `/algorythmo`, namespace de models/controllers/views.
- [ ] M0.2 — Estabelecer overlay i18n: `algorythmo.yml` carregado depois dos arquivos upstream (precedência), chaves de marca (`installation_name`, etc).
- [ ] M0.3 — Configurar `.env.example` com `INSTALLATION_NAME=Algorythmo OS`, `BRAND_NAME=Algorythmo OS`, `LOGO=algorythmo-logo.svg`, `LOGO_THUMBNAIL=algorythmo-favicon.svg`, `BRAND_URL=https://algorythmo.com`.
- [ ] M0.4 — Search-replace controlado dos ~110 literais "Chatwoot" em `app/javascript/dashboard/` + `app/views/`, cada bloco marcado `// algorythmo: rebrand-m0`. Inventariar com `grep -rn "Chatwoot" app/javascript/dashboard/` antes e depois.
- [ ] M0.5 — Migration: adicionar `telemetry_consent:boolean default:false` em `accounts`. Criar tabela vazia `telemetry_events` (id, account_id, event_type, payload jsonb, created_at).
- [ ] M0.6 — Adicionar flag `algorythmo_show_captain: false` em `config/features.yml`. Inserir checagem nos pontos de entrada da UI Captain (`enterprise/app/javascript/dashboard/components-next/CaptainSidebar`, atalhos `Cmd+K`, painel de sugestões), cada inserção marcada `// algorythmo: feature-gate algorythmo_show_captain`.
- [ ] M0.7 — Instalar Playwright (`pnpm add -D @playwright/test`), config básico, suite smoke: login + criar conta de teste + busca por "Chatwoot" no DOM → zero hits + UI do Captain ausente.
- [ ] M0.8 — Atualizar CI: rodar RSpec + Vitest com coverage v8 (≥90% backend, ≥75% Vue interaction) + Playwright como gate.
- [ ] M0.9 — Validar `docker compose up` em <5min com todos containers healthy. Documentar em `engines/algorythmo/README.md`.

### M1 — CRM Kanban

#### Trilha A (backend, despachar primeiro)

- [ ] A.1 — Migration: `algorythmo_pipelines` (id, account_id, name, created_at), `algorythmo_stages` (id, pipeline_id, name, position, kind:enum {open, won, lost}), `algorythmo_leads` (id, account_id, contact_id FK, stage_id FK, position float, previous_lead_id, custom_fields jsonb).
- [ ] A.2 — Seed: 1 pipeline default por account com 5 stages (Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido). `algorythmo_show_captain` ainda `false`.
- [ ] A.3 — Models `Algorythmo::Pipeline`, `Algorythmo::Stage`, `Algorythmo::Lead` com validations (name presence, stage_required, kind enum).
- [ ] A.4 — `Lead#move_to_stage(stage)`: persistência + recalcula `position` (float). Edge: stage inexistente → erro.
- [ ] A.5 — `Lead#reopen_as_new_lead`: cria novo Lead com `previous_lead_id`, só executável em Lead em stage `kind=:won` ou `:lost`.
- [ ] A.6 — `Stage#rename(new_name)`: validação não-vazio + não-duplicado no pipeline.
- [ ] A.7 — `LeadsController` (CRUD + `PATCH /api/v1/leads/:id/move` + `POST /api/v1/leads/:id/reopen`).
- [ ] A.8 — `StagesController#rename` (`PATCH /api/v1/stages/:id/rename`).
- [ ] A.9 — Conversa → Lead: `POST /api/v1/conversations/:id/create_lead` (cria Lead vinculado a `contact_id` da conversa, em stage "Novo"). Idempotente: se já existe Lead `open` pra contato, retorna o existente.
- [ ] A.10 — RSpec ≥90% nos arquivos novos. Inclui edge cases de §Test plan.

#### Trilha B (frontend, após A merged)

- [ ] B.1 — Rota nova `/app/accounts/:id/crm` no Vue router (arquivo novo, zero colisão upstream).
- [ ] B.2 — Item "CRM" no sidebar (`app/javascript/dashboard/components/layout/Sidebar.vue`, marcação `// algorythmo: feature-gate algorythmo_crm`).
- [ ] B.3 — `CrmKanban.vue` (componente novo): 5 colunas, lista Leads via API, drag-and-drop (vuedraggable-next).
- [ ] B.4 — `LeadCard.vue`: nome, contato, valor (opcional pós-MVP), botão menu (editar, reabrir se fechado).
- [ ] B.5 — Modal `CreateLeadDialog.vue`: form de criação (nome, telefone, e-mail, contato existente ou novo).
- [ ] B.6 — Tela `PipelineConfig.vue` (`/app/accounts/:id/crm/pipeline`): inline rename de stage, validação client-side.
- [ ] B.7 — Botão "Criar lead a partir desta conversa" no header da conversa (`ConversationHeader.vue`, marcação `// algorythmo: feature-gate algorythmo_crm`).
- [ ] B.8 — Vitest ≥75% (arquivos de interação) + ≥90% (composables/store). Inclui mock de drag-and-drop.
- [ ] B.9 — Playwright cenários M1 (drag entre colunas + persistência + reabrir + conversa→lead + widget→conversa→lead).

#### Trilha C (limpeza UI batch 1, paralelo a A)

- [ ] C.1 — Inventariar candidatos a corte em `docs/plans/cuts.md` (founder valida lista antes de implementar).
- [ ] C.2 — Adicionar flags `algorythmo_<feature>` em `config/features.yml`, default `false`.
- [ ] C.3 — Inserir checagens nas superfícies (com `// algorythmo: feature-gate ...`).
- [ ] C.4 — Playwright valida cada flag ligada/desligada.

### M2 — Limpeza (continuação)

#### Trilha E (limpeza batch 2)

- [ ] E.1 — Segundo batch de cortes mapeado durante M1 (founder valida).
- [ ] E.2 — Mesmo padrão de flags + Playwright de C.

### D — Design system (paralela)

- [ ] D.1 — Tokens (cores, tipografia, espaçamento) em `engines/algorythmo/app/assets/stylesheets/_tokens.scss`.
- [ ] D.2 — Logo, favicon, splash assets em `engines/algorythmo/app/assets/images/`.
- [ ] D.3 — Override de componentes-chave (botão, input, modal) com classes Algorythmo.
- [ ] D.4 — Documentar visual em `engines/algorythmo/DESIGN.md`.

---

## GSTACK REVIEW REPORT

> Esta seção é gerada por skills `/plan-*-review` e deve permanecer ao final do arquivo.

| Review | Data | Reviewer | Verdict |
|---|---|---|---|
| `/plan-eng-review` | 2026-05-22 | Opus 4.7 (eng manager mode) + adversarial agent | **APPROVED_WITH_REVISIONS** |
| `/plan-design-review` | pendente | — | — |

### `/plan-eng-review` 2026-05-22 — Detalhe

**Escopo revisado:** M0-M2 (plano vivo, M3-M4 esboço para próximo ciclo).

**Decisões fixadas (11 + 1 nova):** A1, A2-back, A2-front (revisado), A3 (founder manteve contra recomendação), A4, A5, A6 (novo), Q1, Q2 (revisado), T1, T2 (revisado), P1, P2 (revisado). Tabela §2.1.

**Outside voice (adversarial-reviewer Opus 4.7):** verdict inicial RECONSIDER_SCOPE com 8 findings + 4 missing decisions. Após processamento via AskUserQuestion (D1-D4) e commits diretos pelas decisões óbvias:

- **F1 (frontend isolation):** resolvido por A2-front — inline com tag `algorythmo:` em arquivos Vue upstream.
- **F2 (feature flag collision):** resolvido por Q2 revisado — estender sistema existente do Chatwoot com prefixo `algorythmo_`.
- **F3 (Captain coexistence):** resolvido por A6 — Captain escondido via flag `algorythmo_show_captain: false`.
- **F4 (rebrand reinventando primitivos):** resolvido por M0.3/M0.4 — usar `INSTALLATION_NAME`/`BRAND_NAME`/`LOGO` + search-replace marcado.
- **F5 (T2 ≥90% em Vue interaction):** resolvido por T2 revisado — ≥75% em Vue interaction com Playwright como gate.
- **F6 (Lead vs Deal ontology):** **founder manteve A3 (Lead=Pessoa) contra recomendação**. Mitigação `previous_lead_id` em cadeia registrada como quebra-conhecida em §7. Custo aceito de migração futura se padrão recorrente virar comum.
- **F7 (P2 Redis pub/sub):** resolvido por P2 revisado — em memória + restart-required no MVP, plano de invalidação per-account no deploy multi-tenant.
- **F8 (widget channel test missing):** resolvido por M1 critério #5 + tarefa B.9 — Playwright valida widget→conversa→lead.

**Trilhas e worktrees:** §4 atualizado com ordem de despacho (M0 sequencial → A+C+D paralelos → B após A → E após C). Coordenação B↔C documentada.

**Implementation Tasks:** §10 cobre M0-M2 com IDs rastreáveis (M0.1-M0.9, A.1-A.10, B.1-B.9, C.1-C.4, E.1-E.2, D.1-D.4).

**Riscos residuais:**
1. **A3 (Lead=Pessoa)** quebra em cliente recorrente. Aceito conscientemente. Reavaliar se quebrar.
2. **Sync mensal exige disciplina** de inspeção de tags `algorythmo:` em arquivos Vue tocados pelo upstream — se virar dor, considerar app Vue paralelo.
3. **Coordenação B↔C** precisa atenção do engineer que despachar — se ambos tocarem `Sidebar.vue` simultaneamente, rebase necessário.

**VERDICT:** APPROVED_WITH_REVISIONS — pronto para `/plan-design-review`. Os 4 riscos abertos estão documentados em §7 com mitigação ou plano de revisita.
