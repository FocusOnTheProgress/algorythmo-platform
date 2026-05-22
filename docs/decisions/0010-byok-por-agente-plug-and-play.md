# ADR-0010 — BYOK por agente, plug-and-play

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

ADR-0002 e ADR-0003 estabeleceram que agentes operacionais (Manu vendas, qualificação, suporte) vivem no ambiente do cliente, junto do Brain. O modelo BYOK (Bring Your Own Key) foi assumido como princípio: cliente paga seus próprios tokens de LLM.

Faltava definir a granularidade: a chave da LLM é **por conta do cliente** (uma chave para tudo) ou **por agente** (cada agente tem sua chave)?

## Decisão

**BYOK por agente, plug-and-play.**

- Cada agente (Manu vendas, Manu suporte, Ana qualificação, etc) tem seu próprio campo de chave de API.
- Cliente abre a configuração do agente, cola a chave, e o agente "liga" imediatamente — como encaixar uma pilha.
- Sem chave configurada, o agente fica em estado "desligado" visível no painel (avatar greyed out, status "aguardando chave").
- Cliente pode usar a mesma chave para múltiplos agentes (reuso permitido), mas o modelo padrão é uma chave por agente.

## Alternativas consideradas

- **Chave global por conta de cliente.** Mais simples para o cliente (configura uma vez), mas reduz controle. Cliente não consegue separar custo por agente, não consegue usar provedores diferentes (ex: Manu vendas no Claude, Manu suporte no ChatGPT). Descartado.
- **Chave por workspace + override por agente.** Híbrido. Mais flexível, mas adiciona complexidade conceitual (qual chave o agente está usando agora?). Descartado por enquanto — pode entrar como evolução futura se cliente pedir.
- **Algorythmo provê chave default (paga tokens).** Quebra ADR-0006 e a economia BYOK. Descartado. Pode entrar como modelo premium futuro ("Algorythmo Tokens" como add-on), mas não default.

## Consequências

### Positivas
- Cliente isola custo, performance e capacidade por agente.
- Permite mix de LLMs por função (ex: agente caro pra closing de venda, agente barato pra FAQ).
- Mental model trivial: agente = pilha que precisa de chave pra funcionar.
- Auditoria limpa: cada agente tem sua chave, fica claro quem gastou o quê na fatura da OpenAI/Anthropic/etc.

### Negativas / trade-offs
- Cliente precisa configurar N chaves se quer N agentes ativos.
- Risco de cliente colar chave errada no agente errado e gerar comportamento inesperado (ex: chave de OpenAI num agente configurado pra Claude).

### Mitigações
- UI de configuração do agente mostra claramente: provider esperado + formato esperado da chave + botão "testar conexão" antes de salvar.
- Documentação de onboarding ensina como gerar chave em cada provider em 1 minuto.
- Erro de chave inválida aparece visível no painel (não silencia).

## Implementação

- Tela de configuração do agente: campo "API Key" + dropdown "Provider" (ChatGPT, Claude, Gemini, custom).
- Chave armazenada criptografada no banco do ambiente do cliente (nunca em log, nunca em telemetria).
- Endpoint `/test` por agente para validar a chave antes de ativar.
- Estado do agente no painel reflete status da chave: ativo, aguardando chave, chave inválida.
- Lista de providers suportados dia 1 fica em aberto — ver `docs/plans/0001-mvp-algorythmo-os.md`.

## Relacionado

- ADR-0002 (agentes no cliente)
- ADR-0003 (Brain no cliente)
- `docs/plans/0001-mvp-algorythmo-os.md` (M4 — Manu MVP usa este modelo)
