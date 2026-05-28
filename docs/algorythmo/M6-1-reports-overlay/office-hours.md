# Office Hours — M6.1 Relatórios Comerciais (overlay)

**Data:** 2026-05-27
**Founder:** Gustavo (Algorythmo)
**Planner:** sessão 2026-05-27 (sucede handoff `docs/algorythmo/handoff-2026-05-27-m6-1-reports-overlay.md`)
**Status:** RESPOSTAS TRANCADAS — pendente confirmação founder em 2 pontos product/business (P2-business e P3-business).

> Protocolo YC. 6 perguntas — 4 do handoff + 2 que o planner identificou como gap antes de escrever o plano. Nenhuma decisão técnica fica pro founder; as 2 perguntas marcadas `(precisa founder)` são puro produto/negócio.

---

## 1. Demand reality — quem realmente quer este overlay?

**Pergunta:** Quem dentro do cliente PME abre a tela de "Relatórios Comerciais" e por quê? Evidência além de "seria legal ter".

**Resposta trancada:**

O usuário é o **dono da PME (role `Administrator`)** que já está logado no Algorythmo OS pra ver os dashboards setoriais (Operação, Compras, Financeiro etc.) entregues no M6.0-M6.6. Ele entra em "Relatórios Comerciais" porque é o **único bloco da sidebar GESTÃO que hoje cai numa tela Chatwoot crua** — overview com gráficos de "conversations count / response time / resolution time". Essa tela tem 2 problemas concretos pro PME:

1. **Vocabulário é de atendimento, não de venda.** "Conversations resolved" não responde "fechei quanto?". O dono PME vende por WhatsApp, Instagram, telefone. Ele precisa ver pipeline + conversão + canal de origem, não SLA de suporte.
2. **Reports vive em silo do CRM.** O cliente que conversa pelo WhatsApp e vira lead no CRM (já entregue, M1) não aparece nos Reports como métrica comercial. O dado existe — está disperso.

**Evidência forte:** o próprio founder reorganizou a sidebar em M5 e renomeou "Reports" → "Relatórios Comerciais". Esse rename é o sinal de demand mais barato e mais real possível: o problema foi nomeado antes de qualquer linha de código nova. O nome promete uma coisa; a tela entrega outra. Esse gap é o produto.

**Evidência adicional:** memory `project_algorythmo_os_product_vision.md` documenta que cards de lead já carregam "nome / canal / tempo-na-etapa" — ou seja, o vocabulário comercial já está canonicalizado no produto. Falta consolidar na visão de cima (overlay de leitura).

---

## 2. Status quo — o que o dono PME faz hoje no lugar disso?

**Pergunta:** Sem o overlay, como o dono PME mede "como foi a semana comercial"?

**Resposta trancada:**

Três comportamentos observáveis (todos inadequados):

1. **Conta na cabeça.** Abre o CRM Kanban, olha quantos cards estão em "Fechado" essa semana, compara mentalmente com a semana passada. Sem agregação, sem delta, sem visão por canal. Funciona até o volume passar de ~30 leads/semana.
2. **Pede pra alguém puxar planilha.** Em PMEs com 1 analista, o dono pede "monta um Excel com vendas por canal". Latência: 1-3 dias. Frequência: mensal, no máximo.
3. **Abre os Reports do Chatwoot.** Vê "X conversations resolvidas, Y de tempo médio de resposta". Não responde a pergunta de venda. Frustra e fecha.

O comportamento #3 é o sintoma chave: **o dono ABRE a tela esperando ver venda e sai sem ver venda.** Isso é a definição de "demand exists, supply doesn't". O overlay M6.1 é a oferta que falta.

**Razão pra agir agora (não daqui a 6 meses):** sem overlay, M5 deixou um buraco de UX onde o nome promete e a tela entrega outro produto. Dono que clica em "Relatórios Comerciais" e vê tela de suporte perde confiança no resto do produto.

---

## 3. Desperate specificity — quem é o usuário MAIS desesperado?

**Pergunta:** Qual perfil específico de PME tem o problema mais agudo? Quem chora se o overlay não existir?

**Resposta trancada:**

**Persona-alvo:** o dono(a) de PME brasileira de varejo/distribuição/serviço com **3-15 atendentes humanos**, vendendo por 2-4 canais simultâneos (WhatsApp Business + Instagram DM + site form + às vezes Mercado Livre/Shopee). Faturamento R$ 500K-5M/ano. **Não tem analista BI, não tem CRM separado** — o Algorythmo OS é a única fonte de verdade.

**Workflow on-fire dessa persona:**
- Manhã: abre o celular, quer saber "fechamos quanto ontem? Qual canal puxou mais? Algum atendente trava em algum lead?".
- Hoje: abre o Algorythmo, olha CRM Kanban (5 estágios), conta os cards de "Fechado", olha o WhatsApp Business app separado pra ver volume de mensagens. **Três telas pra responder uma pergunta.**
- Custo da fragmentação: perde a leitura "canal X caiu 40% essa semana" porque cada canal vive numa tela diferente. Acaba investindo budget de mídia no canal errado.

