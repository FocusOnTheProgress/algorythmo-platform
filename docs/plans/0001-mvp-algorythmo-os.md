# Plano 0001 — MVP Algorythmo OS

**Status:** APPROVED_WITH_REVISIONS — `/plan-eng-review` (2 passadas) + `/plan-design-review` 2026-05-22. **Pronto pra despachar M0 e M1.** Segunda passada de eng-review (2026-05-22 noite) fechou tarefas A.9/A.10/B.4b/B.11-B.14 com decisões F1-F8 + C1-C4 incorporadas.
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

**Critério geral de MVP:** founder roda local, conversa entra pelo widget (ou WhatsApp / Email / Instagram quando canais conectados), **Lead é criado automaticamente em "Novo"** com metadata do canal (nome de perfil, foto, contato), Manu responde com contexto do Brain, lead caminha no Kanban, deal é fechado — tudo num único painel, sem trocar de tela e sem nenhum clique manual pra "criar lead".

**Princípio fundador (canal-first):** Lead nunca é criado por humano ou agente AI. Lead nasce quando mensagem entra por canal conectado. O sistema captura e classifica. Humano e Manu trabalham sobre Leads que já existem.

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

## 2.2 Decisões fixadas no `/plan-design-review` (2026-05-22)

| ID | Decisão | Impacto |
|---|---|---|
| **D5** | **Anatomia do card Lead — pessoa-first compacto** | Nome no canto superior esquerdo, canal de origem logo abaixo (ícone + nome do canal: WhatsApp / Email / Instagram / widget), tempo nesta etapa (não última atividade), menu ⋮ no canto direito revelado on-hover. Sem valor monetário (Lead = pessoa, A3). Click no card abre drawer lateral com detalhes. |
| **D6** | **Auto-create de Lead por canal** | Lead nunca é criado manualmente. Toda mensagem que chega via canal conectado (WhatsApp, Email, Instagram, widget) dispara `MessageCreated` que cria Lead em "Novo" se não houver Lead aberto pro contato. Captura metadata do canal (nome de perfil, foto, handle, número, domínio do email). Idempotente: subsequentes do mesmo contato em Lead aberto não criam novo. Botão "Criar lead a partir desta conversa" vira "Vincular conversa a Lead existente" (exceção). |
| **D7** | **Manu indistinguível de humano (sem disclosure AI)** | Founder optou contra recomendação de transparência. Sem chip "AI" no avatar, sem disclosure no widget, sem separação na lista de agentes. Risco regulatório (LGPD + futuras leis de IA brasileiras) e de marca (lead descobrir e perder confiança) **assumidos conscientemente**. Mitigação registrada §7: revisitar pós-M4 se reclamação ou exigência legal aparecer. |
| **D8** | **Ações Manu no CRM — híbrido por stakes** | **Auto (sem aprovação):** anotar observação, mover "Novo" → "Qualificado", marcar tag. **Requer aprovação humana (sugere, humano clica Aprovar/Editar/Recusar):** mover pra "Proposta", mover pra "Fechado ganho/perdido", criar deal com valor monetário, reabrir Lead fechado. UI da aprovação aparece na timeline da conversa como card "Manu sugere [ação]". Painel do humano tem inbox de "Aprovações pendentes". Audit log de toda ação Manu (auto ou aprovada). |
| **D9** | **Enriquecimento de Lead — minimal no MVP, completo em M5** | MVP captura SÓ metadata grátis que canal já entrega (nome de perfil, foto, handle, número, domínio email). Enriquecimento real via AI / APIs externas (Clearbit, Apollo, scraping, IA buscando dossiê) vira novo marco **M5 — Lead Intelligence** re-planejado quando M2 fechar. Razão: dependência do Brain maduro + decisões LGPD + latência aceitável que ainda não temos contexto pra tomar bem. |
| **D10** | **Sinalização de Lead parado — cor + tempo, escala adaptável por etapa** | Base de cor: 0-12h verde, 12-24h amarelo, 24-36h vermelho. Coeficiente por etapa multiplica a banda base (defaults: Novo 1x, Qualificado 4x, Proposta 7x, Fechado sem alerta). Cliente customiza coeficiente na tela "Configurar pipeline" conforme média do próprio negócio. Card mostra chip colorido + tempo numérico ao lado. Filosofia: sempre incentivar reduzir tempo. Razão: transforma Kanban de visualização em radar de gargalo, função de gestão real pro PME. |
| **D11** | **A11y baseline no MVP — escopo reduzido pós eng-review round 2 (F4 + C4)** | Kanban e Manu nascem acessíveis em baseline: navegação por teclado parcial (Tab move foco entre colunas e cards, Enter abre drawer, Esc fecha/cancela), `aria-label`/`aria-live` anunciam transição de stage para leitor de tela, chip de aging usa **dual-coding** (cor + glyph `●` verde / `◐` amarelo / `○` vermelho) pra cobrir daltonismo, contraste mínimo WCAG AA em todos os textos do card. **Drag-and-drop fica mouse-only no MVP** — `vuedraggable-next` não suporta drag-by-keyboard de forma confiável e WAI-ARIA 1.1 deprecou `aria-grabbed`/`aria-dropeffect`. Operação de mover pode ser feita pelo menu ⋮ do card (acessível por teclado) como fallback futuro — registrado em §7. Empty state inicial fixo: "Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais. **Conecte um canal agora →**" linkando pra Configurações > Inboxes (foco entra no link via Tab — P3). Gate automatizado: `@axe-core/playwright` em CI reprova PR com violations `critical`/`serious` WCAG AA. Custo: ~1-1.5 dia extra em M1 (após corte do drag-by-keyboard). Razão: a11y desde o dia 1 é world-class e barato; retrofitar é caro. Drag-by-keyboard fica como roadmap pós-MVP. |

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

**Saída:** seção própria de CRM ao lado de Conversas, cards (Leads = pessoas) drag-and-drop entre colunas do funil. **Leads aparecem automaticamente em "Novo" conforme mensagens entram pelos canais conectados (D6).**

- Menu "CRM" no sidebar (ADR-0004), ícone próprio.
- Modelo de dados (no engine Algorythmo, A2): `Algorythmo::Lead` vinculado 1:1 a `Contact` (já existe no upstream), com `stage_id` apontando pra `Algorythmo::Stage`. `Algorythmo::Pipeline` agrega Stages (1 pipeline no MVP, multi-pipeline pós-MVP — §7).
- Estágios padrão criados no seed: Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido. Tela "Configurar pipeline" permite **renomear** estágios. Não adicionar/remover (A4).
- Tela Kanban: 5 colunas, cards arrastáveis, drag-and-drop persiste via API.
- **Anatomia do card (D5 + D10):** nome no canto superior esquerdo, canal de origem logo abaixo, **chip colorido (verde/amarelo/vermelho conforme aging D10) + tempo nesta etapa** ("4d 2h" / "12 min"), menu ⋮ on-hover. Click abre drawer lateral com detalhes do Lead.
- **Auto-create por canal (D6):** subscriber em `MessageCreated` cria Lead em "Novo" se contato não tem Lead aberto. Captura metadata grátis do canal (nome de perfil, foto, handle, contato). Mensagens subsequentes em Lead aberto não criam novo.
- Editar Lead permite mudar dados (nome, e-mail, telefone, observações) e estágio. Exclusão = soft delete (mantém auditabilidade).
- Vínculo bidirecional: conversa ↔ lead automático (mesmo `contact_id`). Botão "Vincular esta conversa a outro Lead" no header da conversa cobre exceção (lead duplicado, lead errado).
- Mitigação A3 (Lead que volta como novo): botão "Reabrir como novo Lead" em Leads fechados — cria novo Lead com link pro anterior em `previous_lead_id`. Histórico preservado.

**Critério de aceite (binário):**
1. Founder configura canal widget no painel, envia mensagem de outra aba como "lead" → Lead aparece em "Novo" automaticamente em <2s com nome (do widget identify) e timestamp. **Zero cliques manuais.** Validado via Playwright.
2. Founder arrasta 5 Leads entre 5 colunas, refresh → posições persistidas. Card mostra nome / canal-origem / tempo-na-etapa conforme D5.
3. Renomeia coluna "Proposta" pra "Orçamento enviado" via Configurar pipeline → todos cards refletem.
4. Lead que chegou via widget é arrastado pra "Fechado ganho", botão "Reabrir como novo", novo Lead criado com `previous_lead_id` correto.
5. Mesmo contato manda mensagem 2x no widget → primeira cria Lead, segunda **não** cria Lead novo (idempotência por `contact_id` + Lead aberto). Validado via Playwright + RSpec.
6. **A11y baseline (D11 escopo reduzido — F4 + C4):** founder navega o Kanban com teclado (Tab move foco entre colunas/cards, Enter abre drawer, Esc fecha). Leitor de tela anuncia "Lead João movido de Novo pra Qualificado" via `aria-live` quando o humano move o card pelo mouse. Chip de aging mostra glyph além da cor (daltonismo). Empty state foca no link "Conecte um canal agora" via Tab (P3). `@axe-core/playwright` em CI retorna zero violations `critical`/`serious` WCAG AA. **Drag-by-keyboard NÃO está no escopo do MVP.** Validado via Playwright + checagem manual VoiceOver/NVDA.
7. **Empty state inicial:** primeiro acesso sem nenhum Lead mostra card "Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais. Conecte um canal agora →" linkando pra Configurações > Inboxes.
8. Cobertura: ≥90% backend, ≥75% Vue interaction com E2E passando como gate (T2 revisado).

**Fora do escopo do MVP (§7):** múltiplas pipelines, filtros avançados, automações, relatórios, **enriquecimento via AI/APIs externas (M5)**.

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

> Conteúdo abaixo é direcional. Decisões finais (providers BYOK dia 1, gestos de escalation, política de fallback) ficam para o `/plan-eng-review` da próxima fase. **Decisões de signaling (D7) e aprovação de ações (D8) já fixadas em /plan-design-review 2026-05-22.**

**Saída pretendida:** Manu (vendas) plugada via BYOK, atendendo conversa de venda com contexto do Brain, aparecendo no painel **indistinguível de qualquer humano (D7)**.

