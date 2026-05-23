# Cortes propostos — M2 limpeza batch 1

Surfaces da Chatwoot upstream que NÃO fazem sentido pro produto Algorythmo OS
(painel integrado AI-first pra PMEs). Cada corte é escondido via feature flag
`algorythmo_<nome>` default `false`, não removido (ADR-0001 sync mensal).

## Como ler

- **Surface**: o lugar no produto (rota, componente, menu, modal)
- **Por que cortar**: razão de produto, não razão técnica
- **Risco se mantiver**: o que confunde o usuário PME ou polui a UI
- **Plano de gate**: nome da flag + arquivos que vão receber `// algorythmo: feature-gate ...`
- **Confiança**: high/med/low — founder valida especialmente os "med" e "low"

---

## Lista proposta

### CUT-001 — Campaigns (Live Chat / SMS / WhatsApp)

- **Surface**: Seção "Campaigns" no sidebar (`Sidebar.vue` linhas ~586-606) + rotas em `campaigns.routes.js` + páginas `LiveChatCampaignsPage.vue`, `SMSCampaignsPage.vue`, `WhatsAppCampaignsPage.vue`.
- **Por que cortar**: Campanhas em massa (broadcast) são uma função de marketing outbound. O Algorythmo OS é centrado em conversas inbound — lead chega pelo canal, Manu atende. Campanhas outbound não fazem parte do modelo de venda conversacional pra PME no MVP. Geram confusão mental de propósito ("isso é CRM ou disparador de spam?").
- **Risco se mantiver**: Founder PME entra na seção, tenta disparar campanha pro WhatsApp e descobre que precisa de número aprovado pela Meta e aprovação de templates — frustração imediata. Polui o sidebar com item que nunca vai funcionar de forma self-service simples.
- **Plano de gate**: flag `algorythmo_campaigns` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (bloco Campaigns ~L585), `app/javascript/dashboard/routes/dashboard/campaigns/campaigns.routes.js` (meta do route ou remoção de import).
- **Confiança**: high

---

### CUT-002 — Help Center (Portals / Knowledge Base)

- **Surface**: Seção "Portals" / "Help Center" no sidebar (`Sidebar.vue` linhas ~608-653) + rotas em `helpcenter.routes.js`.
- **Por que cortar**: Central de ajuda pública (artigos, categorias, locales) é uma ferramenta de suporte B2C self-service. O produto atende PMEs que querem atender leads de vendas com Manu — não publicar base de conhecimento pública. O Brain (M3) é o equivalente interno e fechado. Expor Help Center no sidebar sugere que o PME precisa montar uma wiki pública, o que não é o caso.
- **Risco se mantiver**: Confusão de posicionamento — "esse é um helpdesk?" vs "esse é um CRM de vendas?". PME gasta tempo tentando entender pra que serve o Help Center quando deveria estar conectando canal.
- **Plano de gate**: flag `algorythmo_help_center` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (bloco Portals ~L607), `app/javascript/dashboard/routes/dashboard/helpcenter/helpcenter.routes.js` (meta do route).
- **Confiança**: high

---

### CUT-003 — SLA Management (Configurações + Relatório)

- **Surface**: Menu "SLA" em Settings > SLA (`sla.routes.js`) + item "Reports SLA" no sidebar de relatórios (`Sidebar.vue` ~L575) + aba bot_reports.
- **Por que cortar**: SLA é um conceito de suporte enterprise com times de ticketing e contratos de nível de serviço. O PME de vendas com Manu trabalha com velocidade de follow-up (aging signal do Kanban, que já resolve esse problema de outra forma). O upstream já restringe SLA a `CLOUD` e `ENTERPRISE` — mas o item continua visível em configurações e confunde.
- **Risco se mantiver**: PME configura SLA esperando que Manu respeite automaticamente — não é verdade no MVP. Cria expectativa errada. Relatório de SLA vazio polui a aba de Reports.
- **Plano de gate**: flag `algorythmo_sla` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item SLA ~L781 e Reports SLA ~L573), `app/javascript/dashboard/routes/dashboard/settings/sla/sla.routes.js` (meta).
- **Confiança**: high

---

### CUT-004 — Audit Logs

