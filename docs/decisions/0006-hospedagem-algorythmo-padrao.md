# ADR-0006 — Hosting Algorythmo padrão, self-hosted premium

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)
**Depende de:** [ADR-0002](0002-agentes-operacionais-no-cliente.md), [ADR-0003](0003-brain-embutido-no-ambiente-do-cliente.md)

## Contexto

A arquitetura define que cada cliente tem ambiente isolado (fork + Brain + agentes operacionais — ver ADRs 0002 e 0003). Onde esse ambiente roda na prática?

Duas opções:
1. **Cliente self-host** (servidor próprio, ambiente totalmente sob domínio dele).
2. **Algorythmo hospeda** (multi-tenant lógico com dados separados por cliente).

## Decisão

**Algorythmo hospeda ambientes isolados por cliente como padrão.** Multi-tenant lógico: cada cliente tem dados, Brain e agentes operacionais em ambiente separado, mas a infra subjacente é gerenciada pela Algorythmo.

**Self-hosted ("On-Premise") fica como opção premium** para empresas com TI própria que exigem dado totalmente em casa.

## Alternativas consideradas

- **Self-hosted padrão:** posicionamento OSS purista, mas PMEs brasileiras geralmente não têm time de TI pra operar — adesão cai drasticamente.
- **Algorythmo hospeda padrão (escolhido):** PME paga mensalidade, não pensa em servidor. Self-hosted como upgrade pago.
- **Híbrido 50/50 desde dia 1:** dobra trabalho, dilui foco. Descartado.

## Consequências

### Positivas
- **Adesão PME fluida:** zero fricção de infra. Cliente assina, configura agentes, opera.
- **Onboarding rápido:** ambientes provisionados quase automaticamente.
- **Economia de escala:** Algorythmo opera infra eficientemente compartilhando recursos físicos.
- **Caminho de upgrade premium:** clientes maiores podem evoluir pra self-hosted como pacote enterprise (margem alta, ticket alto).

### Negativas / trade-offs
- **Argumento "dado nunca sai" fica condicional:** dado fica isolado **logicamente**, não fisicamente. Material de venda precisa ser preciso e honesto.
- **Algorythmo carrega responsabilidade operacional:** uptime, backup, segurança de infra. Custo direto.
- **Compliance LGPD precisa ser rigoroso:** contratos, processos, auditorias precisam estar em ordem desde dia 1.

### Mitigações
- **Comunicação honesta:** "dado isolado por cliente, gerenciado pela Algorythmo sob contrato LGPD" — não "dado nunca sai" sem qualificar.
- **Auditoria LGPD desde a fundação:** processos, contratos, opcionalmente certificações reconhecidas.
- **Self-hosted como escape válvula:** cliente que não aceita modelo hospedado tem opção viável dentro do mesmo produto.

## Pendente

- Critérios de auditoria LGPD pra cliente PME (DPO interno, processo de incidente, retenção, exclusão).
- Definição de SLA de uptime e modelo de penalidade.
- Modelo de pricing entre hosting padrão e self-hosted premium.
- Stack de infra escolhida (provider, orquestração, isolamento de rede e dados).