- Tela de configuração do agente Manu: campo "API Key" + dropdown "Provider" + botão "Testar conexão" (ADR-0010).
- **Signaling (D7):** Manu tem avatar, nome, status (ativo / aguardando chave / chave inválida), conversas atribuídas — **sem chip "AI", sem disclosure no widget, sem separação na lista de agentes**. Cliente PME que comprar Algorythmo decide individualmente expor ou não; default é indistinguível. Risco regulatório registrado §7.
- Atribuição: regras padrão (conversa nova de um canal X vai pra Manu) configuráveis.
- Fluxo de atendimento: **Lead já existe** (auto-create por canal, D6) → mensagem chega na conversa do Lead → Brain monta contexto → Manu chama LLM via chave do cliente → resposta volta como mensagem do "agente" Manu no painel.
- Escalation humano ↔ AI: humano pode "puxar" conversa de Manu (botão "Assumir" no header da conversa), Manu pode pedir intervenção humana (tag automática + atribuição).
- **Ações de Manu no CRM — híbrido por stakes (D8):**
  - **Auto:** anotar observação, mover "Novo" → "Qualificado", marcar tag.
  - **Sugere (humano aprova):** mover pra "Proposta", "Fechado ganho/perdido", criar deal com valor, reabrir Lead. UI: card "Manu sugere [ação]" na timeline da conversa, botões Aprovar/Editar/Recusar. Inbox "Aprovações pendentes" no painel do humano.
  - Audit log de toda ação Manu (auto ou aprovada) — coluna "agente que executou" no histórico do Lead.

**Critério de aceite:** founder cria conta de teste, cola chave OpenAI/Claude em Manu, manda mensagem pelo widget como lead → Lead aparece em "Novo" automaticamente, Manu responde com tom + conteúdo coerentes com os ajustes do Brain, Manu move pra "Qualificado" sozinha após qualificação, sugere mover pra "Proposta" → founder aprova → card avança. Founder puxa a conversa, devolve pra Manu, deal é fechado com aprovação.

**Decisões em aberto pra `/plan-eng-review`:**
- Latência aceitável (timeout de resposta de Manu? UI de "Manu digitando..."?)
- Quantos providers ativar dia 1 (ver §7)?
- Política de fallback: se LLM externa cair, Manu cai pra modo degradado (templates locais) ou só falha visível?
- UI exata do card "Manu sugere [ação]" e da inbox "Aprovações pendentes".

### M5 — Lead Intelligence *(novo marco, esboço — re-planejar após M2)*

> Marco criado no `/plan-design-review` (D9) para conter a visão de enriquecimento de Lead via AI/APIs externas. Sem compromisso técnico ainda.

**Saída pretendida:** quando Lead chega (auto-create D6), Brain dispara enriquecimento assíncrono que busca dados externos (empresa via email/domínio, perfil via handle social, dossiê via IA) e popula campos do Lead conforme retornar. Founder vê Lead "carregando contexto" e depois enriquecido.

**Decisões em aberto pra `/plan-eng-review`:**
- Fontes de dados: Clearbit / Apollo / Hunter / scraping próprio / IA generativa puramente.
- LGPD: enriquecimento cruza dados pessoais — exige base legal (consentimento? legítimo interesse?). Risco real.
- Latência aceitável (founder espera 0s, 5s, 30s?).
- UX de "Lead enriquecendo" — placeholder visual no card.
- Limites de custo por Lead (cada chamada externa custa).
- Trigger: todo Lead, só Lead em "Qualificado", só on-demand pelo humano?

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

**Resolvidas no `/plan-design-review` 2026-05-22:** D5 (anatomia card pessoa-first), D6 (auto-create Lead por canal), D7 (Manu indistinguível, contra recomendação), D8 (ações Manu híbrido por stakes), D9 (enriquecimento minimal MVP, M5 pós-MVP), D10 (aging signal com coeficiente por etapa), D11 (a11y baseline no MVP — keyboard + screen reader + dual-coding).

**Mitigações registradas para revisitar pós-MVP:**
- A3 — **Quebra conhecida em cliente recorrente**: cadeia `previous_lead_id` cobre primeira recompra mas hist-órico se fragmenta com múltiplas. Se padrão recorrente virar comum (imobiliária, B2B SaaS), migrar pra modelo Deal+Contact em release planejada — custo: migração de schema com lead em produção.
- A4 — Estágios renomeáveis: adicionar/remover stages e múltiplas pipelines ficam pra v2.
- A6 — Captain: decidir cortar vs manter após M4 quando Manu maduro. Se Manu cobrir 100% dos casos do Captain, cortar; senão decidir convivência.
- P1 — Float position: migrar pra lexorank quando começar a degradar.
- P2 — Cache de flag: no momento do deploy multi-tenant, implementar invalidação per-account via `Rails.cache` com chave por account (não pub/sub global).
- D6 — **Spam/bots viram Lead**: auto-create por canal não filtra ruído. Mitigação MVP: confiar nos filtros do Chatwoot (anti-spam de inbox). Pós-MVP: regra "só cria Lead se mensagem inicial não-vazia + canal verificado". Revisitar se Kanban encher de lixo.
- D7 — **Risco regulatório de Manu sem disclosure (LGPD + futuras leis de IA)**: assumido conscientemente. Revisitar pós-M4 se reclamação ou exigência legal aparecer. Plano de recuperação: adicionar chip "AI" opcional como flag por account em release de manutenção (mudança UI pequena, sem schema).
- D9 — **Enriquecimento via AI**: re-planejar como **M5 — Lead Intelligence** quando M2 fechar. Dependência de Brain maduro + LGPD + latência + custo.
- **D11 — Drag-by-keyboard pós-MVP**: cortado do M1 (F4 + C4). `vuedraggable-next` não suporta de forma confiável e WAI-ARIA 1.1 deprecou primitivos. Fallback no MVP: menu ⋮ do card → "Mover para…" → modal. Roadmap pós-MVP: substituir `vuedraggable-next` por solução com primeira-classe drag-by-keyboard (ex: `dnd-kit` ou implementação custom com `aria-keyshortcuts`).
- **C1 — Race "Fechado durante criação"**: mitigado por advisory_lock + unique index (defesa em profundidade). Se o lock falhar em algum cenário não previsto, unique index ainda evita duplicidade — pode resultar em Lead pareado sem `previous_lead_id`, ficando como dívida de auditoria. Monitorar via log estruturado.
- **C2 — Spam de cliente recorrente**: janela de debouncing 7 dias default (configurável por `Stage.reopen_window_days`). Se padrão de uso indicar que 7 dias é curto/longo demais, ajustar default na config do account. Edge case extremo: contato manda 1 mensagem por dia exatamente — pode ficar em loop de "reabrir mesmo Lead" sem nunca virar `previous_lead_id` chain. Aceitável (1 Lead vivo é melhor que 30 Leads em "Novo").
- **C3 — Cache stale**: `cache_key_with_version` resolve invalidação atômica. Edge case: `Pipeline.touch` chamado em massa (ex: backfill) invalida cache de todos os accounts simultaneamente → reload N+1. Aceitável fora de hot path operacional.
- **P1 — Listener stateless**: regra documentada como ADR no engine (`engines/algorythmo/docs/adr/0001-listener-stateless.md`). Engineer agent deve recusar PR que viole.
- **P2 — Cursor pagination obrigatória no Kanban**: documentado em A.11. Engineer agent recusa PR que usa offset em endpoint de listagem de Leads.
- **P3 — Empty state focus**: empty state inicial linka pra `/settings/inboxes/new`. Tab natural deve entrar no link, testado em Playwright.

**Restam em aberto para M3-M4-M5 (próximo `/plan-eng-review`):**
- Retrieval do Brain: pgvector vs vector DB externo. Embeddings via LLM do cliente vs modelo local pequeno.
- Estrutura de "ajustes do cliente" (texto livre vs blocos estruturados).
- Limites de tamanho/quota do Brain por cliente.
- BYOK providers dia 1 (ChatGPT só vs multi).
- Política de fallback quando LLM externa cai.
- Latência aceitável Manu, UX de "digitando...".
- Chip de contexto CRM dentro da conversa (mitigação ADR-0004).
- Escalation humano ↔ AI: gestos exatos no painel ("Assumir" / "Devolver pra Manu").
- UI exata do card "Manu sugere [ação]" e da inbox "Aprovações pendentes" (D8).
- **M5 — Lead Intelligence** (D9): fontes, LGPD, latência, UX de "enriquecendo", trigger, custo por Lead.

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