**Quem não é o alvo:** SaaS B2B com pipeline de 6 meses (precisa ferramenta diferente), grande varejo com BI próprio (já tem PowerBI), agência que vende serviço de longo ciclo (CRM dele é HubSpot).

**Foco operacional:** o overlay é a tela "respondi o WhatsApp e quero saber se rendeu venda". Curto ciclo. Velocidade > profundidade.

---

## 4. Narrowest wedge — qual é o v0 mais embaraçosamente pequeno?

**Pergunta:** Qual é a menor entrega possível que ainda responde a pergunta do dono "como foi a semana comercial"?

**Resposta trancada (FRAMEWORK do overlay):**

V0 é **uma rota nova**, `/reports/commercial`, que vive **dentro do `ReportsWrapper` existente** como **primeira aba** (default redirect). Renderiza UM componente: o mesmo `SectorDashboard` que já roda em Operação, mas alimentado por um novo mock `commercial.js`.

Composição idêntica ao M6.0 (designer-locked):
- 2 anchor KPIs (50/50)
- 4 secondary KPIs (4-col)
- 1 chart full-width (área 12 semanas)
- 1 painel direito 360px com `SectorAgentChat` (agente comercial)
- Watermark "DADOS DE DEMONSTRAÇÃO"

**Por que esse wedge é o certo:**
- Reusa 100% do shell que o designer já trancou em M6.0. Zero risco visual.
- Não substitui as abas Chatwoot — coexiste com Overview / Conversation / Agent / etc. como **primeira aba**, default. Quem quer ver SLA continua tendo (1 clique).
- Frontend-only. Zero backend novo, zero migration. Mock realista (D3).
- Embaraçoso de pequeno: literalmente 1 mock novo + 1 entry de aba + 1 redirect default.

**O que NÃO entra no v0 (parking lot):**
- Drill-down clicável em KPI (ex.: clicar em "leads por canal" e ver lista). M6.1-extras.
- Filtro de período custom (hoje / 7d / 30d / 90d). M6.1-extras.
- Comparação com período anterior além do delta exibido. Backend dep.
- Export CSV. Já existe nas abas legadas; herdamos.
- Dado real do CRM/Conversations. Backend dep — entra quando UI estabilizar.

---

## 5. Observation — quando foi a última vez que você viu alguém usar?

**Pergunta:** O founder observou alguém (cliente, prospect, dogfooding interno) tentando responder a pergunta comercial dentro do produto?

**Resposta trancada:**

Não há observação direta documentada nas memories. O sinal mais forte é **indireto mas pesado**: o próprio founder, **dogfooding o produto na Algorythmo** (memory `project_brain_m3.md` — "dogfooding Algorythmo Day-1"), reorganizou a sidebar e renomeou Reports. Esse rename é a observação: o founder ele mesmo, usando o produto, achou que o nome devia ser "Relatórios Comerciais" — ou seja, o gap entre nome e conteúdo o irritou a ponto de mexer.

**Risco assumido:** estamos construindo sobre observação de N=1 (o próprio founder). Mitigação: o wedge é frontend-only com mock; se a primeira demo pra cliente PME real mostrar que os KPIs escolhidos não ressoam, troca em 1 PR de mock (`commercial.js`) sem mexer em shell. Custo de erro = ~1 dia de eng.

**Próxima observação a buscar (pós-ship M6.1):** primeira demo de venda agendada com cliente PME. Founder leva tela aberta no overlay. Sucesso = PME aponta pra KPI e fala "isso aí é o que eu queria ver". Falha = PME aponta pra KPI e fala "mas e [X]?". Ambos são input válido pro próximo PR.

---

## 6. Future-fit — onde isso senta em 3 anos?

**Pergunta:** O overlay é só uma feature pra tampar o buraco da tela Reports, ou é o embrião de algo maior?

**Resposta trancada:**

É o **embrião do "CEO Dashboard" comercial** dentro do Algorythmo OS. Em 3 anos:

- O componente `SectorDashboard` (já trancado pelo designer em M6.0) é o **shell canônico de toda visão de leitura no produto** — Operação, Compras, RH, e agora Comercial. Manter Relatórios Comerciais nessa mesma forma reforça a linguagem visual em vez de fragmentar.
- O `SectorAgentChat` evolui de placeholder pra agente real (M3 Brain backend já existe). Em 3 anos, perguntar "por que conversão caiu 8pp esse mês?" pro agente comercial dispara investigação real cruzando CRM + Conversations + Brain.
- O overlay vira **fonte da verdade da operação comercial** (substitui as abas legadas Chatwoot quando backend estiver pronto). Hoje coexiste; em 18 meses, as abas Chatwoot viram "Avançado" colapsado no fim.
- Relação com `MarketingDashboard` (já entregue, M6.6) e CRM (M1): **divisão de leitura clara** — Marketing mede topo de funil (CAC, ROAS, CTR), Comercial mede meio/fundo (pipeline, conversão, ciclo), CRM é a ferramenta operacional (Kanban). Sem sobreposição, três entradas distintas pra três perguntas distintas.

