# ADR-0002 — Agentes operacionais vivem no ambiente do cliente

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)
**Depende de:** [ADR-0003](0003-brain-embutido-no-ambiente-do-cliente.md), [ADR-0006](0006-hospedagem-algorythmo-padrao.md), [ADR-0007](0007-time-c-level-estrategico.md)

## Contexto

A plataforma é AI-first: agentes de IA são membros do time, não bolt-on. O primeiro agente é Manu (vendas, target ~40% das ações). Outros virão (qualificação, suporte, operações).

Pergunta crítica: **onde os agentes operacionais vivem?**

Duas opções emergiram durante o /plan-ceo-review:
1. **Time central na Algorythmo atendendo todos os clientes** — um único Manu serve N empresas, com tradutores por cliente.
2. **Grupo operacional próprio por cliente** — cada cliente tem agentes operacionais no ambiente isolado dele.

A primeira passada escolheu a opção 1 (centralizada). Após refletir sobre custo de tokens, latência, conflito entre clientes concorrentes e modelo de negócio, a decisão foi revisada pra opção 2.

## Decisão

**Cada cliente tem seu próprio grupo operacional de agentes (Manu, qualificação, suporte) vivendo no ambiente isolado dele.** Os agentes têm "crachá" no ambiente do cliente, não no time da Algorythmo. Algorythmo não opera agentes operacionais centralmente.

**LLM externa é BYOK (Bring Your Own Key).** O cliente conecta a própria chave de ChatGPT, Claude ou outro modelo. Algorythmo não paga tokens da operação.

## Alternativas consideradas

- **Time central operacional na Algorythmo:** economia inicial aparente, mas problemas reais: latência por chamada de rede, risco de vazamento entre clientes concorrentes, dependência total da disponibilidade da Algorythmo, custo de tokens Algorythmo escala linear com clientes.
- **Agentes por cliente (escolhido):** isolamento natural, latência local, sem conflito entre clientes concorrentes, custo de tokens distribuído pra quem usa.

## Consequências

### Positivas
- **LGPD por design:** operação 100% no ambiente do cliente. Dado nunca sai sem consentimento.
- **Latência zero:** agente é local. Lead recebe resposta em segundos.
- **Zero conflito entre clientes concorrentes:** cada um tem seu Manu, sem risco de prompt injection ou vazamento de contexto.
- **Custo de tokens vai pra quem usa:** cliente que escolhe modelo caro paga modelo caro. Margem da Algorythmo previsível.
- **Cliente "dono" do seu time AI:** se sair da Algorythmo um dia, leva contexto e configuração junto — vendor-lock invertido (forte narrativa de venda).

### Negativas / trade-offs
- **Padronização de qualidade:** cada cliente roda seus próprios agentes. Garantir que "Manu" tem a mesma qualidade em todo lugar exige disciplina.
- **Update de templates:** quando Algorythmo lança Manu v2, distribuir pra base de clientes sem quebrar produção exige processo formal.
- **Onboarding mais pesado:** cliente novo precisa de setup de agentes + Brain antes de começar a operar.

### Mitigações
- **Templates de agente versionados:** Manu v1, v2, vN são templates evoluídos centralmente, distribuídos com opt-in e janela de canary. Cliente sempre pode pinar versão.
- **Contrato versionado entre ambiente cliente e Algorythmo:** updates centrais não quebram cliente em produção.
- **Onboarding plug-and-play:** kit padronizado (fork + Brain + templates de agente) provisionado quase automaticamente em hosting Algorythmo (ver ADR-0006).