- [ ] A.1 — Migration: `algorythmo_pipelines` (id, account_id, name, created_at, **updated_at — F3/C3 cache_key_with_version**), `algorythmo_stages` (id, pipeline_id, name, position, kind:enum {open, won, lost}, **aging_coefficient float default 1.0** — D10, **updated_at — F3/C3**), `algorythmo_leads` (id, account_id, contact_id FK, stage_id FK, position float, previous_lead_id, **channel_origin string, channel_metadata jsonb** — D6, **stage_entered_at timestamp** — D10, **closed_at timestamp** — C2 debouncing, **last_message_at timestamp** — C2 debouncing, custom_fields jsonb). **Índices (F8): (1) partial unique `(contact_id, account_id) WHERE stage_id IN (SELECT id FROM algorythmo_stages WHERE kind='open')` — idempotência DB-level F2; (2) `(stage_id, stage_entered_at DESC)` — aging signal ordering; (3) `(account_id, stage_id, position)` — Kanban list pagination.** Migration retro-popula `stage_entered_at = created_at` em Leads existentes (vazio no greenfield, mas seguro pra sync upstream).
- [ ] A.2 — Seed: 1 pipeline default por account com 5 stages (Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido), **com `aging_coefficient` default por stage (D10): Novo 1.0, Qualificado 4.0, Proposta 7.0, Fechado ganho/perdido 0.0 (sem alerta).** `algorythmo_show_captain` ainda `false`.
- [ ] A.3 — Models `Algorythmo::Pipeline`, `Algorythmo::Stage`, `Algorythmo::Lead` com validations (name presence, stage_required, kind enum).
- [ ] A.4 — `Lead#move_to_stage(stage)`: persistência + recalcula `position` (float) + **atualiza `stage_entered_at` pra `Time.current` (D10 — zera relógio de aging ao mover)**. Edge: stage inexistente → erro.
- [ ] A.5 — `Lead#reopen_as_new_lead`: cria novo Lead com `previous_lead_id`, só executável em Lead em stage `kind=:won` ou `:lost`.
- [ ] A.6 — `Stage#rename(new_name)`: validação não-vazio + não-duplicado no pipeline.
- [ ] A.6b — **`Stage#update_aging_coefficient(coef)` (D10):** valida `coef ≥ 0` (float). Persistir. Endpoint `PATCH /api/v1/stages/:id` aceita `aging_coefficient`.
- [ ] A.7 — `LeadsController` (CRUD + `PATCH /api/v1/leads/:id/move` + `POST /api/v1/leads/:id/reopen`).
- [ ] A.8 — `StagesController#rename` (`PATCH /api/v1/stages/:id/rename`).
- [ ] A.9 — **`Algorythmo::CrmListener` + `Algorythmo::AsyncDispatcher` (D6 + F1 + F3).**
  - **F1 — reuso do extension point existente:** criar `Algorythmo::CrmListener.instance < BaseListener` (singleton) com método `message_created(event)`. Criar `Algorythmo::AsyncDispatcher` (módulo) que adiciona `Algorythmo::CrmListener.instance` à lista de `listeners`. Instalar via `AsyncDispatcher.prepend_mod_with('AsyncDispatcher')` em `engines/algorythmo/lib/algorythmo/engine.rb` — extension point do Chatwoot Enterprise, sem patch destrutivo.
  - **C1 — filtro de message_type:** listener executa lógica APENAS se `message.message_type == 'incoming'` AND `message.sender.is_a?(Contact)` AND `message.conversation.contact_id.present?`. `activity` / `template` / `outgoing` retornam imediatamente. Mensagem de `User` sender (ex: agente) ignorada.
  - **C1 — advisory lock:** envelopar a criação em `Lead.with_advisory_lock("crm:create_lead:contact_#{contact_id}") do ... end` — serializa por `contact_id` no Postgres, elimina race "Fechado durante criação" antes do unique index entrar em ação.
  - **F2 + idempotência:** dentro do lock, `Lead.where(contact_id: ..., account_id: ..., stage: open_stages).first` decide reuso. Se vazio, `Lead.create!(...)` rescues `ActiveRecord::RecordNotUnique` retornando o Lead existente (defesa em profundidade contra qualquer hole do lock).
  - **C2 — janela de debouncing (F5 revisado):** se contato tem Lead em `kind ∈ {won, lost}` E `last_message_at >= 7.days.ago`, **reabre o Lead existente** (`stage = "Novo"`, `stage_entered_at = Time.current`, `closed_at = nil`) em vez de criar novo. Fora da janela (`> 7.days`), cria novo Lead em "Novo" com `previous_lead_id` apontando pro fechado. Janela configurável por `Stage` (`reopen_window_days`, default 7).
  - **F3 + C3 — cache de Pipeline/Stage:** `Algorythmo::Pipeline.cached_default_for(account)` usa `Rails.cache.fetch("algorythmo:pipeline:default:#{account.id}/#{pipeline.cache_key_with_version}", expires_in: 1.hour)`. Invalidação automática via `updated_at` do Pipeline/Stage (Rails padrão). Reduz 4 queries → 1 hot path do listener.
  - **Metadata grátis do canal:** captura `name` (do perfil), `channel_origin` (whatsapp/email/instagram/widget/api), `channel_metadata` (jsonb com handle, número, domínio email, foto URL conforme canal). Sem chamadas externas.
  - **P1 — listener stateless:** **PROIBIDO `@ivar` em `CrmListener`.** Singleton + Sidekiq multi-thread = state poisoning. Toda computação resolvida via parâmetros locais ou cache `Rails.cache`. Documentar regra como ADR no engine.
  - **Marcação:** `# algorythmo: auto-create-lead-d6` em pontos de inserção do listener e da extensão do AsyncDispatcher.
- [ ] A.10 — **RSpec ≥90% nos arquivos novos do listener.** Cobertura obrigatória:
  - **Tipos de mensagem (C1):** `incoming` + sender=Contact cria; `outgoing` não cria; `activity` não cria; `template` não cria; sender=User não cria.
  - **Idempotência (F2):** contato com Lead aberto retorna existente; contato sem Lead aberto cria.
  - **Concurrency (F7):** 50 threads criando Lead pro mesmo `contact_id` em paralelo → exatamente 1 Lead (combinação advisory_lock + unique index).
  - **C2 debouncing:** contato com Lead `won`/`lost` com `last_message_at < 7d` → reabre Lead existente (NÃO cria novo). Mesmo contato com `last_message_at > 7d` → cria novo Lead com `previous_lead_id`.
  - **Cadeia previous_lead_id:** A → B → C, cada um aponta pro anterior, histórico preservado.
  - **Spam guard:** mesmo contato manda 30 mensagens em 30 dias após Lead won → exatamente 1 Lead reaberto (dentro da janela), não 30.
  - **Cache (F3):** primeiro hit faz N queries, segundo hit serve do cache; após `Stage#rename` ou `update_aging_coefficient`, `cache_key_with_version` muda e cache vira null.
  - **Listener stateless (P1):** asserção que `CrmListener.instance.instance_variables` não cresce entre invocações.
  - **Canal sem `contact_id`** (anônimo) → não cria Lead, loga warning (não estoura).
- [ ] A.11 — **`LeadsController` paginação por cursor (P2).** `GET /api/v1/accounts/:id/leads?stage_id=X&cursor=Y&limit=50` usa cursor pagination (cursor = `(position, id)` tuple) em vez de `offset`. Garante uso do índice `(account_id, stage_id, position)` sem seq scan em colunas grandes. Documentar no PR que offset pagination está proibida no Kanban (perf regression).

#### Trilha B (frontend, após A merged)

- [ ] B.1 — Rota nova `/app/accounts/:id/crm` no Vue router (arquivo novo, zero colisão upstream).
- [ ] B.2 — Item "CRM" no sidebar (`app/javascript/dashboard/components/layout/Sidebar.vue`, marcação `// algorythmo: feature-gate algorythmo_crm`).
- [ ] B.3 — `CrmKanban.vue` (componente novo): 5 colunas, lista Leads via API, drag-and-drop (vuedraggable-next), header com título "CRM", busca por nome/canal, botão "Configurar pipeline".
- [ ] B.4 — **`LeadCard.vue` conforme anatomia D5 + D10:** nome (sup esquerdo), canal de origem com ícone (linha 2), **chip colorido `LeadAgingChip.vue` (verde/amarelo/vermelho via ratio `time_in_stage / (12h * aging_coefficient)`) + tempo nesta etapa** (linha 3, formato "12 min" / "2d 4h" / "3 sem"), menu ⋮ on-hover (editar, reabrir se fechado). Click no card abre `LeadDetailDrawer.vue`.
- [ ] B.4b — **`LeadAgingChip.vue` (D10 + F6):** componente isolado. Props: `secondsInStage`, `agingCoefficient`. Computed `indicator`:
  ```ts
  // F6 — guarda explícita ANTES de qualquer divisão
  if (agingCoefficient === 0 || agingCoefficient == null) {
    return { color: 'neutral', glyph: null, label: formatTime(secondsInStage) };
  }
  const ratio = secondsInStage / (12 * 3600 * agingCoefficient);
  if (ratio < 1) return { color: 'green', glyph: '●', label };
  if (ratio < 2) return { color: 'yellow', glyph: '◐', label };
  return { color: 'red', glyph: '○', label };
  ```
  Cobertura ≥90% (composable puro). Snapshot tests dos 4 estados (neutral, green, yellow, red). Teste explícito `coef === 0 → no division`.
- [ ] B.5 — `LeadDetailDrawer.vue`: drawer lateral com dados completos do Lead (nome, contatos, canal, histórico de estágios com timestamps, conversas vinculadas, observações). Editar inline.
- [ ] B.6 — Tela `PipelineConfig.vue` (`/app/accounts/:id/crm/pipeline`): inline rename de stage, **input numérico por stage pra `aging_coefficient` (D10) com label "Tempo médio aceitável neste estágio" + preview da escala (verde até X / amarelo até Y / vermelho após Z)**, validação client-side.
- [ ] B.7 — **Botão "Vincular esta conversa a outro Lead" (exceção D6)** no header da conversa (`ConversationHeader.vue`, marcação `// algorythmo: feature-gate algorythmo_crm`). Modal de busca de Lead existente. Substitui o antigo "Criar lead" — Lead já existe via auto-create.
- [ ] B.8 — **Empty states e loading (passada 2 do design review + D11):** `LeadEmptyState.vue` global com copy fixo "Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais. **Conecte um canal agora →**" linkando pra `/app/accounts/:id/settings/inboxes/new`. Empty por coluna com texto sutil "Nenhum Lead aqui". Skeleton cards durante fetch. Toast em erro de drag (rollback + retry).
- [ ] B.9 — Vitest ≥75% (arquivos de interação) + ≥90% (composables/store). Inclui mock de drag-and-drop.
- [ ] B.10 — Playwright cenários M1 (mensagem widget → Lead auto-criado em "Novo" <2s + drag entre colunas + persistência + reabrir + idempotência + vincular conversa a outro Lead).
- [ ] B.11 — **A11y keyboard navigation (D11 escopo reduzido — F4 + C4):** Kanban responde a Tab (move foco sequencial entre colunas e cards), Enter no card (abre drawer), Esc no drawer (fecha). **Drag-by-keyboard cortado do MVP** — `vuedraggable-next` não suporta de forma confiável e WAI-ARIA 1.1 deprecou `aria-grabbed`/`aria-dropeffect`. Fallback documentado pra usuário keyboard-only: usar menu ⋮ do card (acessível via Enter no foco do menu) → opção "Mover para…" → modal de stage select. Implementar via composable `useKanbanKeyboardNav.ts`. Cobertura ≥90% (composable puro). Empty state foca no link "Conecte um canal agora" via Tab natural (P3) — teste Playwright explícito.
- [ ] B.12 — **A11y screen reader (D11):** `aria-label` em cada card ("Lead João Silva, etapa Novo, há 12 minutos, canal WhatsApp"), `aria-live="polite"` em região da timeline anuncia transições ("Lead João movido de Novo pra Qualificado"), drawer com `role="dialog"` + `aria-labelledby` + focus trap. Validar com VoiceOver (macOS) + NVDA (Windows) em smoke manual antes de mergear.
- [ ] B.13 — **A11y dual-coding daltonismo (D11):** `LeadAgingChip.vue` recebe prop `colorblindMode` (default `true`) e renderiza glyph (`●` verde / `◐` amarelo / `○` vermelho) ao lado do indicador colorido. Garantir contraste WCAG AA (≥4.5:1) entre texto do card e fundo da coluna em ambos os temas (light/dark) — validado via DevTools contrast checker em M1.
- [ ] B.14 — **A11y CI gate:** integrar `@axe-core/playwright` na suite Playwright. Cenário axe em `/app/accounts/:id/crm` retorna **zero violations** de severidade `critical` ou `serious`. Falha de CI bloqueia merge.

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
| `/plan-eng-review` (round 1) | 2026-05-22 manhã | Opus 4.7 (eng manager mode) + adversarial agent | **APPROVED_WITH_REVISIONS** |
| `/plan-design-review` | 2026-05-22 tarde | Opus 4.7 (designer mode, text-only) | **APPROVED_WITH_REVISIONS** |
| `/plan-eng-review` (round 2 — foco D6+D10+D11) | 2026-05-22 noite | Opus 4.7 (eng manager mode) + adversarial agent round 2 | **APPROVED_WITH_REVISIONS** |

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

