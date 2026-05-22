# ADR-0007 — Camada Algorythmo é estratégica, não operacional

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)
**Depende de:** [ADR-0002](0002-agentes-operacionais-no-cliente.md), [ADR-0003](0003-brain-embutido-no-ambiente-do-cliente.md)

## Contexto

ADR-0002 estabelece que agentes operacionais (Manu etc) vivem no ambiente do cliente, não na Algorythmo. Então qual é o papel da camada Algorythmo na arquitetura, além de fornecer software e hosting?

**Insight da sessão:** a Algorythmo opera um **time de agentes "diretores AI"** — uma camada estratégica que olha pra todos os clientes e propõe melhorias cross-cliente.

## Decisão

**Algorythmo opera um time C-level de agentes estratégicos.** Esse time:

- **Não atende leads.** Operação fica nos agentes do cliente (ADR-0002).
- **Olha métricas agregadas** de todos os clientes (com consent explícito).
- **Detecta padrões, quebras e oportunidades** cross-cliente.
- **Propõe melhorias:** pra plataforma (features novas), pra agentes operacionais (templates v2, v3), pra clientes individuais (insights de performance, alertas).
- **Pode virar produto premium monetizável:** "Diretor de IA terceirizado" pra clientes que querem camada estratégica AI sem contratar time próprio.

## Alternativas consideradas

- **Sem camada estratégica AI (só humanos da Algorythmo):** não escala com base de clientes; humanos não conseguem olhar padrões em N clientes simultaneamente.
- **Camada estratégica AI puro (sem humano):** sem validação humana, propostas viram lixo sem freio. Risco alto.
- **Camada híbrida AI + humano (escolhido):** AI detecta e propõe, humanos da Algorythmo validam e priorizam o que vira ação.

## Consequências

### Positivas
- **Escala sem contratação linear:** time C-level AI cresce em capacidade, não em headcount humano.
- **Plataforma se melhora sozinha:** padrões cross-cliente viram features e templates de agente novos sem PMs caçando insights.
- **Cliente ganha "Diretor de IA" sem contratar:** narrativa de venda forte pra PME que sabe que precisa de IA mas não sabe como operar.
- **Receita premium possível:** monetizar acesso direto ao time C-level como pacote enterprise.

### Negativas / trade-offs
- **Telemetria precisa de consent rigoroso:** time C-level só vê o que o cliente autorizou. Sem zona cinza.
- **Granularidade da telemetria é decisão sensível:** muito agregada = pouco insight; muito granular = risco de privacy.
- **Pode confundir cliente no início:** "qual a diferença entre o Manu que atende meu lead e o 'diretor AI' da Algorythmo?" — comunicação precisa ser clara.

### Mitigações
- **Consent e granularidade definidos no desenho, não retrofit:** ADR de telemetria a ser criada antes de qualquer dado ser coletado em produção.
- **Material de venda clarifica os dois papéis:** Manu trabalha PRA o cliente; time C-level Algorythmo trabalha PRA a plataforma evoluir (e opcionalmente PRO cliente, no pacote premium).
- **Time C-level NUNCA acessa conteúdo bruto:** só métricas e padrões. Conteúdo permanece no ambiente do cliente (ADR-0002, ADR-0003).

## Pendente

- Definir granularidade exata de métricas coletadas (e ADR específica de telemetria).
- Formato de relatório do time C-level pro cliente (frequência, conteúdo, canal).
- Modelo de pricing pra acesso premium ao time C-level.
- Catálogo inicial de "alertas" e "propostas" que o time C-level pode disparar.
- Definir composição inicial do time C-level (quais "diretores" — produto, ops, atendimento, vendas).