- **Surface**: Menu "Audit Logs" em Settings (`audit.routes.js`) + item no sidebar de Settings (`Sidebar.vue` ~L769).
- **Por que cortar**: Audit logs são requisito de compliance enterprise (ISO 27001, SOC 2, auditoria interna de TI). PME de vendas não tem equipe de segurança revisando logs de acesso. O upstream já restringe a `CLOUD` e `ENTERPRISE` — mas o item aparece no menu de Settings e ocupa espaço visual.
- **Risco se mantiver**: PME abre e vê lista técnica de eventos sem contexto. Não agrega valor no MVP. Polui o menu de configurações que deveria ser enxuto.
- **Plano de gate**: flag `algorythmo_audit_logs` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Audit Logs ~L769), `app/javascript/dashboard/routes/dashboard/settings/auditlogs/audit.routes.js` (meta).
- **Confiança**: high

---

### CUT-005 — Custom Roles

- **Surface**: Menu "Custom Roles" em Settings (`customRole.routes.js`) + item no sidebar (`Sidebar.vue` ~L775).
- **Por que cortar**: Custom roles (permissões granulares além de admin/agent) são para times de suporte com hierarquias complexas (supervisor, QA, billing-only, etc). PME de 2-5 pessoas usa apenas admin e agent. O upstream já restringe a `CLOUD` e `ENTERPRISE`.
- **Risco se mantiver**: PME entra em Custom Roles esperando criar um "gerente de vendas" — encontra configuração de permissões complexa que não mapeia pro modelo simples de admin+agent.
- **Plano de gate**: flag `algorythmo_custom_roles` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Custom Roles ~L775), `app/javascript/dashboard/routes/dashboard/settings/customRoles/customRole.routes.js` (meta).
- **Confiança**: high

---

### CUT-006 — Security Settings (SAML / SSO)

- **Surface**: Menu "Security" em Settings (`security.routes.js`) + item no sidebar (`Sidebar.vue` ~L793).
- **Por que cortar**: SSO via SAML é requisito de enterprise com IdP corporativo (Okta, Azure AD). PME se autentica com email+senha ou Google OAuth — zero demanda de SAML. O upstream já restringe a `CLOUD` e `ENTERPRISE` e flag `SAML`.
- **Risco se mantiver**: PME abre Security esperando configurar 2FA ou algo relevante — encontra integração SAML. Cria impressão de produto complexo demais.
- **Plano de gate**: flag `algorythmo_security_settings` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Security ~L793), `app/javascript/dashboard/routes/dashboard/settings/security/security.routes.js` (meta).
- **Confiança**: high

---

### CUT-007 — Billing Settings

- **Surface**: Menu "Billing" em Settings (`billing.routes.js`) + item no sidebar (`Sidebar.vue` ~L799).
- **Por que cortar**: A página de Billing do Chatwoot upstream é específica do modelo SaaS cloud deles (Stripe, planos, upgrading). O Algorythmo OS vai ter seu próprio modelo de billing quando chegar a hora — e certamente não será a tela do Chatwoot. O upstream já restringe a `CLOUD`. Mostrar uma tela de billing que não funciona para nosso contexto é confuso e pode assustar PME.
- **Risco se mantiver**: PME clica em Billing para ver quanto paga, encontra a interface de billing do Chatwoot (ou erro), fica confuso sobre "quem é o vendedor aqui".
- **Plano de gate**: flag `algorythmo_billing_settings` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Billing ~L799), `app/javascript/dashboard/routes/dashboard/settings/billing/billing.routes.js` (meta).
- **Confiança**: high

---

### CUT-008 — Agent Bots

- **Surface**: Menu "Agent Bots" em Settings (`agentBot.routes.js`) + item no sidebar (`Sidebar.vue` ~L744).
- **Por que cortar**: Agent Bots é o mecanismo de bot externo do Chatwoot via API (webhook → bot). No Algorythmo OS, o equivalente é o Manu/agentes operacionais configurados via BYOK — um modelo radicalmente diferente. Manter "Agent Bots" ao lado de onde futuramente ficará "Manu" cria confusão de nomes e propósitos.
- **Risco se mantiver**: PME tenta configurar "um bot" entrando em Agent Bots — não vai conseguir (requer endpoint de bot externo), enquanto a interface correta (Manu) ainda não existe no MVP. Dois caminhos de bot conflitantes na mesma settings.
- **Plano de gate**: flag `algorythmo_agent_bots` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Agent Bots ~L744), `app/javascript/dashboard/routes/dashboard/settings/agentBots/agentBot.routes.js` (meta).
- **Confiança**: high

---

### CUT-009 — Macros