### `/plan-design-review` 2026-05-22 — Detalhe

**Escopo revisado:** Kanban + Manu (telas novas). Rebrand e design system passaram por revisão lateral mas não foram alvo desta passada.

**Modo de execução:** text-only review. Designer mode com geração de mockups via gstack designer (`openai sk-`) ficou indisponível porque o founder usa chave Gemini. Compensado com diagnóstico rigoroso por passada (anatomia, hierarquia, estados, fluxo, microinterações, copy, a11y) e fix-to-10 explícito.

**Decisões fixadas (7 novas):** D5, D6, D7, D8, D9, D10, D11. Tabela §2.2.

- **D5 (anatomia do card — pessoa-first compacto):** founder especificou layout (nome sup-esquerdo, canal abaixo, tempo na etapa, menu ⋮ on-hover, click abre drawer). Sem valor monetário (Lead = pessoa, A3). Componente `LeadCard.vue` em §10 B.4 + `LeadDetailDrawer.vue` em B.5.
- **D6 (auto-create de Lead por canal):** mudança fundadora de modelo de produto. Lead nunca é criado por humano ou agente AI; nasce ao chegar mensagem no canal conectado. Idempotente. Botão "Criar lead a partir desta conversa" vira "Vincular conversa a Lead existente" (exceção). Subscriber `MessageCreated` em §10 A.9, edge cases em A.10. Risco spam/bots registrado §7 com mitigação MVP (filtros existentes do Chatwoot).
- **D7 (Manu indistinguível, sem disclosure AI):** founder optou **contra recomendação de transparência**. Risco regulatório (LGPD + futuras leis de IA brasileiras) e de marca (lead descobrir) **assumidos conscientemente**. Plano de recuperação em §7: chip "AI" opcional como flag por account em release de manutenção, mudança UI pequena sem schema. Revisitar pós-M4.
- **D8 (ações Manu no CRM — híbrido por stakes):** auto pra baixo risco (anotar, qualificar, marcar tag), aprovação humana pra alto risco (Proposta, Fechado, deal com valor, reabrir Lead). UI: card "Manu sugere [ação]" na timeline + inbox "Aprovações pendentes". Audit log de toda ação Manu. §3 M4 atualizado.
- **D9 (enriquecimento — minimal MVP, completo em M5):** MVP captura só metadata grátis dos canais. Novo marco **M5 — Lead Intelligence** criado em §3 para conter visão de enriquecimento via AI/APIs externas. Decisões abertas (fontes, LGPD, latência, UX, custo, trigger) listadas em §7. Razão: depende de Brain maduro + decisões LGPD que ainda não temos contexto pra tomar bem.
- **D10 (sinalização de Lead parado — cor + tempo, escala adaptável):** banda base 0-12h verde / 12-24h amarelo / 24-36h vermelho com coeficiente multiplicador por etapa (defaults Novo 1x, Qualificado 4x, Proposta 7x, Fechado 0x sem alerta), customizável pelo cliente em `PipelineConfig.vue`. Migration A.1 adiciona `aging_coefficient`, `stage_entered_at`. Componente `LeadAgingChip.vue` isolado em B.4b. Transforma Kanban de visualização em radar de gargalo.
- **D11 (a11y baseline no MVP):** Kanban e Manu nascem acessíveis — keyboard nav completa, screen reader com `aria-live`, dual-coding de daltonismo no chip de aging, contraste WCAG AA, axe-core como gate de CI. Custo aceito ~2-3 dias extra em M1. Tarefas B.11-B.14 em §10. Empty state inicial fixo ("Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais. Conecte um canal agora →").

**Resumo das 7 passadas de design:**

| Passada | Status inicial | Após decisões | Comentário |
|---|---|---|---|
| 1. Anatomia & hierarquia (LeadCard) | 4/10 (genérico, "Untitled Lead", sem identidade) | 9/10 | D5 trava layout pessoa-first. Falta visual polish do designer (worktree D). |
| 2. Estados & feedback (empty/loading/error) | 3/10 (sem empty, sem skeleton, sem rollback) | 8/10 | D11 + B.8 cobrem empty/skeleton/toast. Empty state com copy fixo de canal. |
| 3. Fluxo & navegação (auto-create vs manual) | 5/10 (fluxo manual implícito) | 10/10 | D6 reescreve o modelo. Lead nasce do canal, painel só consome. |
| 4. Microinterações & motion (drag, aging) | 4/10 (drag sem feedback, sem aging) | 9/10 | D10 + drag visual em B.3/B.4. Animação fica no design system D. |
| 5. Copy & tom (CTAs, status, vazios) | 5/10 (frases genéricas, "Nenhum lead encontrado") | 8/10 | Empty state fixo + microcopy em B.7/B.8. Restante passa pelo designer. |
| 6. Manu signaling & ações (D7+D8) | 6/10 (decisão pendente) | 8/10 | D7 + D8 fixos. UI exata do card de aprovação fica em re-plan M4. |
| 7. A11y (keyboard, SR, daltonismo) | 2/10 (zero a11y considerada) | 9/10 | D11 + B.11-B.14 cobrem baseline. WCAG AA + axe gate. |

**Outside voice (founder decisions overriding recommendation):**
- **D7 (Manu sem disclosure):** designer recomendou disclosure (chip "AI" + texto no widget). Founder manteve contra recomendação. Risco regulatório + marca registrado §7 como aceito conscientemente. Plano de recuperação rápido se exigência legal aparecer.
- **D9 (enriquecimento minimal):** founder optou por adiar mesmo querendo enriquecimento como funcionalidade. Decisão correta de scoping pra evitar travar MVP em decisões LGPD prematuras. Novo M5 criado.

**Implementation Tasks atualizadas:** §10 ganhou A.6b (`Stage#update_aging_coefficient`), A.9 (reescrita pra subscriber `MessageCreated`), A.10 (edge cases auto-create), B.4 (anatomia D5+D10), B.4b (`LeadAgingChip.vue`), B.5 (`LeadDetailDrawer.vue`), B.6 (`PipelineConfig.vue` com input de aging), B.7 (botão "Vincular" substituindo "Criar lead"), B.8 (empty state fixo D11), B.11-B.14 (a11y D11).

**Riscos residuais (additivos aos 3 do eng-review):**
4. **D7 (Manu sem disclosure)** — risco regulatório LGPD + futuras leis de IA brasileiras. Founder aceitou. Plano de recuperação rápido em release de manutenção se necessário.
5. **D6 spam/bots** — auto-create vai criar Lead pra mensagem de spam. Mitigação MVP confia nos filtros do Chatwoot. Revisitar se Kanban encher de lixo.
6. **Designer worktree D pendente** — visual polish (cores, tipografia editorial, motion, dark mode) ainda não materializado. Plano vivo: trilha D em paralelo a A/C, com `DESIGN.md` como entregável.

**VERDICT:** APPROVED_WITH_REVISIONS — pronto para despachar M0. Decisões D5-D11 incorporadas ao plano. Como D6 mudou o modelo de produto (auto-create por canal) e D11 adicionou ~2-3 dias em M1, recomendo rodar **novo `/plan-eng-review`** antes de despachar M1 (Trilhas A/B) pra revalidar tarefas A.9 (subscriber `MessageCreated`), A.10 (edge cases), B.11-B.14 (a11y) com lente de eng manager. M0 pode despachar agora — não foi tocado por esta passada.

### `/plan-eng-review` round 2 — 2026-05-22 noite

**Escopo focado:** validação de A.9, A.10, A.6b, B.4b, B.11-B.14 (mudanças trazidas pelo `/plan-design-review`: D6 auto-create de Lead por canal, D10 aging signal com coeficiente por etapa, D11 a11y baseline). M0 não foi alvo (já validado round 1).

**Decisões fixadas (F1-F8 + C1-C4 = 12 novas):**

- **F1 — Reuso do extension point Chatwoot:** `Algorythmo::CrmListener.instance < BaseListener` (singleton) instalado via `AsyncDispatcher.prepend_mod_with('AsyncDispatcher')`. Mecanismo já usado pela edição Enterprise do Chatwoot — sem patch destrutivo do core. Alternativa "subscriber custom paralelo" descartada por duplicar infra de Wisper já existente.
- **F2 — Idempotência DB-level:** partial unique index `(contact_id, account_id) WHERE stage_kind='open'` + `rescue ActiveRecord::RecordNotUnique` na criação. Defesa contra race + atomicidade real garantida pelo banco.
- **F3 — Cache memoizado de Pipeline/Stage:** `Rails.cache.fetch` com `cache_key_with_version` (invalidação automática via `updated_at`). Reduz 4 queries → 1 no hot path do listener.
- **F4 — A11y parcial no MVP:** drag-and-drop fica mouse-only. Keyboard nav cobre Tab + Enter + Esc. Drag-by-keyboard removido do escopo (vuedraggable-next não suporta de forma confiável, WAI-ARIA 1.1 deprecou primitivos). Fallback: menu ⋮ → "Mover para…" — registrado pós-MVP.
- **F5 — Reabertura via mensagem (revisado por C2):** contato com Lead `won/lost` mandando nova mensagem dentro da janela de 7 dias **reabre o Lead existente**; fora da janela cria novo Lead com `previous_lead_id`. Janela configurável por stage.
- **F6 — LeadAgingChip guarda explícita:** `if (agingCoefficient === 0 || == null) return neutral`. Teste explícito cobrindo coef=0 sem divisão.
- **F7 — Test plan gate:** 5 cenários E2E canal-first (WhatsApp/Email/Instagram/widget x2/reabertura) + concurrency test 50 threads + axe-core gate em CI reprovando `critical`/`serious` WCAG AA.
- **F8 — 3 índices na migration M1:** (1) partial unique `(contact_id, account_id) WHERE stage_kind='open'` — idempotência; (2) `(stage_id, stage_entered_at DESC)` — aging signal; (3) `(account_id, stage_id, position)` — Kanban list pagination.

**Adversarial review round 2 — 3 buracos achados:**

