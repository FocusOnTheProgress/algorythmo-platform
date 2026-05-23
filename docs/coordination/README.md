# Coordenação de sessões paralelas — Algorythmo OS

Esta pasta organiza o trabalho em **3 sessões Claude Code rodando em paralelo** + **1 sessão orquestradora** (humano + Claude conversando).

## Topologia

```
              Gustavo (humano)
                    │
        ┌───────────┴────────────┐
        │                        │
   Sessão A                Sessões executoras
   (Orquestradora)         (3 janelas Claude Code,
   — esta conversa —        worktrees isolados)
        │                        │
        │            ┌───────────┼────────────┐
        │            │           │            │
        └──────►  Sessão B    Sessão C     Sessão D
                 worktree B   worktree C   worktree D
                 branch B     branch C     branch D
                 PR B         PR C         PR D
```

## Como o humano usa

1. **Sessão A (esta):** abre o repo no diretório principal `C:\Users\gusta\dev\Fork Chatwoot` no branch `algorythmo/main`. Esta é a sessão de **conversação e decisão**. Não executa código de feature. Atualiza `STATUS.md` quando algo muda.

2. **Sessões B, C, D:** abre 3 janelas adicionais de Claude Code, cada uma no MESMO diretório do repo `C:\Users\gusta\dev\Fork Chatwoot`. Em cada janela, cola o conteúdo de:
   - `SESSION_B_BRIEF.md` na janela B
   - `SESSION_C_BRIEF.md` na janela C
   - `SESSION_D_BRIEF.md` na janela D

   Cada briefing instrui a sessão a criar seu próprio worktree via `git worktree add` e a partir daí trabalhar isolada.

## Arquivos nesta pasta

| Arquivo | Quem mantém | Pra que serve |
|---|---|---|
| `README.md` | Sessão A | Este documento — visão geral |
| `RULES.md` | Sessão A | Regras de coordenação inegociáveis (estável) |
| `STATUS.md` | Sessão A | Quadro vivo do que cada sessão está fazendo |
| `SESSION_B_BRIEF.md` | Sessão A | Prompt completo pra colar na janela B |
| `SESSION_C_BRIEF.md` | Sessão A | Prompt completo pra colar na janela C |
| `SESSION_D_BRIEF.md` | Sessão A | Prompt completo pra colar na janela D |

## Princípio fundador

**Nenhuma sessão executora toma decisão de produto.** Se uma das sessões (B, C, D) tiver dúvida que não esteja resolvida em ADRs / planos / briefings, ela PARA, comenta no PR (ou pede pro humano levar à Sessão A), e espera.

Velocidade é o segundo objetivo. **Não bagunçar uma a outra é o primeiro.**