- **Surface**: Menu "Macros" em Settings (`macros.routes.js`) + item no sidebar (`Sidebar.vue` ~L751).
- **Por que cortar**: Macros são sequências de ações pré-gravadas que um agente humano executa com um clique (atribuir, etiquetar, responder, fechar). Essa funcionalidade é substituída naturalmente pelo Manu (M4), que executa ações de CRM de forma inteligente via LLM. Expor Macros agora é oferecer o paradigma antigo de automação que o produto está superando.
- **Risco se mantiver**: PME gasta tempo configurando macros (ações programadas) quando deveria conectar canal e aguardar M4 (Manu). Duas formas de automação em paralelo criam confusão de quando usar qual.
- **Plano de gate**: flag `algorythmo_macros` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Macros ~L751), `app/javascript/dashboard/routes/dashboard/settings/macros/macros.routes.js` (meta).
- **Confiança**: high — **founder aprovou cortar (2026-05-23)**. Decisão: paradigma de macros é substituído por Manu (M4); evitar oferecer dois caminhos de automação em paralelo.

---

### CUT-010 — Dashboard Apps (iframe embeds)

- **Surface**: Sub-rota `/settings/integrations/dashboard_apps` dentro de Integrations (`integrations.routes.js`) + componente `DashboardApps/Index.vue`.
- **Por que cortar**: Dashboard Apps permite embutir iframes de apps externos dentro do painel do agente (ex: CRM externo, Shopify, Jira). No Algorythmo OS, o painel já é o produto completo — não faz sentido embutir ferramentas externas dentro de um produto que está sendo construído para substituir essas ferramentas. PME de vendas não tem caso de uso para iframes no painel.
- **Risco se mantiver**: Founder descobre Dashboard Apps e tenta embutir um CRM externo dentro do painel — confunde o posicionamento ("por que vou embutir meu CRM dentro de outro CRM?"). Polui a seção de Integrations.
- **Plano de gate**: flag `algorythmo_dashboard_apps` em `app/javascript/dashboard/routes/dashboard/settings/integrations/integrations.routes.js` (rota `settings_integrations_dashboard_apps`), `app/javascript/dashboard/routes/dashboard/settings/integrations/DashboardApps/Index.vue` (guard ou condição no pai).
- **Confiança**: high

---

### CUT-011 — Advanced Assignment Policy

- **Surface**: Menu "Agent Assignment" em Settings (`assignmentPolicy.routes.js`) + item no sidebar condicionado a `ADVANCED_ASSIGNMENT` (`Sidebar.vue` ~L693).
- **Por que cortar**: Assignment Policy avançada (regras de capacidade por agente, roteamento por carga) é operação de suporte enterprise com times de 20+ agentes. PME com 2-5 pessoas usa atribuição simples por inbox ou manual. Além disso, com Manu vindo no M4, a atribuição vai ser gerenciada pela própria AI — não por regras manuais de capacity.
- **Risco se mantiver**: Como upstream já condiciona a `ADVANCED_ASSIGNMENT` feature flag, risco de exibição indevida é baixo. Mas se a flag estiver habilitada, o item aparece e confunde PME que não tem modelo mental de "capacity planning de agentes".
- **Plano de gate**: flag `algorythmo_advanced_assignment` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (bloco `hasAdvancedAssignment` ~L693 — substituir condição ou adicionar AND com flag algorythmo), `app/javascript/dashboard/routes/dashboard/settings/assignmentPolicy/assignmentPolicy.routes.js` (meta).
- **Confiança**: high — **founder aprovou cortar (2026-05-23)**. Decisão: round-robin simples basta no MVP; M4 Manu vai gerenciar atribuição via AI.

---

### CUT-012a — Reports: Bot (aba)

- **Surface**: Aba "Bot" (`bot_reports`) dentro da seção de Reports no sidebar (`Sidebar.vue` ~L579).
- **Por que cortar**: Bot Reports requer Captain ou Agent Bots ativos (ambos cortados em M0/batch 1). A aba aparece no sidebar de Reports mesmo quando as features correspondentes estão desligadas, resultando em páginas vazias.
- **Risco se mantiver**: PME clica em "Bot" esperando métricas do Manu — não encontra nada (Manu não é um "bot" no sentido do Chatwoot ainda). Cria expectativa errada de que os agentes AI já estariam reportando métricas.
- **Plano de gate**: flag `algorythmo_reports_bot` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Reports Bot ~L579). Rota correspondente pode ter guard adicionado também para completude.
- **Confiança**: high — **founder aprovou cortar (2026-05-23)**.

---

### CUT-012b — Reports: SLA (aba) — MANTIDO