- **C1 — Race "Fechado durante criação":** unique index sozinho não cobre. Thread A insere `open`, humano fecha → vira `won`. Thread B passa unique check porque A não é mais `open` → cria segundo Lead sem `previous_lead_id` chain. **Resolução:** `with_advisory_lock("crm:create_lead:contact_#{contact_id}")` serializa por contato + filtros explícitos `message_type=='incoming' && sender.is_a?(Contact)` (activity/template/outgoing/User-sender ignorados). Defesa em profundidade: lock + index.
- **C2 — Spam de cliente recorrente destrói Kanban:** sem janela de debouncing, cliente B2C recorrente respondendo newsletters mensais abre 1 Lead/dia → 30 Leads em 30 dias. **Resolução:** janela de 7 dias default (configurável por stage). Dentro da janela reabre Lead existente; fora cria novo com `previous_lead_id`.
- **C3 — Cache stale em rename / aging_coefficient update:** `Rails.cache.fetch` com TTL 1h serve nome antigo de stage por até 60 min após rename — quebra critério #3 do M1 (rename persiste) e #6 (a11y screen reader anuncia nome correto). Founder ajustando coef não vê efeito por 1h. **Resolução:** `cache_key_with_version` baseado em `pipeline.updated_at` (Rails padrão, sem callback custom). Invalidação atômica em update.

**3 preocupações não-bloqueantes aceitas (P1+P2+P3):**

- **P1 — Listener stateless por contrato:** singleton + Sidekiq multi-thread = risco de state poisoning se algum `@ivar` cachear request data. Regra documentada como ADR no engine.
- **P2 — Cursor pagination obrigatória no Kanban:** offset pagination em Lead listing → seq scan quando coluna > 5k. A.11 documenta cursor `(position, id)` tuple usando índice `(account_id, stage_id, position)`.
- **P3 — Empty state focus:** Tab natural deve entrar no link "Conecte um canal agora" do empty state. Teste Playwright explícito em B.11.

**Cenário perverso documentado ("what I'd lose sleep over"):** combinação F1+F3+F5+C1 em campanha de email com 200 contatos respondendo em 10 min → Sidekiq queue `:critical` enche → jobs atrasam 30s → founder fecha manualmente Leads "fantasma" enquanto novos jobs chegam → sem advisory_lock, sem debouncing, sem cache_key_with_version: 150 Leads duplicados, audit corrompido, founder perde confiança na primeira semana. **As 4 mitigações (advisory_lock + debouncing + cache versioning + concurrency test) defendem esse cenário em quatro camadas.**

**Outside voice — adversarial-reviewer Opus 4.7 (round 2):**
- Verdict: REQUEST CHANGES.
- 3 críticos (C1, C2, C3) → resolvidos.
- 3 preocupações (P1, P2, P3) → aceitas.
- 2 itens que passaram (`LeadAgingChip` guard F6 e índice aging F8) confirmados sem alteração.
- 1 cenário perverso documentado acima.

**Implementation Tasks atualizadas:** §10 ganhou:
- A.1 com 3 índices F8 + colunas `closed_at`/`last_message_at` (C2 debouncing).
- A.9 reescrita com F1 (`prepend_mod_with`) + C1 (advisory_lock + filtros) + F2 (rescue NotUnique) + C2 (janela 7d) + F3/C3 (cache_key_with_version) + P1 (stateless).
- A.10 reescrita com 9 categorias de cobertura (incl. concurrency 50 threads + spam guard + cache versioning + stateless assertion).
- A.11 (nova) — cursor pagination obrigatória (P2).
- B.4b com guarda explícita coef=0 (F6) + snapshot dos 4 estados.
- B.11 escopo reduzido (drag-by-keyboard cortado, P3 empty state focus adicionado).

**Test plan artifact:** `~/.gstack/projects/FocusOnTheProgress-algorythmo-platform/gusta-algorythmo-main-eng-review-test-plan-20260522.md` (atualizado nesta passada — cobre 5 cenários canal-first, edge cases por categoria, axe-core gate, checklist manual a11y).

**Riscos residuais (additivos aos 6 anteriores):**
7. **C2 edge case 1-mensagem-por-dia exata:** contato em loop pode ficar reabrindo o mesmo Lead indefinidamente sem nunca virar `previous_lead_id` chain. Aceito (1 Lead vivo > 30 Leads em "Novo"). Métrica futura: alertar quando algum Lead tiver `reopen_count > 10`.
8. **Sidekiq queue contention:** `:critical` é compartilhada com 9 outros listeners do Chatwoot. Pico de mensagens pode atrasar `CrmListener` em segundos. Monitorar via dashboard pós-piloto; criar queue dedicada `:algorythmo_crm` se latência > 5s p95.
9. **Drag-by-keyboard pós-MVP:** D11 baseline aceito como parcial (F4 + C4). Roadmap: avaliar substituição de `vuedraggable-next` por `dnd-kit` (suporte primeira-classe) ou implementação custom com `aria-keyshortcuts`.

**VERDICT:** APPROVED_WITH_REVISIONS — pronto para despachar **M0 E M1**. Decisões F1-F8 + C1-C4 + ajuste D11 incorporadas. Não há blockers remanescentes. Próximo `/plan-eng-review` agendado para após M2 fechar (foco M3 Brain + M4 Manu + M5 Lead Intelligence).

---

## Round 3 — Decisões Arquiteturais (post-adversarial-review)

**Contexto:** M0 foi commitado em `algorythmo/m0-foundation` (5e1a1347a). O adversarial-reviewer não apontou bugs de código, mas duas **decisões de arquitetura** que vão se amplificar em M1-M5 e custar caro depois. Decididas agora pelo planner antes de o engineer continuar.

### Decisão 1 — Estratégia de Rebrand: **Recomendação B (Overlay-First + Inline com Tag onde não dá)**

**Investigação concreta (números reais do repo, 2026-05-22).**

| Surface | Localização | Hits "Chatwoot" | Mecanismo de overlay disponível? | Custo overlay |
|---|---|---|---|---|
| Dashboard i18n | `app/javascript/dashboard/i18n/locale/*` | **445 em 200 arquivos** (40 idiomas × ~5 namespaces) | **SIM — já existe**: `deepMerge` em `app/javascript/dashboard/i18n/index.js` + `engines/algorythmo/app/javascript/i18n/overrides/{en,pt_BR}.json` | LOW (estendido) |
| Widget i18n | `app/javascript/widget/i18n/locale/*` | **54** (1 por idioma — só `POWERED_BY`) | **SIM — mesmo padrão**: `widget/i18n/index.js` linhas 1-83 é estrutura idêntica ao dashboard, basta replicar o `deepMerge` | LOW |
| Survey i18n | `app/javascript/survey/i18n/locale/*` | **53** (1 por idioma — `POWERED_BY`) | **SIM — mesmo padrão** | LOW |
| Liquid mailers admin | `app/views/mailers/administrator_notifications/**` | **8 hits em 3 arquivos** (`account_deleted`, `account_deletion_*`) | **SIM — view path priority**: Chatwoot já usa `config.paths['app/views'].unshift('enterprise/app/views')` em `config/application.rb:49`. Engine pode adicionar `engines/algorythmo/app/views` ao topo do view_path e sobrescrever arquivo-por-arquivo. | LOW-MED |
| Layout base mailer | `app/views/layouts/mailer/base.liquid:95` | 1 hit (`brand_name = 'Chatwoot'` fallback) | **NÃO PRECISA**: fallback só é atingido se `BRAND_NAME` env estiver vazio. `.env.example:288` já define `BRAND_NAME=Algorythmo OS`. **Comportamento já correto sem ação.** | ZERO |
| Conversation reply mailer (HTML) | `app/views/mailers/conversation_reply_mailer/*.html.erb` | 3 hits (referências internas, não user-visible — usam helper de branding) | **VERIFICAR caso a caso**: a maioria é `brand_name`/`{{global_config['BRAND_NAME']}}`. Se for literal, overlay via view path. | LOW |
| Devise mailer | `app/views/devise/mailer/confirmation_instructions.html.erb` | 1 hit | **SIM — view path priority** (mesmo mecanismo) | LOW |
| Vue v3 signup | `app/javascript/v3/views/auth/signup/Index.vue:14` — `installationName === 'Chatwoot'` | 6 hits (lógica que esconde layout em instalações não-Chatwoot) | **PRECISA inline** com tag: a checagem é lógica, não string visível. Inverter pra `!== 'Chatwoot'` ou remover o branch quando inst.name vira `'Algorythmo OS'`. | LOW (inline) |
| Hardcoded em components | `Code.vue`, `Widget.vue`, `CampaignEmptyStateContent.js`, `Sidebar.vue`, `SidepanelSwitch.vue`, `CopilotLauncher.vue`, MFA wizards, helpcenter `Header`, `useBranding.js`, `Branding.vue`, etc. | **88 hits em 31 arquivos** (literais em template/script — boa parte já tagueada `// algorythmo: rebrand-m0` em M0) | **PARCIAL**: `useBranding()` em `app/javascript/shared/composables/useBranding.js` já tem `replaceInstallationName(text)` que substitui `Chatwoot` → `installationName` em runtime. **Pode ser estendido pra cobrir 80% das strings via composable em vez de search-replace**, mas exige PR refatorando call sites. | MED (refatorar) |
| Assets (logo, favicon, PWA) | `public/manifest.json:2-3`, `public/brand-assets/*` | 2 no manifest + assets binários | **PARCIAL**: manifest é JSON estático servido por Rails; sobrescrever via view path do engine ou serve via controller. Logos: M0 já tem `public/algorythmo-assets/{algorythmo-logo,algorythmo-favicon}.svg` mas `BRAND_URL`/`LOGO`/`LOGO_THUMBNAIL` env vars já apontam pra eles. **manifest.json continua hardcoded — gap.** | LOW (1 PR pra manifest dinâmico) |
| Super admin views | `app/views/super_admin/**` | 16 hits | **NÃO COBRIR**: super_admin é tela interna do operador da plataforma (founder), não cliente PME. Decisão M0 implícita: aceito. Tagueado `# algorythmo: super-admin-internal` se algum dia mexer. | ZERO (skip) |
| Mobile app | fora deste repo | N/A | Fora do escopo MVP (§7). | ZERO |

**Surfaces críticos de cliente final ainda descobertos = 3 grupos: widget (54), survey (53), liquid admin mailers (8). Total ~115 strings em 40+ idiomas, todos endereçáveis por mecanismo já provado no codebase.**

**Avaliação das 3 opções:**

