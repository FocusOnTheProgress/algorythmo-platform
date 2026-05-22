# ADR-0004 — CRM como seção separada com Kanban drag-and-drop

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

A plataforma adiciona CRM ao Chatwoot (que originalmente é só helpdesk). Decisão de forma do CRM: integrado às conversas (chip de lead inline) ou seção própria de navegação?

## Decisão

**CRM é seção separada no menu principal**, acessada ao lado de Conversas. Formato **Kanban** com colunas representando estágios do funil de vendas. Cards (leads, deals) deslizam entre colunas com **drag-and-drop**.

## Alternativas consideradas

- **CRM integrado na timeline da conversa:** Manu veria contexto do lead nativamente durante atendimento, mas UX humana ficaria pesada e info estruturada do funil seria difícil de encontrar. Descartada.
- **CRM como seção separada (escolhido):** UX limpa, Kanban familiar pra usuários de pipeline (Pipedrive, HubSpot, Trello mental model).

## Consequências

### Positivas
- **UX clara:** funil é visualmente óbvio. Drag-and-drop é intuitivo.
- **Performance previsível:** carregar funil grande não impacta carregamento de conversa.
- **Espaço pra evolução:** filtros, automações, relatórios, integrações cabem na seção sem poluir conversa.

### Negativas / trade-offs
- **Manu não enxerga CRM nativamente durante a conversa.** Pode dar resposta sem saber em que estágio do funil o lead está.

### Mitigações
- **Chip de contexto CRM dentro da conversa (futuro):** topo da conversa exibe estágio do lead + próxima ação esperada. Manu lê esse chip ao responder. UX detalhada a definir.
- **Brain como ponte (ADR-0003):** Brain mantém contexto cross-CRM-conversa, então Manu pode consultar via Brain mesmo sem o chip visual.

## Funcionalidades pendentes de definição

- Filtros (por estágio, vendedor, valor, data)
- Automações (mover card automaticamente em eventos: lead respondeu, lead inativou)
- Integrações (calendário, e-mail, WhatsApp)
- Relatórios (conversão por estágio, tempo médio em coluna, valor pipeline)
- Customização de funis por equipe (vendas, suporte, recrutamento, etc)
- Permissões granulares (vendedor vê só seus cards, gerente vê tudo)
