# ADR-0003 — Brain mora junto do fork no ambiente do cliente

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)
**Depende de:** [ADR-0002](0002-agentes-operacionais-no-cliente.md), [ADR-0006](0006-hospedagem-algorythmo-padrao.md)

## Contexto

A plataforma incorpora o **Company Brain** — a "memória viva" da empresa do cliente. Não é só um banco de embeddings: é memória + contexto + ajustes + **tradutor** que ensina os agentes operacionais a falarem com a cara da empresa.

Pergunta: **onde o Brain mora?**

## Decisão

**Brain vive no ambiente isolado de cada cliente, junto do fork e dos agentes operacionais (ADR-0002).** Cada cliente tem o seu próprio Brain, sob seu domínio. Não há Brain central da Algorythmo.

## Alternativas consideradas

- **Brain como serviço central multi-tenant da Algorythmo:** mais simples de operar do ponto de vista de infra, mas viola princípio LGPD de dado-no-cliente e cria dependência crítica em ponto único de falha. Descartada.
- **Brain embutido (escolhido):** isolamento natural, LGPD por design, cliente dono do próprio cérebro.

## Escopo do Brain (o que ele faz)

- **Memória:** indexa conversas, leads, deals, tickets, docs internos da empresa.
- **Contexto:** mantém perfil da empresa (tom de voz, produtos, regras, FAQs, políticas).
- **Tradutor:** ensina os agentes operacionais (Manu etc) a falarem como a empresa fala.
- **Ajustes:** o cliente edita comportamento do Brain ("Manu nunca promete prazo abaixo de 7 dias", "responder em tom mais formal pra leads enterprise").
- **Cache local:** respostas a perguntas triviais (horário, política de troca, FAQ) sem precisar bater na LLM externa.
- **Modo degradado:** templates locais cobrem operação básica se LLM externa indisponível.

## Consequências

### Positivas
- **LGPD por design:** memória da empresa nunca sai do ambiente do cliente.
- **Personalização extrema:** Brain reflete 100% a empresa que opera. Sem média entre clientes.
- **Cliente dono do cérebro:** se sair da Algorythmo um dia, leva. Argumento de venda + ética de produto.
- **Failure isolation:** Brain do cliente A cair não afeta B, C, D.
- **Cache + modo degradado nativos:** custo e disponibilidade desacoplados da LLM externa do cliente.

### Negativas / trade-offs
- **Operação por cliente mais cara:** cada cliente carrega custo de storage + compute do próprio Brain.
- **Updates de engine fragmentados:** melhoria no motor do Brain precisa ser distribuída pra cada ambiente.
- **Time C-level (ADR-0007) tem visão limitada:** vê só métricas agregadas autorizadas, não conteúdo bruto. Inferência precisa ser cuidadosa.

### Mitigações
- **Hosting Algorythmo padrão (ADR-0006):** custo de operação fica eficiente por economia de escala da infra Algorythmo, mantendo isolamento lógico.
- **Engine de Brain versionado:** updates seguem o mesmo padrão de versionamento dos templates de agentes (ADR-0002) — opt-in canary, com pinning de versão.
- **Cache local + modo degradado:** Brain responde perguntas triviais sem ir até a LLM externa, e segue respondendo com templates locais se LLM externa cair.