**Wedge into a category:** o overlay é o primeiro passo do produto **"painel de operação do dono PME com agentes"**. Não é feature looking for a home; é home looking for a foundation.

---

## Perguntas extras do planner (gap identificado)

### Q7. Coexistência com a Reports Chatwoot — substituir ou agregar?

**Pergunta:** Sumir com as abas Chatwoot (Overview, Conversation, Agents, Inboxes, Labels, Teams, CSAT, SLA) ou manter convivendo?

**Resposta trancada:** **Manter convivendo.** O overlay é uma aba nova (primeira, default) dentro de `ReportsWrapper`. As outras abas continuam acessíveis em 1 clique. Razão:

- Sumir hoje quebra usuário admin Chatwoot legado (qualquer cliente PME mais maduro tem expectativa SLA/CSAT).
- O M6.1 ainda é mock. Sumir o que tem dado real (Chatwoot) pra entregar mock é regressão.
- Memory `feedback_architecture_defer_upstream.md`: quando upstream resolve um problema, segue a convenção do upstream. Reports já tem 8 abas; adicionar uma 9a (primeira, default) é a menor mudança.

Quando o backend do overlay existir (plano futuro), reavaliamos colapsar as abas legadas em "Avançado".

### Q8. Drill-down clica e vai pra onde?

**Pergunta:** Quando o usuário clica num KPI ou num ponto do chart, o que acontece?

**Resposta trancada para v0 (M6.1):** **Sem drill-down clicável no v0.** KPIs e chart são read-only display. Razão: drill-down sem backend real vira clique-pra-mock-de-mock, o que é UX podre. Hover state existe (cursor, sutil background change) mas click = no-op.

**Pós-v0 (M6.1-extras, depois):** drill-down vira tabela rolável no painel inferior (slide-up), alimentada por endpoint dedicado. Plano separado. **Não está no escopo de M6.1.**

---

## Decisões D7+ candidatas (a virar memory pós-ship)

Não são decisões puramente técnicas — têm implicação product/business e portanto precisam carimbar do founder antes de eu transformar em memory. **Marquei `(precisa founder)` nas que ele deve confirmar antes do engineer começar.**

| ID | Decisão proposta | Razão | Status |
|---|---|---|---|
| **D7** | **Overlay = aba nova "Visão Comercial" dentro de `ReportsWrapper` (primeira aba, default redirect)** — não rota separada `/reports/commercial`. | Reusa shell + breadcrumb + permissions já existentes. Menor mudança. Engineer-decision (não founder). | Trancada pelo planner. |
| **D8** | **KPIs canônicos do overlay (precisa founder confirmar)** — proposta: anchor = (a) Receita fechada nos últimos 7d, (b) Taxa de conversão lead→fechado; secondary = (c) Leads novos 7d, (d) Ciclo médio em dias, (e) Ticket médio, (f) % por canal top1. | KPIs comerciais clássicos de PME varejo. Compatíveis com mock realista (D3). **`(precisa founder)`** — se quiser trocar algum, fala antes do engineer começar. | DRAFT — aguarda founder. |
| **D9** | **Período fixo no v0 = "últimos 30 dias"** (sem date-picker). | Date-picker é UI extra que não muda a forma do produto. Pós-v0. | Trancada pelo planner. |
| **D10** | **`SectorAgentChat` reusado como-é, com label "Comercial · agente"** — sem variante nova. | Memory `feedback_architecture_defer_upstream.md` + consistência visual com 7 setores já entregues. | Trancada pelo planner. |
| **D11** | **Coexistência com `MarketingDashboard` (precisa founder confirmar)** — proposta: Marketing fica responsável por TOPO de funil (CAC, ROAS, CTR, MQLs, leads gerados, CPL); Comercial fica responsável por MEIO/FUNDO (leads em pipeline, conversão por etapa, receita fechada, ciclo, ticket, canal de origem do FECHAMENTO). Sem KPI duplicado entre as duas telas. | Divisão funcional clássica mkt↔vendas. **`(precisa founder)`** — se quiser sobreposição (KPI repetido pra dar contexto), fala. | DRAFT — aguarda founder. |
| **D12** | **Watermark "DADOS DE DEMONSTRAÇÃO" mantida** — mesmo padrão M6.0-M6.6. | Risco #4 do plano 0005 (mock vira source-of-truth em demo). | Trancada pelo planner. |
| **D13** | **Cut-flag dedicada `algorythmo_admin_reports_commercial`** (default ON pra admin, mas reversível) — caso queiramos esconder em algum cliente específico. | Padrão do `algorythmoCutFlags.js`, segue convenção do projeto. | Trancada pelo planner. |

---

## Síntese (uma linha)

**M6.1 = entregar a tela que o nome "Relatórios Comerciais" promete** — primeira aba do `ReportsWrapper`, shell `SectorDashboard` idêntico ao M6.0, mock comercial realista, agente comercial placeholder, watermark de demo. Frontend-only. Sem drill-down, sem date-picker, sem backend novo.

**Founder owes:** carimbar D8 (lista de KPIs) e D11 (divisão Marketing↔Comercial) antes do engineer começar.
