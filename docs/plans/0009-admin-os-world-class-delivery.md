# Plano 0009 — Admin OS World-Class Delivery (orquestração da entrega única)

**Status:** ATIVO — orquestração. Founder pediu entrega única, padrão world-class, time completo.
**Data:** 2026-05-29
**Owner:** Gustavo (founder/CEO). Orquestrador: Claude (Opus). Execução: designer + 3 engenheiros + QA + adversarial-reviewer.
**Linhagem:** executa o backlog remanescente do plano `0008` (milestones C2–C7) + `engines/algorythmo/DESIGN.md` (Cinematic OS v2) + a lista de alterações do founder (2026-05-29) + o Design Direction Brief.
**Escopo:** **frontend somente** (convenção estabelecida: zero migration/controller/job). Painel do CEO/admin (company admin). **Login DEFERIDO** — sessão separada, por decisão explícita do founder.
**Entrega:** única, completa e verificada no ambiente vivo. Gate visual único = aprovação da direção de design (preview) antes do build em massa, pra não repetir a reprovação do v1.

---

## 0. Diagnóstico (por que o founder viu ~20%)

Três causas distintas, não "trabalho não feito":

1. **Estrutura construída mas não visível.** Os 8 setores na ordem certa, desdobramentos, Campaigns→Marketing, Help Center→Commercial, chat de agente — tudo existe no código (M2-a..g, M5, M6.1). Mas os "cut-flags" default OFF = superfícies Chatwoot continuam visíveis, e/ou a build atual não está publicada no ambiente do founder.
2. **Buracos funcionais reais.** CRM vazio (motor existe, sem leads de demo) + bug do fundo branco; agente na lateral em vez do rodapé; colapso da sidebar; fontes inconsistentes; resquícios Chatwoot.
3. **Camada premium nunca construída.** Só C1 (tema dark flat) shipou. C2–C7 (componentes-assinatura, glass+grain, motion, Aurora Orb, Planet Avatars, CRM kanban) estão speccados e NÃO implementados. Este é o maior gap real.

Identidade cromática viva = **Aurora Gradient** (magenta→rosa→violeta), já definido no DESIGN.md, = a esfera da "Ref design 2". Confirmado pelo founder ("use as cores das referências").

---

## 1. Master checklist (cada item da lista do founder → owner → status)

Status: ☐ pendente · ◐ em progresso · ✅ verificado no ar (print do QA)

### Global (toda a plataforma)
- [ ] **G1** Purgar identidade Chatwoot remanescente: azul `#1F93FF`, emojis em chrome, fontes Lato/Open Sans → identidade única. *(Eng-3)*
- [ ] **G2** Aplicar o esquema de fontes "de Operations" em toda a plataforma — reconciliar com o type system do DESIGN.md (Inter/Geist). *(Designer define → Eng-3 aplica)*
- [◐] **G3** Camada premium: glassmorphism + grain, animações/motion ambiente, profundidade, Aurora Orb, Sunburst Orb. *(Designer ✅ direção aprovada 2026-05-29 + preview em `docs/plans/cinematic-os/preview/`. Fundação em build.)*
- [ ] **G4** Ordem dos setores em Management: Commercial · Marketing · Operations · Procurement · HR · Facilities · Finance · Administration. *(já no código — Eng-3 confirma no ar)*
- [ ] **G5** Padrão chat do agente: tirar da lateral → último elemento da página, "Fale com o agente do setor '[nome]'" + ícone no topo que rola até o chat. Em TODOS os overviews. *(Eng-2)*
- [ ] **G6** Fazer aparecer: ligar cut-flags no tenant (some Bot/Labels/Inbox top, Campaigns top-level, Help Center top-level) + publicar build atual. *(Eng-3 + orquestrador)*

### CRM
- [ ] **C-1** Board renderiza colunas + cards com drag-and-drop, populado com leads de demo no padrão da REF CRM (Novo Lead/Qualificado/Proposta Enviada/Negociação; card = nome, canal, data, tempo-na-etapa). Estrutura da ref, design do brief (colunas em cor semântica atenuada, não saturada). *(Eng-1)*
- [ ] **C-2** Corrigir o fundo branco no meio da interface preta. *(Eng-1)*

### Commercial (era "Commercial Reports")
- [ ] **D1** Tirar "Reports" do nome → "Commercial". *(Eng-3)*
- [ ] **D2** Eliminar área "Bot". *(Eng-3 — cut-flag reports_bot)*
- [ ] **D3** Eliminar área "Labels". *(Eng-3 — cut-flag reports_labels)*
- [ ] **D4** Eliminar área "Inbox". *(Eng-3 — cut-flag reports_inbox)*
- [ ] **D5** Colapso da sidebar: ocultar TODOS os desdobramentos (não deixar o último selecionado aparecendo) + setinha pra baixo indicando que há desdobramentos. *(Eng-3)*
- [ ] **D6** Help Center → aba "Customer Support" dentro de Commercial. Conteúdo (spec founder): requisições que chegam ao setor, taxa de conversão de resolução, integração Reclame Aqui, status/visibilidade dos problemas. Remover settings/locales/categories/articles. *(Eng-2)*

