# Decisões de Arquitetura — Fork Chatwoot Algorythmo

Este diretório registra decisões de arquitetura e produto que moldam o fork da plataforma. Cada decisão (ADR — Architecture Decision Record) é um arquivo numerado e imutável: se uma decisão mudar, a anterior é marcada como **Substituída** e uma nova ADR é criada referenciando-a.

## Premissa do produto

Helpdesk open-source com AI nativa e CRM embutido, voltado para PMEs brasileiras. Painel único onde humanos e agentes AI trabalham integrados — sem telas separadas. AI-first desde a fundação: workflows assumem AI participando por padrão, não como adendo. Inspirado no modelo Cursor (fork do VS Code) — fork estratégico, não cosmético.

## Arquitetura macro (2 andares)

**Andar 1 — Ambiente do cliente PME (isolado por cliente):**
- Fork (helpdesk + CRM Kanban + painel integrado humanos+AI)
- Brain da empresa (memória + contexto + tradutor + ajustes)
- Grupo operacional de agentes (Manu vendas, qualificação, suporte) — atendem leads localmente
- Conexão BYOK à LLM externa do cliente (ChatGPT, Claude, etc)

**Andar 2 — Algorythmo (camada estratégica / C-level):**
- Time de agentes "diretores AI" — olha métricas agregadas com consent
- Função: detectar quebras, propor melhorias, sugerir features cross-cliente
- Não atende lead. Cuida da plataforma e do cliente como cliente.

**Fluxo de atendimento:** lead manda mensagem no fork → Brain pega contexto da empresa → agente operacional local responde via LLM do cliente → resposta no painel. Operação nunca sai do ambiente do cliente.

## Índice de decisões

| # | Decisão | Status |
|---|---|---|
| [ADR-0001](0001-sync-com-upstream.md) | Sync com Chatwoot upstream: selective sync mensal | Aceita |
| [ADR-0002](0002-agentes-operacionais-no-cliente.md) | Agentes operacionais vivem no ambiente do cliente | Aceita |
| [ADR-0003](0003-brain-embutido-no-ambiente-do-cliente.md) | Brain mora junto do fork no ambiente do cliente | Aceita |
| [ADR-0004](0004-crm-kanban-separado.md) | CRM como seção separada com Kanban drag-and-drop | Aceita |
| [ADR-0005](0005-marca-standalone-manu-personagem.md) | Produto standalone, Manu como personagem | Aceita |
| [ADR-0006](0006-hospedagem-algorythmo-padrao.md) | Hosting Algorythmo padrão, self-hosted premium | Aceita |
| [ADR-0007](0007-time-c-level-estrategico.md) | Camada Algorythmo é estratégica, não operacional | Aceita |

## Convenções

- **ADRs são imutáveis.** Se uma decisão mudar, criar nova ADR e marcar a antiga como **Substituída por ADR-NNNN**.
- **Linguagem: português.** Decisões são de produto e negócio antes de técnica.
- **Trade-offs honestos.** Toda decisão tem custo — registrar com mitigação conhecida quando houver.
- **Cada ADR aponta para suas dependências.** ADRs interligadas referenciam umas às outras.

## Estrutura de branches

- `develop` — espelha upstream Chatwoot, intocada. Base para sync mensal.
- `algorythmo/main` — branch principal do fork, onde commits da Algorythmo acontecem.
- Sync mensal: fetch upstream → review changelog → cherry-pick selecionado para `algorythmo/main`.

## Princípios derivados

Princípios técnicos que emergem das decisões e devem guiar implementação:

- **BYOK obrigatório.** Cliente conecta sua própria chave de LLM. Algorythmo não paga tokens da operação.
- **Templates de agente versionados.** Manu v1, v2, vN são templates evoluídos centralmente, com opt-in canary no update.
- **Cache local no Brain.** Pergunta trivial (horário, política, FAQ) o Brain responde sem chamar LLM externa.
- **Modo degradado.** Se LLM externa cair, Brain responde com templates locais. Plataforma nunca aparece "fora do ar".
- **Telemetria agregada com consent.** Pro time C-level enxergar padrões. Definida no desenho, não retrofit.
- **Contrato versionado entre ambiente cliente e Algorythmo C-level.** Updates centrais não quebram cliente em produção.