- **Surface**: Aba "SLA" (`sla_reports`) dentro da seção de Reports no sidebar (`Sidebar.vue` ~L573).
- **Status**: **MANTÉM visível — founder decidiu preservar (2026-05-23)**.
- **Decisão**: SLA Reports continua acessível no painel mesmo sem flag de corte. Razão de produto: ainda que PME médio não use SLA agressivamente, o relatório de SLA pode interessar quando o produto migrar pra atender SaaS B2B (futuro).
- **Trade-off técnico conhecido**: enquanto **CUT-003 (SLA Management settings)** estiver cortado, a aba SLA Reports vai exibir dados vazios (sem SLA configurado, não há métrica). Founder ciente. Resolução futura: revisitar CUT-003 (descortar SLA Management) ou aceitar painel vazio até primeiro cliente B2B com SLA pedir.

---

### CUT-013 — Conversation Workflow (Required Attributes + Auto-Resolve config avançada)

- **Surface**: Menu "Conversation Workflow" em Settings (`conversationWorkflow.routes.js`) + item no sidebar (`Sidebar.vue` ~L788).
- **Por que cortar**: Conversation Workflow expõe "Required Attributes" (campos obrigatórios antes de fechar conversa — feature enterprise de SLA/compliance) e a configuração de Auto-Resolve por tempo. Auto-Resolve pode confundir PME: Manu vai gerenciar o ciclo de vida das conversas ativamente (mover Lead para fechado com aprovação humana) — auto-resolve por timeout conflita com esse fluxo.
- **Risco se mantiver**: PME habilita auto-resolve por 1 hora e conversas de lead fecham automaticamente antes de Manu agir. Required Attributes cria fricção de preenchimento que não existe no modelo de auto-create de Leads do Algorythmo OS.
- **Plano de gate**: flag `algorythmo_conversation_workflow` em `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` (item Conversation Workflow ~L788), `app/javascript/dashboard/routes/dashboard/settings/conversationWorkflow/conversationWorkflow.routes.js` (meta).
- **Confiança**: high — **founder aprovou cortar (2026-05-23)**. Decisão: ciclo de vida de conversas será gerenciado por Manu (M4); auto-resolve por timeout conflita com esse fluxo. Required Attributes adiciona fricção sem ganho no modelo Algorythmo.

---

## Resumo final (pós-decisão founder 2026-05-23)

| Status | Cortes |
|---|---|
| **Cortar (gate aplicado em C.2-C.4)** | CUT-001 Campaigns, CUT-002 Help Center, CUT-003 SLA Management, CUT-004 Audit Logs, CUT-005 Custom Roles, CUT-006 Security (SAML), CUT-007 Billing, CUT-008 Agent Bots, CUT-009 Macros, CUT-010 Dashboard Apps, CUT-011 Advanced Assignment, CUT-012a Bot Reports, CUT-013 Conversation Workflow |
| **Manter visível** | CUT-012b SLA Reports (founder pediu preservar — atenção ao trade-off técnico com CUT-003) |

**Total: 13 surfaces cortadas, 1 preservada.**

## O que NÃO está nesta lista (justificativa)

- **Captain** — já gated via `algorythmo_show_captain: false` desde M0. Não duplicar aqui.
- **Automation builder** (`automation_list`) — Manu no M4 não substitui automações simples (ex: auto-tag por keyword, distribuição por inbox). PME pode precisar de automação básica como ponte até M4. Candidato para batch 2 (Trilha E) após M1/M2 correrem.
- **Canned Responses** (`canned_list`) — Ainda útil para agentes humanos que atendem conversas antes de M4. Candidato para Trilha E depois que Manu cobrir volume suficiente.
- **Integrations gerais** (`settings_applications`) — Webhooks e integrações de canal (WhatsApp, email) são core do produto. Apenas sub-rotas específicas (Dashboard Apps) são cortadas.
- **Custom Attributes** — Útil para enrichment de contato/conversa. Mantém compatibilidade com CRM M1 (campos extras no Lead drawer). Candidato para revisão pós-M1.
- **Reports gerais** (overview, conversation, agent, inbox, team, label, CSAT) — Relatórios de conversas são core pra PME que quer enxergar volume de atendimento. CSAT tem valor direto. Cortar só as abas sem dados reais (Bot, SLA).
- **Labels** — Core de organização de conversas e contatos. Permanece.
- **Teams** — Necessário para organizar agentes humanos + Manu em grupos por especialidade. Permanece.