**Recomendação A — Overlay-everywhere.**
- Custo: ~1.5-2 dias de engenharia adicional em M0.5 (PR único, mecanicamente repetível). Replica `deepMerge` pra widget+survey (2h cada × debug = 1 dia), monta view_path do engine pra mailers liquid (2h), monta manifest.json dinâmico via controller (3h), refatora os ~88 hits inline pra usar `useBranding().replaceInstallationName()` onde fizer sentido (1 dia).
- Benefício de décadas: **zero merge conflict de upstream em surface de branding pelos próximos 10 anos**. Quando Chatwoot adicionar 200 strings novas com "Chatwoot" em widget pt_BR, nosso overlay continua válido — só completa as chaves novas no `pt_BR.json` overlay se quisermos cobrir.
- Riscos: 4 mecanismos diferentes (i18n deepMerge × 3 + view_path Rails) — superfície de testes maior.

**Recomendação B — Overlay onde possível + Inline com tag + soft-fork-zone explícita.** ← **ESCOLHIDA**
- Aplicar overlay nos 3 grupos descobertos (widget i18n, survey i18n, mailers liquid via view_path) — todos têm mecanismo zero-cost já provado no Chatwoot/engine.
- Tornar `manifest.json` dinâmico via controller que lê `BRAND_NAME`/`INSTALLATION_NAME` (decisão estrutural, não inline tag).
- Aceitar inline-com-tag para: (a) lógica que checa marca (signup `installationName === 'Chatwoot'`), (b) hardcoded em componentes que não podem ser i18n-izados sem reescrever (Code.vue codepen title, Campaign empty state, etc.).
- **Soft-fork-zone explícita** (lista no engine README, ~10-15 arquivos máximo): "estes arquivos vão dar merge conflict toda vez que upstream mexer. Aceito conscientemente porque overlay custaria mais que conflict mensal manual."
- Custo: ~1.5 dias em M0.5 (replicar overlay nos 3 grupos + manifest dinâmico + lista de soft-fork-zone documentada).

**Recomendação C — Hard fork.**
- Custo de décadas: dependabot continua funcionando para gems puras, mas **security patches do Chatwoot core viram aplicação manual** (cada release upstream = engineering hour pra portar). Em 5 anos isso é várias semanas/ano de manutenção pura. Para uma operação enxuta de PME que **não tem time de segurança dedicado**, é receita pra atraso de patch crítico.
- Único cenário em que faz sentido: se Algorythmo divergir tanto de Chatwoot que sync mensal já está custando mais que hard fork (≠ caso atual — ADR-0001 confirmou alinhamento).

**Decisão: Recomendação B.** Razão de décadas: equilíbrio entre custo de implementação hoje (1.5 dia) e custo de merge conflict mensal (zero nos 3 grupos cobertos, controlado/listado nos ~10 arquivos soft-fork). Hard fork (C) sacrifica security upstream — inegociável. Overlay-everywhere (A) é purismo que paga 30% extra em M0.5 sem ROI claro vs B.

**Implementação concreta a inserir em M0.5 (trilha de cleanup pós-foundation):**

| ID | Tarefa | Saída |
|---|---|---|
| M0.5.1 | Widget i18n overlay: criar `engines/algorythmo/app/javascript/widget-i18n/overrides/{en,pt_BR}.json` (sobrescreve só `POWERED_BY`); patch único em `app/javascript/widget/i18n/index.js` com `deepMerge` (tag `// algorythmo: widget-i18n-overlay`) | Widget mostra "Powered by Algorythmo OS" |
| M0.5.2 | Survey i18n overlay: mesmo padrão em `app/javascript/survey/i18n/index.js` | CSAT pós-conversa mostra "Powered by Algorythmo OS" |
| M0.5.3 | Mailer liquid overlay: adicionar `config.paths['app/views'].unshift(Algorythmo::Engine.root.join('app/views').to_s)` no `engine.rb` (após existente `i18n.load_path`); criar `engines/algorythmo/app/views/mailers/administrator_notifications/account_compliance_mailer/account_deleted.liquid` (+ outros 2) | E-mails admin não mencionam "Chatwoot" |
| M0.5.4 | `manifest.json` dinâmico: rota Rails `GET /manifest.json` em controller do engine que renderiza JSON com `INSTALLATION_NAME`/`BRAND_NAME` env. Patch tagueado em `app/views/layouts/vueapp.html.erb` (ou onde o `<link rel="manifest">` é declarado) | PWA install mostra "Algorythmo OS" |
| M0.5.5 | Lista soft-fork-zone: append em `engines/algorythmo/README.md` seção `## Soft-fork zone`, com path:line de cada arquivo aceito (signup `Index.vue:14`, hardcoded components, super_admin views). Cada arquivo recebe tag `// algorythmo: soft-fork <razão curta>` | Engineer + reviewer sabem onde merge conflict é esperado |
| M0.5.6 | Sweep `grep` final: critério de aceite atualizado — `grep -rn "Chatwoot" app/javascript/widget/ app/javascript/survey/ app/views/mailers/administrator_notifications/` retorna **zero** | Validado em smoke test |

**Critério de aceite Round 3 — Decisão 1:** após M0.5, grep por "Chatwoot" em superfícies cliente-final (dashboard + widget + survey + mailers admin + manifest PWA) retorna apenas linhas marcadas `// algorythmo: rebrand-m0` ou `// algorythmo: soft-fork`. Sync mensal de upstream tem zero conflict em widget/survey/mailers liquid/dashboard i18n.

### Decisão 2 — Feature Gate Strategy: **Contrato 3-Camadas Obrigatório (Dispatcher + Controller + UI)**

**Investigação concreta.**

| Camada | Existe no Chatwoot upstream? | Padrão atual | Cobre o quê |
|---|---|---|---|
| 1. Dispatcher | **NÃO existe gate per-flag**. `enterprise/app/dispatchers/enterprise/async_dispatcher.rb` registra `CaptainListener` incondicionalmente. Listener filtra internamente via `conversation.inbox.captain_active?` (line 8 do `captain_listener.rb`). | Listener registrado sempre; lógica de skip dentro do callback. | Side effects (OpenAI calls, webhooks). Sem checagem aqui, custo OpenAI é gerado mesmo com UI hidden. |
| 2. Controller | **Existe padrão claro**: `enterprise/app/controllers/api/v1/accounts/companies/base_controller.rb:7-11` e `saml_settings_controller.rb:52-56` usam `before_action :ensure_X_enabled!` retornando 403 se `Current.account.feature_enabled?('X')` é falso. **Captain controllers NÃO seguem esse padrão** — só checam `captain_v2_enabled?` para escolher serviço, não para autorizar request. | `before_action :ensure_<feature>_enabled!` retornando 403. | REST API direta (curl, scripts). |
| 3. Router (Rails) | Rotas declaradas em `config/routes.rb` linhas 64-94 incondicionalmente. Não há `constraints` de feature flag em rota. | Sem gate. | Acesso por URL — bate em controller, então camada 2 protege. |
| 3'. Router (Vue) | `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js:22` declara `meta: { featureFlag: FEATURE_FLAGS.CAPTAIN }`. **Mas `app/javascript/dashboard/helper/routeHelpers.js:15-18` o router guard só checa `permissions`, não `featureFlag`.** Meta é só dica pro sidebar resolver visibilidade. | Declarativo mas **não enforced no `beforeEach`**. | Acesso por URL no SPA bate no componente, que tem que ter `v-if` interno. |
| 4. Componente Vue | `v-if` em template ou early return no setup. Padrão atual no M0: `Sidebar.vue:64,394`, `SidepanelSwitch.vue:17`, `CopilotLauncher.vue:38` usam `if (!isFeatureFlagEnabled(FEATURE_FLAGS.ALGORYTHMO_SHOW_CAPTAIN))`. | Ad-hoc por componente. | UI visibility. Sozinho deixa URL acessível e backend exposto. |
| 5. Sidebar | Esconde item de menu via `featureFlag` do route meta. | Padrão automático em `provider.js:123`. | Discoverability via menu — não protege URL nem backend. |

**Achados-chave:**

1. **Chatwoot upstream NÃO tem padrão consistente.** Cada feature implementa gate em camadas diferentes. SAML/Companies fazem (2)+(5). Captain faz só (5) + lógica interna em listener (1 parcial via `captain_active?`).
2. **Router Vue guard não enforça `featureFlag`** — isso é bug latente do próprio upstream. URL direta pra rota de Captain bate no componente; só o `v-if` segura.
3. **Camada 1 (dispatcher) é a única que bloqueia custo real OpenAI**. Sem ela, qualquer trigger interno (eventos automáticos, webhooks de inbound message) dispara Captain mesmo com UI completamente hidden.

**Avaliação das camadas:**

| Combinação | Bloqueia OpenAI? | Bloqueia REST direta? | Bloqueia URL direta SPA? | Esconde UI? | Custo DRY |
|---|---|---|---|---|---|
| Só (5) sidebar | NÃO | NÃO | NÃO | parcial | trivial |
| (4)+(5) componente+sidebar | NÃO | NÃO | NÃO (componente carrega) | SIM | baixo |
| **(1)+(2)+(4)+(5) [recomendado]** | **SIM** | **SIM** | **NÃO bate no backend** (controller 403) | **SIM** | médio (helper compartilhado) |
| (1)+(2)+(3)+(4)+(5) tudo | SIM | SIM | SIM (rota não registrada) | SIM | alto (custom router guard) |

**Decisão: combinação obrigatória mínima = camadas 1 + 2 + 4 + 5.** Camada 3 (router guard Vue real) é nice-to-have e fica como helper opcional. Camada 3 Rails (`constraints` em routes.rb) descartada — bota fragilidade em sync mensal sem ganho real sobre camada 2.

**Contrato ADR-0012 (a criar, despachado em M0.5):**

> **Toda feature flag prefixada `algorythmo_` que controla feature de custo real (OpenAI, webhook externo, scraping, AI job) DEVE ser enforced em 4 camadas:**
>
> 1. **Dispatcher:** se o feature dispara side effect via event listener, o listener checa flag antes de enfileirar job. Se a flag é per-account, checagem é `account.feature_enabled?('algorythmo_<flag>')`. Se é per-installation, `Algorythmo::FeatureGate.installation_enabled?('algorythmo_<flag>')`.
> 2. **Controller (Rails):** `before_action :ensure_algorythmo_<flag>_enabled!` em todo controller que serve rotas da feature. Helper compartilhado `Algorythmo::FeatureGate::ControllerConcern` define o helper.
> 3. **Componente (Vue):** `v-if="isFeatureFlagEnabled(FEATURE_FLAGS.ALGORYTHMO_<FLAG>)"` no template OU early-return no setup. Composable compartilhado `useAlgorythmoFeatureGate('<flag>')` empacota o pattern.
> 4. **Sidebar:** route meta com `featureFlag: FEATURE_FLAGS.ALGORYTHMO_<FLAG>` (já automático).
>
> **Feature flag que controla apenas visibilidade UI (sem custo OpenAI/externo) pode ser apenas (4)+(5).**

