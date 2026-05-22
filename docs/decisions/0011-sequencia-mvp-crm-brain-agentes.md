# ADR-0011 — Sequência de entrega do MVP: CRM → Brain → Agentes

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

Com 10 ADRs anteriores definindo arquitetura e princípios, falta a sequência de construção. O Algorythmo OS tem três grandes blocos funcionais (CRM Kanban + Brain + Agentes operacionais) e uma frente cross-cutting (limpeza de funcionalidades-ruído do upstream). Em qual ordem construir?

Restrição operacional: o founder vai rodar e validar a aplicação localmente no laptop dele durante o desenvolvimento. Cada marco precisa entregar valor demonstrável no ambiente dele.

## Decisão

**Sequência: CRM → Brain → Agentes (Manu primeiro), com trilha de limpeza paralela desde o início.**

Ordem dos marcos:

1. **M0 — Fundação:** repo privado, rebrand Chatwoot → Algorythmo OS na UI, ambiente local rodando 100% no laptop do founder, CI verde.
2. **M1 — CRM Kanban:** seção própria, cards drag-and-drop entre estágios do funil (ADR-0004).
3. **M2 — Limpeza:** corte de funcionalidades upstream que poluem a experiência (lista de corte definida durante M0/M1).
4. **M3 — Brain MVP:** memória da empresa do cliente, indexação básica, retrieval pra agentes.
5. **M4 — Manu MVP:** primeiro agente operacional, BYOK plug-and-play (ADR-0010), atende conversa de vendas usando contexto do Brain.

M2 (limpeza) corre **paralelo** a M1 e M3 — não bloqueia, mas não fica pra depois (caso contrário a experiência nunca melhora).

## Alternativas consideradas

- **Agentes primeiro.** Tentação: o diferencial do produto é AI. Mas Manu sem Brain é só wrapper de ChatGPT — sem contexto da empresa, sem memória, sem qualidade. Manu sem CRM é agente atendendo no vácuo, sem visibilidade do funil. Descartado.
- **Brain primeiro.** Brain é estrutural, mas sem CRM (caixa de leads) e sem agente (consumidor do Brain), não é validável no piloto local do founder. Vira motor invisível. Descartado como primeiro marco.
- **Limpeza primeiro (grande corte antes de tudo).** Risco: cortar funcionalidades que parecem ruído mas são usadas internamente pelo Chatwoot. Melhor cortar à medida que se mexe nas telas, com contexto de uso. Descartado como bloco isolado.

## Consequências

### Positivas
- Cada marco entrega valor demonstrável no laptop do founder.
- CRM primeiro destrava feedback de modelo de funil — calibra Brain e agentes depois.
- Limpeza paralela impede que o produto carregue peso morto até o fim.
- Sequência reflete dependências reais: Manu precisa de Brain, Brain precisa de caixas (CRM) pra contextualizar leads.

### Negativas / trade-offs
- Demora pra a primeira "wow demo" com AI — só aparece em M4.
- Trilha de limpeza paralela exige disciplina: o que cortar é decisão de produto e precisa de input do founder durante o caminho.

### Mitigações
- Cada marco fecha com critério de aceitação binário (passa/não passa) executável no laptop do founder.
- Lista de "candidatos a corte" mantida em `docs/plans/0001-mvp-algorythmo-os.md` e revisada a cada marco.
- Telas de configuração de Manu (M4) podem ser desenhadas em paralelo durante M3 — design não bloqueia em código.

## Implementação

Detalhamento técnico, trilhas paralelas, critérios de aceitação e dependências vivem em `docs/plans/0001-mvp-algorythmo-os.md`.

## Relacionado

- ADR-0002, ADR-0003 (agentes e Brain no cliente)
- ADR-0004 (CRM Kanban separado)
- ADR-0008 (nome Algorythmo OS — rebrand entra no M0)
- ADR-0010 (BYOK por agente — usado no M4)
