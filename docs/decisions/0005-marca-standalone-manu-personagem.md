# ADR-0005 — Produto standalone, Manu como personagem

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

A plataforma precisa de nome e identidade pública. Algorythmo é a empresa que fez. Manu é o agente AI de vendas. Qual a relação entre marca do produto, marca da empresa e nome dos agentes?

## Decisão

**Produto tem nome próprio standalone** (a brainstormar). Algorythmo é a empresa que fez, produto vive sozinho. **Manu é personagem central da experiência de atendimento**, não nome do produto. Quando outros agentes entrarem (suporte, operações), cabem natural — são colegas de Manu, todos com nome próprio.

**Chatwoot some da experiência do cliente PME.** Detalhe técnico interno mencionado só em docs de engenharia e contratos de licença upstream.

**GitHub privado por enquanto.** Abertura pode ser reavaliada quando houver maturidade e estratégia clara de open-core.

## Alternativas consideradas

- **"Algorythmo X" (sub-marca):** amarra produto à empresa, dificulta venda se Algorythmo crescer pra outros produtos. Descartada.
- **"Manu" como nome do produto:** confunde personagem e produto, e dificulta adição de outros agentes ("Ana de operações é... do Manu?"). Descartada.
- **Standalone (escolhido):** flexibilidade pra crescer marca do produto sem amarra à empresa nem ao primeiro agente.

## Consequências

### Positivas
- **Personagem Manu vira ativo de marca:** cliente PME pode criar relação afetiva com o agente (B2B equivalente de Cortana, Siri, em contexto de vendas).
- **Extensibilidade:** outros agentes (Ana operações, etc) cabem sem rebrand.
- **Posicionamento limpo:** "produto X, da Algorythmo" é narrativa clara.

### Negativas / trade-offs
- **Brand-building extra:** marca standalone exige investimento próprio, não herda da Algorythmo.
- **Manu standalone-de-marca não pode ser renomeado pelo cliente nativamente:** se cliente quiser chamar de outro nome, complica.

### Mitigações
- **Manu como nome canônico, apelido por cliente:** cliente PME pode dar apelido no painel ("nossa Ana de vendas"), mas tecnicamente é Manu. Apelido é cosmético.
- **Identidade visual unificada entre produto e personagens:** sistema de design contempla os dois desde o início.

## Pendente

- **Nome do produto.** Critérios: PT-friendly, curto, AI-adjacente sem cliché ("AI", "Bot", "Smart" no nome), sem colisão de marca registrada relevante, domínio disponível.
