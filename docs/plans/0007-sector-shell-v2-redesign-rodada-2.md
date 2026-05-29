# Plano 0007 — Algorythmo OS Redesign Rodada 2: Sector Shell v2 + IA dos 8 setores

**Status:** APPROVED — destrava implementação. Founder aprovou DESIGN.md Cinematic OS v2 (PR #83 mergeado em `algorythmo/main` 2026-05-28). Sucede plano 0006 (M6.1 mergeado).
**Data:** 2026-05-28
**Owner:** Gustavo (founder/CEO Algorythmo)
**Linhagem:** consome decisões do briefing executivo "Design Direction Brief — Plataforma Enterprise Premium" (founder, 2026-05-28) + decisões trancadas nesta sessão. Não retorna ao planner/office-hours porque o briefing executivo + as decisões D1-D17 abaixo + DESIGN.md v2 cobrem todo o escopo.
**Escopo:** **frontend somente.** Reestruturação da sidebar Management, criação do componente `SectorShellV2` (Overview agregada + sub-abas + chat agente no fim + jump-to-chat), reorganização dos 7 setores existentes em sub-abas + criação do setor novo **Facilities**, remoção de Campaigns e Help Center como top-level. Sem polish cinematográfico final (Sunburst Orb, Aurora Orb, Planet Avatars, Hero Photography) — isso é PR 6.

---

## 1. Visão da entrega

Founder loga como admin. Sidebar abre o bloco **Management** com **8 setores na ordem nova** — cada um com chevron indicando sub-itens. Clicar em qualquer setor abre a tela do setor com **abas no topo** (Overview default + sub-abas operacionais). Overview renderiza **central de dados densa** — 1 dashboard anchor por sub-área agregado em grid. No topo da página, **ícone seta-para-baixo** salta direto pro chat. No fim da página, **chat agente full-width** rotulado "Fale com o agente do setor {nome}". Sub-abas renderizam visão aprofundada de cada item.

**Sidebar bloco Management — ordem nova:**

```
MANAGEMENT
  ▾ Commercial            ◄ era "Relatórios Comerciais", agora 1º
      • Overview
      • Operations / Conversation / Agents / Teams / SLA / CSAT  (Chatwoot legado)
      • Customer Support  ◄ ex-Help Center (sem settings/locales/categories/articles)
  ▾ Marketing             ◄ 2º
      • Overview / Branding / Campanhas (ex-top-level) / Redes Sociais / Tráfego / CRM / Retenção
  ▾ Operations            ◄ 3º (era "Operação")
      • Overview / Estoque / Reposição / Logística / Organização / Entrega / Expedição
  ▾ Procurement           ◄ 4º (era "Compras")
      • Overview / Fornecedores / Reposição / Custo de Mercadoria / Análise de Giro
  ▾ HR                    ◄ 5º (era "RH")
      • Overview / Contratação / Treinamento / Cultura / Produtividade
  ▾ Facilities            ◄ 6º — SETOR NOVO
      • Overview / Controle
  ▾ Finance               ◄ 7º (era "Financeiro")
      • Overview / Contas a Pagar / Contas a Receber / Fluxo de Caixa / Margem / Lucro / Planejamento
  ▾ Administration        ◄ 8º (era "Administração")
      • Overview / Estratégia / Metas / Análise de Indicadores
```

**Top-level removidos:** Campaigns (vira sub-aba de Marketing), Help Center (vira sub-aba "Customer Support" dentro de Commercial sem settings/locales/categories/articles).

**Critério de pronto:** abrir cada um dos 8 setores, ver Overview com KPIs agregados de cada sub-área + chat no fim, clicar em cada sub-aba e ver visão aprofundada, clicar no botão jump-to-chat e ser levado ao chat. Sidebar colapsa sem vazar item selecionado. Chevron indica que tem sub-itens. WCAG AA gate passando.

---

## 2. Decisões trancadas

| ID | Decisão | Justificativa |
|---|---|---|
| **D1** | Ordem Management: Commercial / Marketing / Operations / Procurement / HR / Facilities / Finance / Administration. | Founder (rodada 2, 2026-05-28). |
| **D2** | Overview de cada setor = **central de dados densa** — 1 dashboard anchor agregado por sub-área + chat no fim. NÃO é tela hero cinematográfica. | Founder ("Overview é a central de dados, com principais dashboards de cada setor", 2026-05-28). Memory `project_sector_overview_pattern.md`. |
| **D3** | Componente template **`SectorShellV2`** novo. Substitui `SectorDashboard.vue` que era single-view. Suporta abas nativas + jump-to-chat + chat ancorado no fim em full-width. `SectorDashboard.vue` legado preservado por enquanto (deprecated comment) — remoção depois que todos 8 setores migrarem. | Reuso de shell evita 8× copia. Single source of truth pra padrão Overview+sub-abas+chat. |
| **D4** | Chat agente vai no **fim da página em full-width**, NÃO em rail lateral 360px. String i18n: `ALGORYTHMO_ADMIN.SECTORS.{SETOR}.AGENT_CHAT_HEADING` = "Fale com o agente do setor {nome}". | Founder (rodada 2). Substitui padrão M6.0 do rail 360px (que reusava `.alg-agent*` lateral). |
| **D5** | Botão **jump-to-chat** no topo direito do header da página — ícone `i-lucide-arrow-down-circle` que faz `scrollIntoView({behavior:'smooth'})` no chat ancorado embaixo. `aria-label` = "Pular pro chat com o agente do setor {nome}". | Founder (rodada 2). |
| **D6** | Sidebar Management: **chevron `▾` ao lado do label** indica que setor tem sub-itens. Estado `expanded` controla visibilidade dos sub-itens. Ao colapsar, **TODOS os sub-itens somem** (fix do bug "último item selecionado vaza"). Estado persiste por usuário em `localStorage` (key `algorythmo:sidebar:expanded:{userId}`). | Founder (rodada 2). |
| **D7** | Sub-aba **Customer Support** dentro de Commercial recebe o conteúdo útil do Help Center (artigos + categorias visualização). **Remover**: Settings, Locales, Categories management, Articles management (rotas Chatwoot upstream legadas). Manter: leitura de artigos pra suporte ao cliente. | Founder (rodada 2). |
| **D8** | Marketing sub-aba **Campanhas** absorve o Campaigns top-level (rotas existentes `one_off` + `ongoing`). Top-level Campaigns sai da sidebar. Rotas continuam vivas — só não aparecem mais como entry top-level. | Founder (rodada 2). Reuso de rota Chatwoot sem refactor de URL. |
| **D9** | **Facilities (novo)**: módulo `app/javascript/dashboard/modules/algorythmo/admin/facilities/` com `routes.js` + `FacilitiesShell.vue` (extends SectorShellV2). Sub-aba Overview agrega gastos consolidados. Sub-aba Controle: tabela de **unidades** + tabela de **gastos** (schema flex: categoria + valor + data + nota). **Estado client-side** (localStorage) v0 — sem backend. Quando founder pedir persistência multi-user, vira backend task. | Decisão de produto founder + restrição "frontend only" do plano. |
| **D10** | Cada setor ganha **1 cut-flag por sub-aba sensível** + 1 cut-flag pro setor inteiro. Convenção: `algorythmo_cut_{setor}` (esconde setor) + `algorythmo_cut_{setor}_{subtab}` (esconde sub-aba). Default OFF (= ON visível). | Memory `project_cut_flag_convention.md`. |
| **D11** | i18n: criar bloco novo `ALGORYTHMO_ADMIN.SECTORS.{SETOR}.{SUBTAB}.*` em pt_BR override. Renomear labels visíveis na sidebar pra **inglês conforme briefing** (Commercial, Marketing, Operations, Procurement, HR, Facilities, Finance, Administration). Sub-abas em **português** (Estoque, Reposição, Logística, etc.) — convenção Algorythmo PME-Brasil. | Founder (briefing usa labels em inglês pros setores, sub-itens em PT). |
| **D12** | Overview agregada usa **mock realista por sub-área**. Padrão `mocks/sectors/contract.js`: 1 anchor KPI + 1 chart mini por sub-área, agregado em grid de N colunas (responsivo). Watermark "DADOS DE DEMONSTRAÇÃO" mantida em cada card (memory M6.0 / M6.1 contrato). | Reusa padrão D12 do plano 0006. Mitigação de risco "mock vira source-of-truth". |
| **D13** | Pipeline deploy: GH Actions builda imagem, Easypanel faz pull. **NÃO buildar local.** | Memory `project_deploy_pipeline_external_build.md`. |
| **D14** | Polish cinematográfico final (Sunburst Orb / Aurora Orb / Planet Avatars / Hero Photography / Glass agressivo+grain) **fica de fora deste plano**. Entra no PR 6 da rodada 2. Aqui aplicamos os tokens `--alg-*` existentes + glass-soft + density-operational + cards `.alg-card` + `.alg-sector*` v1. | Sequência founder: estrutura primeiro, cinemato depois. |
| **D15** | CRM kanban (parte funcional) **fica de fora deste plano**. PR 4 da rodada 2 cobre. | Sequência founder. |
| **D16** | Login premium + white-label de logo **fica de fora deste plano**. PR 3 da rodada 2 cobre. | Sequência founder. |
| **D17** | Purga global de identidade Chatwoot residual (azul, emojis, Lato/Open Sans) **fica de fora deste plano**. PR 5 da rodada 2 cobre — varredura sistemática separada. | Sequência founder. Aqui novos componentes JÁ nascem dentro do token system Algorythmo (sem azul Chatwoot). |

---

## 3. Restrições operacionais

- **Frontend somente.** Nada de migration / controller / job / service.
- Reusar `.alg-*` tokens existentes (DESIGN.md v2 mergeado). Glass `--alg-glass-soft`, density `operational`, elevation `--alg-elevation-2`. Sem azul Chatwoot.
- Marcação `// algorythmo:` em qualquer linha de arquivo upstream tocado.
- Cut-flags `algorythmo_*` continuam gate único.
- `SectorDashboard.vue` v1 preservado durante migração — só remove depois que todos 8 setores rodam em `SectorShellV2`. Aviso de deprecation no topo do arquivo.
- WCAG AA gate (`@axe-core/playwright`) continua válido — qualquer violation `critical`/`serious` reprova.
- Convenção Conventional Commits — tipos válidos: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`. NÃO usar `design:` (CI reprova).

---

## 4. Mapa de superfícies a tocar

| Superfície | Path | Ação |
|---|---|---|
| Sidebar | `app/javascript/dashboard/components-next/sidebar/Sidebar.vue` | Reordenar bloco Management (D1). Adicionar chevron + expand state (D6). Esconder Campaigns + Help Center top-level (D8 + D7). Adicionar entry Facilities (D9). Renomear labels (D11). |
| i18n override | `engines/algorythmo/app/javascript/i18n/overrides/pt_BR.json` | Bloco `ALGORYTHMO_ADMIN.SECTORS.{SETOR}.{SUBTAB}` + heading `AGENT_CHAT_HEADING` por setor (D4 + D11). Labels novos sidebar. |
| Cut flags registry | `app/javascript/dashboard/store/modules/algorythmoCutFlags.js` | Adicionar 8 cut-flags por setor + 1 por sub-aba sensível (D10). Mirror server (`feature_flag_bits.rb`) se aplicável. |
| Sector shell v2 | `app/javascript/dashboard/modules/algorythmo/admin/sectors/SectorShellV2.vue` | **NOVO.** Slots `overview` / `subtabs` / `agentChat`. Renderiza header com title + jump-to-chat button, tabs nativas, slot content, chat ancorado fim full-width. |
| Sector shell v1 (deprecated) | `app/javascript/dashboard/modules/algorythmo/admin/sectors/SectorDashboard.vue` | Adicionar comment header `@deprecated — migrar pra SectorShellV2 (plano 0007)`. NÃO remover ainda. |
| Mocks por sub-área | `app/javascript/dashboard/modules/algorythmo/admin/mocks/sectors/` | Expandir mocks de cada setor pra cobrir 1 anchor por sub-área + chart mini (D12). |
| Modules existentes | `modules/algorythmo/admin/{operacao,compras,rh,financeiro,administracao,marketing}/` | Migrar do v1 pro `SectorShellV2`. Criar sub-rotas por sub-aba (D1 listas). |
| Commercial overlay | `modules/algorythmo/admin/reports-commercial/` + `routes/dashboard/settings/reports/reports.routes.js` | Migrar Overview pro SectorShellV2. Esconder Bot/Labels/Inbox da sidebar via cut-flag (D10). Adicionar sub-aba Customer Support (D7) consumindo views simplificadas do Help Center. |
| Facilities (novo) | `modules/algorythmo/admin/facilities/{routes.js, FacilitiesShell.vue, ControlePane.vue, OverviewPane.vue, mocks/facilities.js}` | Criar setor novo (D9). Estado client-side via localStorage. |
| Specs cut-flag coverage | `app/javascript/dashboard/routes/specs/algorythmoCutFlagCoverage.spec.js` | Atualizar pra cobrir as flags novas (D10). |
| Specs sidebar | `app/javascript/dashboard/components-next/sidebar/specs/` ou equivalente | Spec do colapso sem vazamento (D6) + ordem Management (D1) + chevron presence. |

---

## 5. Milestones (cada um = 1 PR encadeado)

PR 2 lógico vira sequência de PRs físicos pra facilitar review.

| MS | Escopo | Saída |
|---|---|---|
| **M2-a** | Sidebar refundada (D1 ordem + D6 chevron+colapso + D7 esconder HelpCenter top-level + D8 esconder Campaigns top-level + D11 labels EN + D10 cut-flags por setor + D9 entry Facilities placeholder). Spec colapso + ordem. | PR 1: `feat(M2-a): sidebar management v2 — ordem + colapso + chevron` |
| **M2-b** | Componente `SectorShellV2` novo + slots overview/subtabs/agentChat + jump-to-chat + chat full-width fim. Spec componente. Storybook-style demo isolado. | PR 2: `feat(M2-b): SectorShellV2 component — overview + subtabs + agent chat` |
| **M2-c** | Migrar Commercial pro SectorShellV2. Remover Bot/Labels/Inbox da sidebar (cut-flag). Sub-aba Customer Support (D7). Overview agregado mockado. | PR 3: `feat(M2-c): Commercial — SectorShellV2 + Customer Support tab` |
| **M2-d** | Migrar Marketing pro SectorShellV2. Sub-abas (6 itens D1). Campanhas embutida absorve Campaigns top-level (D8). Overview agregado mockado. | PR 4: `feat(M2-d): Marketing — SectorShellV2 + Campanhas embedded` |
| **M2-e** | Migrar Operations + Procurement + Administration pro SectorShellV2. Sub-abas D1. Overview agregado mockado. | PR 5: `feat(M2-e): Operations + Procurement + Administration — SectorShellV2` |
| **M2-f** | Migrar Finance + HR pro SectorShellV2. Sub-abas D1. Overview agregado mockado. | PR 6: `feat(M2-f): Finance + HR — SectorShellV2` |
| **M2-g** | Setor Facilities novo completo (D9): Overview agregado + Controle (tabela unidades + tabela gastos) + chat agente. | PR 7: `feat(M2-g): Facilities sector — Controle + Overview` |
| **M2-h** | Cleanup: remover `SectorDashboard.vue` v1 + remover entry Campaigns top-level + remover entry Help Center top-level + atualizar `algorythmoCutFlagCoverage.spec.js`. | PR 8: `chore(M2-h): retire SectorDashboard v1 + top-level entries` |

**Total:** 8 PRs físicos. Cada um focado, revisável, com cut-flag fallback se algo regredir.

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Sidebar reorder quebra rotas/permissions existentes pra agentes não-admin | Bloco Management já é admin-only (linha 549 `Sidebar.vue`). Reorder não afeta agente. Spec cobre rendering condicional. |
| Migrar 7 setores do v1 pro v2 num PR só explodiria diff | Dividido em M2-c → M2-f (1-3 setores por PR). |
| Remover Bot/Labels/Inbox quebra cliente que dependia | Cut-flag inverso: default OFF (esconde), super-admin pode religar via cut. Convenção memory `project_cut_flag_convention.md`. |
| Sidebar colapso state em localStorage vaza entre contas | Key prefixada por `userId` (D6) — isolamento por sessão. |
| Help Center reduzido (sem settings/categories/articles management) frustra cliente que usava admin Help Center | Esconder ENTRY top-level, **manter rotas vivas** acessíveis via URL direta (não removemos código upstream). Cliente que precisava continua acessando via bookmark. Comunicação posterior se fizer falta. |
| Facilities client-side localStorage perde dado em troca de browser | Aceitação consciente: D9 marca isso como v0. Persistência server-side entra em scope futuro quando founder demandar multi-user. |
| `SectorShellV2` divergir do DESIGN.md v2 | Engineer agent obrigado a ler DESIGN.md v2 antes de implementar. PR passa por `/design-review` antes de merge. |
| Mocks com KPIs irrealistas confundem founder em demo | Watermark "DADOS DE DEMONSTRAÇÃO" obrigatória em cada card (D12). |
| Polish cinematográfico ausente faz o entregue parecer "incompleto" pro founder | Esperado e comunicado: PR 6 da rodada 2 é o polish. Este plano entrega estrutura, não pintura final. |

---

## 7. Cut-flags registry — adição planejada

Novos flags em `algorythmoCutFlags.js` (default OFF = feature ON):

```
sector_commercial          | sector_commercial_customer_support
sector_marketing           | sector_marketing_campanhas / _branding / _redes_sociais / _trafego / _crm / _retencao
sector_operations          | sector_operations_estoque / _reposicao / _logistica / _organizacao / _entrega / _expedicao
sector_procurement         | sector_procurement_fornecedores / _reposicao / _custo / _giro
sector_hr                  | sector_hr_contratacao / _treinamento / _cultura / _produtividade
sector_facilities          | sector_facilities_controle / _overview
sector_finance             | sector_finance_a_pagar / _a_receber / _fluxo / _margem / _lucro / _planejamento
sector_administration      | sector_administration_estrategia / _metas / _indicadores
reports_bot                | reports_labels / reports_inbox  (esconder abas legadas Chatwoot da sidebar Commercial)
campaigns_top_level        | help_center_top_level           (esconder entradas top-level remanescentes)
```

Cobertura completa atualizada em `algorythmoCutFlagCoverage.spec.js`.

---

## 8. Acessibilidade e WCAG AA gate

- Tabs nativas (`<button role="tab">` + `aria-selected` + `aria-controls`). Arrow keys navegam, Home/End início/fim.
- Jump-to-chat button: `aria-label` explícita + foco visível com `--alg-focus-ring`.
- Chat ancorado: `aria-live="polite"` na lista de mensagens; input com `aria-label`.
- Sidebar chevron: `aria-expanded` no botão do setor + `aria-controls` no `<ul>` filho.
- Sidebar colapsa via teclado (Enter / Space no setor) — Esc não fecha (sub-itens não são overlay).
- `prefers-reduced-motion`: tabs trocam sem slide; chevron rotate vira opacity swap.
- `@axe-core/playwright` rodando em CI — qualquer violation `critical`/`serious` reprova PR.

---

## 9. O que NÃO está em escopo

- Cinematic polish final (PR 6 rodada 2)
- CRM kanban (PR 4 rodada 2)
- Login premium + white-label logo (PR 3 rodada 2)
- Purga global Chatwoot residual (PR 5 rodada 2)
- Backend de Facilities (persistência multi-user) — quando founder demandar
- Backend de KPIs reais — quando founder destravar
- Self-host Geist/Söhne — handoff designer humano

---

## 10. Critério de pronto do plano

1. Founder loga como admin → vê Management com 8 setores na ordem D1, chevrons visíveis.
2. Clica em qualquer setor → expande sub-itens; colapsa → todos somem (sem vazamento).
3. Abre Commercial → vê Overview agregado + sub-abas (Operations, Conversation, Agents, Teams, SLA, CSAT) — Bot/Labels/Inbox sumiram da sidebar. Sub-aba Customer Support renderiza views simplificadas.
4. Abre Marketing → vê Overview + 6 sub-abas (Branding, Campanhas, Redes Sociais, Tráfego, CRM, Retenção). Campanhas mostra one_off + ongoing herdadas.
5. Abre Operations / Procurement / HR / Finance / Administration → cada um com Overview + sub-abas D1.
6. Abre Facilities → vê Overview (vazio realista) + Controle (cadastra unidade + adiciona linha de gasto na tabela, persiste em localStorage).
7. Em cada Overview: clica botão jump-to-chat no topo → scroll suave até chat ancorado embaixo, full-width, label "Fale com o agente do setor {nome}".
8. Top-level Campaigns e Help Center sumiram da sidebar.
9. `algorythmoCutFlagCoverage.spec.js` verde.
10. `@axe-core/playwright` verde em todos novos componentes.
11. CI verde (lint, RSpec, Vitest, Playwright, soft-fork integrity).

---

*Fim do plano. Cada milestone vira 1 PR via engineer agent.*