**Mecanismo DRY a implementar em M0.5 (antes de M1 começar a adicionar flags):**

```
engines/algorythmo/
├── app/
│   ├── concerns/algorythmo/feature_gate/controller_concern.rb
│   │   # provides: ensure_algorythmo_feature_enabled!(flag_name)
│   │   # raises Pundit::NotAuthorizedError com mensagem padronizada
│   └── lib/algorythmo/feature_gate.rb
│       # provides: installation_enabled?(flag), account_enabled?(flag, account)
│       # cached via Rails.cache, invalidado por account.cache_key_with_version
│   └── javascript/composables/useAlgorythmoFeatureGate.js
│       # provides: useAlgorythmoFeatureGate('<flag>')
│       # retorna { isEnabled, requireEnabled() → throws or redirects }
```

Cada flag nova em M1-M5 vira **3 linhas de código**: 1 entry em `features.yml`, 1 `before_action` no controller (ou check no listener), 1 `v-if` no componente. **Sem reimplementar o pattern.**

**Retrofit do Captain gate de M0 (sem reescrever):**

Estado atual: gate só em camadas (4)+(5). Faltam (1) e (2).

| Patch | Arquivo | Mudança |
|---|---|---|
| Camada 1 (dispatcher) | `enterprise/app/listeners/captain_listener.rb:4-12` | Adicionar guard no topo de `conversation_resolved`: `return unless conversation.account.feature_enabled?('algorythmo_show_captain')`. Tag `# algorythmo: feature-gate algorythmo_show_captain`. Bloqueia `Captain::Llm::ContactNotesService` e `ConversationFaqService` (chamadas OpenAI). |
| Camada 2 (controllers) | 9 controllers em `enterprise/app/controllers/api/v1/accounts/captain/*.rb` | Criar `Api::V1::Accounts::Captain::BaseController < Api::V1::Accounts::EnterpriseAccountsController` com `before_action :ensure_algorythmo_show_captain_enabled!` (usa concern do engine). Refatorar os 9 controllers pra herdar dela. Tag `# algorythmo: feature-gate algorythmo_show_captain` em cada um. Retorna 403 com `{ error: 'Captain not available on this account' }`. |
| Camada 3' (Vue router) | `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js:20-36` | Adicionar `algorythmoFeatureFlag: FEATURE_FLAGS.ALGORYTHMO_SHOW_CAPTAIN` ao meta + estender `validateLoggedInRoutes` em `helper/routeHelpers.js` pra checar `algorythmoFeatureFlag` e redirecionar pro dashboard se off. **Opcional — defesa em profundidade.** |
| Teste | `engines/algorythmo/spec/algorythmo/feature_gate/captain_spec.rb` | RSpec cobre: (a) flag off + REST direto → 403, (b) flag off + evento `conversation_resolved` → listener NÃO chama OpenAI service, (c) flag on → comportamento normal, (d) Playwright: URL direta `/app/accounts/:id/captain/assistants` com flag off redireciona pro dashboard. |