### Setores — cada um: Overview (resumo de métricas) + desdobramentos com drill-down + chat do agente no rodapé (G5)
- [ ] **S-OP** Operations: estoque · reposição · logística · organização · entrega · expedição. *(Eng-2)*
- [ ] **S-PR** Procurement: fornecedores · reposição · custo de mercadoria · análise de giro. *(Eng-2)*
- [ ] **S-AD** Administration: estratégia · metas · análise de indicadores. *(Eng-2)*
- [ ] **S-FI** Finance: contas a pagar · contas a receber · fluxo de caixa · margem · lucro · planejamento financeiro. *(Eng-2)*
- [ ] **S-HR** HR: contratação · treinamento · cultura · produtividade. *(Eng-2)*
- [ ] **S-MK** Marketing: branding · campanhas · redes sociais · tráfego · CRM · retenção. *(Eng-2)*
- [ ] **S-FA** Facilities (NOVO): desdobramentos Controle + Overview. Controle = adicionar unidade + preencher tabela de gastos por unidade (higiene, limpeza do espaço, equipe de limpeza). Overview = métricas + chat. *(Eng-2)*

### Movimentações
- [ ] **F1** Campaigns: deixa de ser setor → aba "Campanhas" dentro de Marketing, com a mesma funcionalidade já oferecida. *(Eng-2/Eng-3)*
- [ ] **H1** Help Center: deixa de ser setor → Commercial > Customer Support (= D6). *(Eng-2/Eng-3)*

### Diferido
- **LOGIN** — tirar logo Chatwoot, interface premium, logo-icon no topo, upload de logo do cliente (ou nada). **Sessão separada**, por decisão do founder. Não entra nesta entrega.

---

## 1.5 Baseline confirmado (QA no ambiente vivo, 2026-05-29) — evidência em `docs/plans/cinematic-os/baseline/`

App ESTÁ publicada e branded ("Algorythmo OS", dark, teal, sem azul/logo/emoji Chatwoot). Reality por item:
- **8 setores + ordem + Campaigns-em-Marketing:** ✅ vivos. Overviews com dados de demo + subtabs, consistentes — só falta premium (glass/motion).
- **CRM (P0 🔴):** painel branco 834×900 (`alg-kanban`) com empty-state Chatwoot ("pipeline vazio / conecte canal") + botão azul `#2563EB`. Sem colunas/cards. Motor existe; não renderiza board + sem dados demo. → **C-1 + C-2 são o item mais urgente.**
- **Commercial:** ainda é o módulo Reports cru do Chatwoot. "Overview" = página Reports do Chatwoot (não overview de setor). Tabs Bot/Labels/Inbox/Agents/Team/CSAT/SLA todos visíveis. → D1 rename + D2/3/4 ligar cut-flags reports_bot/labels/inbox + D6 Customer Support + aplicar premium + agente no rodapé. (Manter analytics comercial como conteúdo; não rebuildar do zero.)
- **Help Center:** ainda top-level (Articles/Categories/Locales/Settings → portal Chatwoot cru). → ligar `help_center_top_level` SÓ depois que Customer Support (D6) existir em Commercial.
- **Agente do setor:** flutua canto inferior-ESQUERDO sobrepondo a grid. → G5: mover pro rodapé do fluxo da página + ícone scroll-to no topo.
- **Resíduos Chatwoot:** cards de onboarding ("create inbox / invite team / canned / labels") ainda na home; botão azul `#2563EB` no CRM. → G1 sweep.

Implicação de orquestração: o "fazer aparecer" (G6) é flip de cut-flags (HelpCenter top-level, Bot/Labels/Inbox) no tenant vivo — flip de HelpCenter SÓ após D6 pronto. CRM é P0. Premium é o maior volume.

## 2. Time e responsabilidades

| Agente | Modelo | Frente |
|---|---|---|
| **Designer** | Opus | Valida/fecha DESIGN.md v2 contra as 5 referências; produz o **preview de aprovação** (1 tela hero + CRM + sidebar) e os tokens/specs prontos pra implementação. Define G2 (fontes). |
| **Eng-1 (CRM)** | Sonnet/Opus | C-1, C-2 + polish do board ao brief. |
| **Eng-2 (Setores)** | Sonnet/Opus | S-OP/PR/AD/FI/HR/MK/FA + G5 (agente no rodapé) + D6 + F1. |
| **Eng-3 (Global)** | Sonnet/Opus | G1, G2(aplicação), G4(confirmar), G6(flags+deploy), D1-D5. |
| **QA** | Opus | Baseline no ar HOJE → verifica cada item com print. Nada fecha sem evidência. |
| **Adversarial** | Opus | Tenta quebrar + caça o que faltou (mira no modo-de-falha "20%"). |
| **Orquestrador** | Opus | Segura este checklist; só fecha com 100% verificado. |

## 3. Sequência (respeita a dependência real)

1. **Gate de design (agora):** designer produz o preview → founder aprova a DIREÇÃO visual (único gate, evita retrabalho dos 8 setores na direção errada).
2. **Build paralelo (pós-aprovação):** Eng-1 / Eng-2 / Eng-3 em worktrees isolados.
3. **Verificação:** QA no browser real (baseline + cada item) + adversarial.
4. **Make-visible + deploy:** flags ligadas + build publicada no ambiente do founder.
5. **Teste final do CEO:** founder abre no monitor 27". Passa o teste do brief, ou não fechou.

## 4. Dependências de curadoria humana (§1 do 0008) — placeholders não bloqueiam
Fontes Geist self-host · library de planetas SVG · hero photography. Interim programático segura 90%. Founder decide depois se contrata brand designer pra fidelidade final.

## 5. Bloqueador aberto
- **Acesso ao ambiente vivo** (URL + login admin, ou confirmação de uso do ambiente publicado). Necessário pra QA baseline + G6 (fazer aparecer/deploy). Build não bloqueia; verificação e make-visible sim.
