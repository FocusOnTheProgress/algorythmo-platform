# ADR-0009 — Repositório privado standalone

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

O fork começou como clone do Chatwoot upstream (OSS, MIT). Para virar Algorythmo OS — produto comercial standalone — precisamos definir a forma do repositório: continuar como fork público no GitHub, ou mover para repo privado independente?

Cursor (fork do VS Code) é o paralelo de referência: opera com codebase fechada, sync seletivo controlado.

## Decisão

**Repositório privado standalone.**

- Visibilidade: privada no GitHub, sob organização Algorythmo (FocusOnTheProgress por enquanto).
- Origem visível como Chatwoot (MIT) respeitada em arquivos de licença e atribuição, conforme exigência legal — mas sem expor o código nosso publicamente.
- `develop` continua espelhando upstream para sync mensal (ADR-0001), mas o repo como um todo é privado.

## Alternativas consideradas

- **Fork público no GitHub.** Vantagem: marketing OSS, contribuições externas. Desvantagem: customizações estratégicas, padrões de prompt, lógica de Brain ficam expostos a concorrentes. Para um produto que se diferencia justamente por AI proprietária, expor o código mata vantagem competitiva. Descartado.
- **Repositório privado em provider neutro (GitLab/Bitbucket).** Sem ganho relevante; o time já opera em GitHub e a tooling (Dependabot, Actions) está configurada. Descartado.

## Consequências

### Positivas
- Proteção de IP — prompts, lógica de Brain, padrões de agente ficam privados.
- Liberdade de mover rápido sem expor decisões em aberto a concorrentes.
- Controle granular de acesso conforme o time cresce.

### Negativas / trade-offs
- Perde-se sinal de OSS-friendliness no marketing técnico.
- Onboarding de devs externos exige convite explícito ao repo.
- Atenção redobrada com obrigações de atribuição da licença MIT do Chatwoot (manter LICENSE, copyright headers, etc).

### Mitigações
- Manter `LICENSE` do Chatwoot e copyright headers intactos no que vem do upstream.
- Adicionar `NOTICE.md` ou similar reconhecendo origem MIT do Chatwoot.
- Se no futuro fizer sentido reabrir parte do código (SDK, biblioteca de agentes), criar repo separado público — não abrir o repo principal.

## Implementação

- Garantir que `FocusOnTheProgress/Fork-Chatwoot` (ou destino final) está marcado como private no GitHub.
- Auditar histórico para garantir que nenhum secret/credential vazou em commits anteriores.
- Eventual migração de organização (FocusOnTheProgress → Algorythmo oficial) é mudança operacional, não muda esta decisão.

## Relacionado

- ADR-0001 (sync com upstream — `develop` continua existindo como espelho)
- ADR-0005 (marca standalone — repo privado reforça posicionamento)