**Critério de aceite Round 3 — Decisão 2:**
1. Captain gate enforçado em camadas 1+2+4+5 (camada 3' nice-to-have).
2. Helper `Algorythmo::FeatureGate::ControllerConcern` + composable `useAlgorythmoFeatureGate` disponíveis no engine.
3. ADR-0012 escrito em `docs/adrs/0012-algorythmo-feature-gate-contract.md` referenciando este plano.
4. Teste RSpec + Playwright proibindo regressão da camada 1 (custo OpenAI) e camada 2 (REST direto) no Captain.
5. Regra documentada: **toda feature flag `algorythmo_*` que controla feature de custo segue contrato 4-camadas.** Reviewer obrigado a checar em PRs M1-M5.

### Resumo Round 3 — o que entra em M0.5 (nova trilha de cleanup pós-M0)

| ID | Decisão | Custo | Justificativa de décadas |
|---|---|---|---|
| **M0.5 (rebrand)** | Overlay-first para widget i18n + survey i18n + mailers liquid + manifest PWA dinâmico. Lista de soft-fork-zone documentada. | ~1.5 dia | Zero merge conflict em surfaces de cliente final pelos próximos 10 anos; soft-fork-zone limitada a ~10 arquivos rastreáveis. |
| **M0.5 (gates)** | Contrato 4-camadas (Dispatcher + Controller + Componente + Sidebar) obrigatório pra flag de custo. Helper Ruby + composable Vue. Retrofit do Captain gate. ADR-0012. | ~1.5 dia | Cada flag M1-M5 herda padrão — 3 linhas de código por gate em vez de re-inventar. Bloqueia custo OpenAI mesmo com UI hidden. |

**Total M0.5 ≈ 3 dias de engenharia.** Próximo passo: `/plan-eng-review` round 3 valida; founder aprova; engineer round 3 implementa em PR(s) separado(s) da branch `algorythmo/m0-foundation`.

---

## Round 3.5 — Eng Manager Review (post-planner Round 3)

**Verdict:** APPROVED_WITH_AMENDMENTS. Decisões 1 e 2 estão corretas em direção. 4 amendments antes de despachar engineer round 3.

### Step 0 — Scope Challenge

- **Padrões verificados no codebase (planner acertou):** `deepMerge` dashboard ✓, widget i18n estrutura idêntica ✓ (54 hits validados), survey idêntico ✓ (53 hits), `ensure_*_enabled!` pattern existe em 4 places (Companies, WhatsApp Calling, **e Captain Custom Tools — já dentro de Captain!**), view path priority padrão Enterprise ✓.
- **Insight extra (planner perdeu):** `enterprise/app/controllers/api/v1/accounts/captain/custom_tools_controller.rb:3,38` JÁ implementa `before_action :ensure_custom_tools_enabled`. Refactor dos 9 controllers Captain pode espelhar exatamente esse arquivo — zero invenção de padrão.
- **Complexity check:** ~26 arquivos tocados (acima do threshold 8). Justificado: 3 blockers do adversarial-review são reais. Sem redução de escopo.
- **TODOS.md:** não existe no projeto. Itens deferíveis viram seção `## NOT in scope` aqui.

### Architecture Review — 4 amendments

**A1 [P1, confidence 7/10] — Mudar M0.5.4 de "manifest.json dinâmico via controller" pra build-time substitution.**

PWAs cacheiam `manifest.json` agressivamente no service worker. Trocar pra rota dinâmica = dispositivos com PWA instalado continuam vendo "Chatwoot" até desinstalar. Rota Rails dinâmica também adiciona request por sessão.

Solução: gerar `public/manifest.json` final em build-time via Vite plugin ou template processado por `bin/setup`/asset:precompile, lendo `BRAND_NAME`/`INSTALLATION_NAME` do env. Zero risco de cache, zero overhead runtime. Custo: ~30min, **menor** que controller dinâmico.

**A2 [P1, confidence 8/10] — Promover Camada 3' (Vue router guard) de "opcional" pra OBRIGATÓRIO no contrato 4-camadas.**

Sem router guard real (não só meta), URL direta `/app/.../captain/...` carrega o componente, dispara API call, recebe 403 do controller (Camada 2 funciona) — mas usuário vê **erro UI feio**, **network requests visíveis** em devtools, **possíveis analytics events** disparados. Defesa em profundidade quebrada por economia de 30min.

Fix: estender `app/javascript/dashboard/helper/routeHelpers.js:15-18` pra checar `meta.algorythmoFeatureFlag` no `beforeEach` global. Redirect imediato pro dashboard se flag off. **Contrato fica 4-camadas obrigatório: Dispatcher + Controller + RouterGuard + Componente.** Sidebar continua automático.

**A3 [P2, confidence 6/10] — Concern usa `head :forbidden` + `render json` (pattern existente), não `Pundit::NotAuthorizedError`.**

Plano menciona "raises Pundit::NotAuthorizedError com mensagem padronizada". Mas `companies/base_controller.rb:7-11` e `captain/custom_tools_controller.rb:38` ambos fazem `render json: { error: ... }, status: :forbidden` direto. Espelhar pattern existente.

**A4 [P2, confidence 7/10] — Soft-fork-zone tem que ser machine-checkable, não só markdown.**

M0.5.5 propõe lista em README do engine. Lista markdown vira stale silenciosamente quando arquivo é movido/deletado upstream. Adicionar CI check: script que lê a lista, valida que cada `path:line` existe e contém tag `algorythmo: soft-fork`. Falha CI quando lista fica stale. Custo: ~30min de bash + entry no workflow.

### Code Quality Review — 2 amendments

**Q1 [P2, confidence 9/10] — `deepMerge` deve ser ÚNICO no engine, importado dos 3 entry points (dashboard, widget, survey).**

Plano implícito mas não explicitado. Confirmar no patch: M0.5.1 e M0.5.2 importam `deepMerge` de `engines/algorythmo/app/javascript/i18n/deepMerge.js` (existente desde M0), não duplicam.

**Q2 [P3, confidence 6/10] — `useAlgorythmoFeatureGate` deve especificar fail-closed behavior pra account não-carregada.**

Plano diz "retorna `{ isEnabled, requireEnabled() }`" mas não especifica: o que `isEnabled` retorna se `currentAccountId` é null durante load? Adversarial-review (#8) já apontou race condition relacionada no watcher Captain de M0. Decidir agora: **`isEnabled` retorna `false` se account null** (fail-closed, sem flicker). Sem `null` ternário pra evitar UI states inconsistentes.

### Test Review — Coverage diagram + IRON RULE regressions

```
CODE PATHS                                                  USER FLOWS
[+] engines/.../widget-i18n/overrides/*.json + wrap        [+] Widget no site do cliente
  └── deepMerge(base, overrides)                             ├── [GAP] [→E2E] POWERED_BY assertion
      └── [★★ TESTED via dashboard] — happy path             └── [GAP]        Trocar locale runtime

[+] app/views/.../*.liquid (engine overlay)                [+] Admin recebe e-mail
  └── Liquid render BRAND_NAME                               └── [GAP] [→RSpec mailer] HTML render

[+] manifest build-time substitution                       [+] PWA install
  └── env interpolation                                      └── [GAP] [→manual] não testável em CI

[+] enterprise/.../captain_listener.rb (patch guard)       [+] Conversation resolves, flag off
  ├── flag off → return early   [REGRESSION ★]              ├── [GAP] [→RSpec] zero OpenAI calls
  └── flag on  → service.call                                └── [GAP] [→RSpec] service called

[+] enterprise/.../captain/base_controller.rb (novo)       [+] URL direta com flag off
    + 9 subclasses refactored                                 ├── [GAP] [→Playwright] redirect to dashboard
  └── before_action :ensure_algorythmo_show_captain_enabled! └── [GAP] [→RSpec request] GET API → 403
      ├── flag off → 403            [REGRESSION ★]
      └── flag on  → pass

[+] engines/.../feature_gate/controller_concern.rb         [+] Outro flag Algorythmo em M1+
  └── ensure_algorythmo_feature_enabled!(flag)               └── [GAP] [→RSpec] unit reusável
      ├── account nil   → 403
      ├── flag off      → 403
      └── flag on       → noop

[+] engines/.../composables/useAlgorythmoFeatureGate.js    [+] Componente Vue gated
  └── { isEnabled, requireEnabled() }                        └── [GAP] [→Vitest]
      ├── account null → false (fail-closed)                       account null    → false
      ├── flag off     → false                                     loaded + flag off → false
      └── flag on      → true                                      loaded + flag on  → true

[+] routeHelpers.js extended (A2 amendment)                [+] Vue router guard com algorythmoFeatureFlag
  └── beforeEach checks meta.algorythmoFeatureFlag           └── [GAP] [→Vitest] redirect when off

COVERAGE: 1/19 paths tested (5%)
GAPS: 18 (4 Playwright/E2E, 11 RSpec, 3 Vitest unit)
REGRESSION TESTS (IRON RULE, mandatory):
  - captain_listener guard quando flag off
  - captain controllers 403 quando flag off
```

**Tests obrigatórios a adicionar em M0.5 (engineer NÃO pode pular):**
- `engines/algorythmo/spec/algorythmo/feature_gate/controller_concern_spec.rb`
- `engines/algorythmo/spec/algorythmo/feature_gate/captain_integration_spec.rb` (listener + controller request specs, regression)
- `engines/algorythmo/spec/algorythmo/i18n_overlay_widget_spec.rb` + survey spec
- `app/javascript/dashboard/helper/__tests__/routeHelpers_algorythmo.spec.js` (router guard)
- `app/javascript/shared/composables/specs/useAlgorythmoFeatureGate.spec.js`
- `e2e/captain_gate.spec.ts` — Playwright: URL direta com flag off redireciona; flag on permite; widget POWERED_BY assertion

### Performance Review

- **P1 [confidence 5/10]:** `account.feature_enabled?(...)` em cada listener event pode ser query desnecessária se Chatwoot upstream não cacheia. Engineer deve confirmar memoization existente; senão `Rails.cache.fetch` com TTL curto no helper do engine. Verificação em ~5min.
- **P2 [confidence 8/10]:** `deepMerge` em load-time bundle Vue é trivial (~30 chaves × 2 locales × 3 entries). Sem impacto.
- **P3 [confidence 7/10]:** Build-time manifest (A1) elimina request runtime. Win.

### Failure Modes — Critical Gaps

| Gap | Impacto produção | Coberto por |
|---|---|---|
| **PWA cache stale** | Cliente vê "Chatwoot" no atalho instalado mesmo pós-deploy | A1 (build-time substitution) |
| **URL direta Captain** | Erro UI feio, network requests visíveis, possível analytics event Captain disparado | A2 (router guard obrigatório) |
| **Watcher race M0 não corrigido** | `is_copilot_panel_open` pode oscilar em multi-tab + account async load | TODO (adversarial #8 — ficou pra M0.5 ou backlog) |
| **Soft-fork-zone drift** | Lista markdown vira stale, devs perdem rastreabilidade | A4 (CI check) |

### NOT in scope (Round 3.5)

- Locales != en/pt_BR no dashboard/widget/survey (esperado, documentado pra M5)
- Transactional mailers (não-admin) — só admin notifications cobertos em M0.5
- Mobile app/SDK rebrand (fora deste repo)
- Super admin views (interno operador da plataforma — aceito como soft-fork-zone)
- Watcher race condition do M0 (#8 adversarial) — TODO P2 separado, não bloqueia M0.5

### What already exists — confirmado reuso, zero rebuild

- `deepMerge`: `engines/algorythmo/app/javascript/i18n/deepMerge.js` (M0)
- `before_action :ensure_X_enabled!`: 4 controllers, 1 dentro de Captain (custom_tools)
- View path priority Rails: Enterprise pattern em `config/application.rb:49`
- `useBranding().replaceInstallationName()`: substitui Chatwoot→installationName em runtime
- Migration appender: `engines/algorythmo/lib/algorythmo/engine.rb` (M0)
- Tag convention `algorythmo: <slug>`: estabelecida em M0 (rebrand-m0, feature-gate, i18n-overlay-m0)

### Parallelization Strategy

- **Lane A (rebrand):** M0.5.1 widget + M0.5.2 survey + M0.5.3 mailers + M0.5.4 manifest + M0.5.5 soft-fork list + M0.5.6 grep sweep. Tasks independentes — podem rodar em PRs paralelos OU 1 PR bundle.
- **Lane B (gates):** captain_listener patch + base_controller novo + 9 subclasses refactor + concern + composable + routeHelpers extension + ADR-0012. Sequential within lane.
- **Conflict:** zero. Lane A toca `app/javascript/widget|survey/`, `app/views/mailers/`, `public/`. Lane B toca `enterprise/app/...`, `engines/algorythmo/`, `app/javascript/dashboard/helper/`.
- **Recomendação:** despachar **A + B em paralelo via 2 engineer agents em worktrees separados**. Total wall-clock ~1.5 dia em vez de 3.

### Implementation Tasks

- [ ] **T1 (P1, human: ~30min / CC: ~5min)** — `manifest.json` build-time
  - Surfaced by: A1
  - Files: `public/manifest.json` template + Vite/asset-precompile hook
  - Verify: build local, abrir `public/packs/manifest.json` (ou equivalente), assert `Algorythmo OS`
- [ ] **T2 (P1, human: ~30min / CC: ~10min)** — Vue router guard `algorythmoFeatureFlag` obrigatório
  - Surfaced by: A2
  - Files: `app/javascript/dashboard/helper/routeHelpers.js`, `app/javascript/dashboard/routes/dashboard/captain/captain.routes.js`
  - Verify: Playwright `e2e/captain_gate.spec.ts` — flag off + URL direta = redirect
- [ ] **T3 (P2, human: ~15min / CC: ~5min)** — Concern usa `head :forbidden`/render JSON, não Pundit
  - Surfaced by: A3
  - Files: `engines/algorythmo/app/controllers/concerns/algorythmo/feature_gate/controller_concern.rb` (novo)
  - Verify: RSpec do concern + integration com captain controller
- [ ] **T4 (P2, human: ~30min / CC: ~10min)** — CI check pra soft-fork-zone list
  - Surfaced by: A4
  - Files: `.github/workflows/run_foss_spec.yml` + `engines/algorythmo/bin/check-soft-fork-zone.sh` (novo)
  - Verify: rodar localmente, fazer commit que move um arquivo soft-fork, ver CI falhar
- [ ] **T5 (P2, human: ~10min / CC: ~2min)** — `deepMerge` único, importado dos 3 entry points
  - Surfaced by: Q1
  - Files: `app/javascript/widget/i18n/index.js`, `app/javascript/survey/i18n/index.js`
  - Verify: grep `from.*deepMerge` retorna 3 hits, todos apontam pro engine
- [ ] **T6 (P3, human: ~10min / CC: ~2min)** — `useAlgorythmoFeatureGate` fail-closed quando account null
  - Surfaced by: Q2
  - Files: `engines/algorythmo/app/javascript/composables/useAlgorythmoFeatureGate.js` (novo)
  - Verify: Vitest spec — `account=null` ⇒ `isEnabled=false`
- [ ] **T7 (P3, human: ~5min / CC: ~2min)** — Confirmar memoization `feature_enabled?` upstream
  - Surfaced by: Perf P1
  - Files: investigação rápida em `app/models/concerns/...` + decisão se adicionar cache
  - Verify: Sidekiq logs após M1 simulado — zero queries duplicadas por evento

### Unresolved decisions
Nenhuma. Eng-review apresenta amendments concretos; founder aprova ou rejeita o conjunto.

### Completion Summary

- Step 0 Scope Challenge: scope aceito (26 files, justificado por blockers)
- Architecture Review: 4 amendments (A1 P1, A2 P1, A3 P2, A4 P2)
- Code Quality Review: 2 amendments (Q1 P2, Q2 P3)
- Test Review: diagram produzido, 18 gaps (4 E2E, 11 RSpec, 3 Vitest), **2 regression tests obrigatórios** (IRON RULE)
- Performance Review: 1 P3 (verificação rápida memoization), 2 sem ação
- NOT in scope: escrito (5 itens)
- What already exists: escrito (6 patterns)
- Failure modes: 4 critical gaps, 3 cobertos por amendments, 1 vira TODO separado (watcher race)
- Outside voice: skipped (escopo limitado, eng-review já validou planner)
- Parallelization: 2 lanes paralelas (A rebrand independente, B gates sequential within) — total ~1.5 dia wall-clock
- Implementation Tasks: 7 T-items (2 P1, 4 P2, 1 P3)

**VERDICT:** APPROVED_WITH_AMENDMENTS. Founder aprova os 4 amendments (A1, A2, A3, A4) + 2 quality (Q1, Q2) + 1 perf check (T7) → engineer round 3 implementa em 2 lanes paralelos.

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | (not run — founder defines scope inline) |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | (skipped — eng-review tem confidence alto sobre planner) |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 3 | **APPROVED_WITH_AMENDMENTS** | Round 1+2: 9 decisões (F1-F8 + C1-C4). Round 3.5: 7 amendments (2 P1, 4 P2, 1 P3), 4 critical gaps cobertos, 18 test gaps, 2 regressions IRON RULE. |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | (UI scope mínimo no M0.5 — só rebrand strings + redirect, sem novo componente) |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | (skipped) |

**UNRESOLVED:** 0 (todos os amendments do Round 3.5 estão concretos, aguardando approve binário do founder).

**VERDICT:** **ENG REVIEW APPROVED_WITH_AMENDMENTS** — Round 3 do planner está em direção correta, com 7 amendments concretos pra incorporar antes do engineer round 3. Após founder approve, despachar 2 engineer agents em worktrees paralelos (Lane A rebrand + Lane B gates).

