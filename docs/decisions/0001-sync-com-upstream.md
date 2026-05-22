# ADR-0001 — Sync com Chatwoot upstream: selective sync mensal

**Status:** Aceita
**Data:** 2026-05-22
**Decisor:** Gustavo (founder/CEO Algorythmo)

## Contexto

O Chatwoot upstream evolui ativamente — releases mensais, fixes de segurança regulares, novas features e integrações. Como fork, precisamos definir nossa relação com essa evolução: pegar tudo, ignorar tudo, ou escolher?

Inspiração de modelo: Cursor (fork do VS Code) faz selective sync — puxa o que importa, descarta o que conflita com a visão própria.

## Decisão

**Selective sync mensal.** Uma vez por mês, revisar o changelog do upstream:

- **CVEs / fixes de segurança:** entram sempre, sem discussão. Gate de segurança.
- **Features e bug fixes:** cherry-pick conforme alinhamento com nosso roadmap.
- **Mudanças que conflitam com nossa arquitetura AI-first:** descartar com nota.

## Alternativas consideradas

- **Hard fork (zero sync após clone):** vira projeto independente. Perde segurança, perde features de graça, dobra trabalho de manutenção. Descartado.
- **Aggressive merge (puxar tudo automaticamente):** acompanha upstream sempre, mas customizações vivem em conflito permanente. Pesadelo de manutenção. Descartado.
- **Selective sync mensal (escolhido):** equilibra autonomia e benefício do trabalho upstream sem virar refém de nenhum dos dois extremos.

## Consequências

### Positivas
- CVEs sempre cobertos — segurança não fica refém de prioridade humana.
- Features upstream relevantes entram sem custo de re-implementação.
- Ritmo previsível: primeira semana do mês é review de sync.

### Negativas / trade-offs
- Algumas features upstream serão revisadas e descartadas — trabalho de cognição que não vira código.
- Conflitos de merge tendem a crescer com o tempo conforme o fork diverge do upstream.

### Mitigações
- Manter `develop` (branch upstream) intocada como espelho — facilita rebase e cherry-pick.
- Customizações Algorythmo concentradas em arquivos novos ou em pontos de extensão isolados, minimizando colisão com código upstream.
- Documentar cada decisão de "não vamos puxar X" no log do sync mensal — preserva contexto pra revisão futura.

## Estrutura de branches

- `develop` — espelha upstream Chatwoot, intocada. Atualizada por `git fetch upstream` mensal.
- `algorythmo/main` — nossa branch principal, onde commits da Algorythmo acontecem.
- Sync mensal: fetch upstream → review changelog → cherry-pick selecionado para `algorythmo/main`.
