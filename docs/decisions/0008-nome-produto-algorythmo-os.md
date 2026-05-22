# ADR-0008 — Nome do produto: Algorythmo OS

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

ADR-0005 estabeleceu que o produto teria nome próprio standalone, sem usar "Algorythmo X" nem "Manu". Chatwoot deveria desaparecer da experiência do cliente PME, ficando apenas como detalhe técnico interno em docs de engenharia e contratos de licença.

O nome em si ficou em aberto, com critérios: PT-friendly, curto, AI-adjacente sem cliché, sem colisão óbvia de marca.

## Decisão

**Nome do produto: Algorythmo OS.**

"OS" comunica plataforma operacional — não um app, não uma ferramenta isolada, mas o sistema operacional do atendimento e relacionamento da PME. Carrega a herança da marca Algorythmo (empresa) e ao mesmo tempo se posiciona como produto autônomo.

## Alternativas consideradas

- **Nome totalmente desconectado da Algorythmo.** Mais flexível pra spin-off futuro, mas perde sinergia inicial de marca. Descartado pelo momento — pode ser revisado se houver fundraise ou spin-off.
- **"Manu" como nome do produto.** Descartado em ADR-0005 — Manu é personagem, não produto. Conforme outros agentes entram, o nome quebra.
- **Algorythmo + sufixo descritivo (Helpdesk, CRM, Atende).** Limita posicionamento de plataforma. "OS" é mais ambicioso e cabe melhor com a visão de painel integrado humanos + AI.

## Consequências

### Positivas
- Posicionamento claro: plataforma operacional, não ferramenta pontual.
- Sinergia com marca Algorythmo na fase inicial sem amarrar o produto pra sempre.
- Cabe expansão (Algorythmo OS para Vendas, Suporte, Operações etc) sem rebrand.

### Negativas / trade-offs
- "OS" tem associação forte com sistemas operacionais de computador (Windows, macOS, Linux) — pode gerar confusão inicial em material de venda.
- Se a marca Algorythmo passar por rebranding no futuro, o produto carrega o peso.

### Mitigações
- Comunicação de marca enfatiza "sistema operacional do atendimento e relacionamento", não OS de computador.
- Tagline e copywriting precisam carregar o sentido (work pra `/copywriting` no futuro).

## Implementação

- "Chatwoot" some da UI cliente, substituído por "Algorythmo OS" em toda superfície visível.
- Logo, favicon, título de página, e-mails transacionais, onboarding, app móvel.
- Referência interna a "Chatwoot" permitida em docs de engenharia, contratos de licença e código (paths, namespaces que vêm do upstream).
- Trilha de rebrand entra como parte do M0 do MVP — ver `docs/plans/0001-mvp-algorythmo-os.md`.

## Relacionado

- ADR-0005 (estabelece premissa de nome standalone)
- `docs/plans/0001-mvp-algorythmo-os.md` (M0 — rebrand)
