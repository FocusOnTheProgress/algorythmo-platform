# DESIGN-DELTA-0009 — Cinematic OS v2 vs. as 5 referências do founder

**Status:** validação pré-aprovação (gate único antes da implementação C2–C7).
**Data:** 2026-05-29.
**Escopo:** confrontar `engines/algorythmo/DESIGN.md` (v2, 766 linhas) e `_tokens.scss` contra `Ref design 1–4` + `REF CRM`. Não reinventa o sistema — fecha as últimas frestas que as referências exigem que sejam crisp para o engenheiro implementar sem adivinhar.

---

## Veredicto

**DESIGN.md v2 cobre as 5 referências.** Nenhuma referência exige um conceito novo — todas batem com um componente ou token já nomeado. O documento está, no nível de princípio, completo e world-class.

A lacuna não é de conceito, é de **precisão de implementação** em 4 pontos onde o doc descreve a intenção mas não trava o valor exato que o engenheiro precisa digitar. Esta delta fecha esses 4 pontos. Mais um **requisito de produto novo** que o founder agora exige e que o doc ainda não captura (agente-no-rodapé + âncora-de-scroll).

---

## Mapeamento referência → cobertura

| Referência | O que confirma | Coberto por | Status |
|---|---|---|---|
| Ref 1 — sidebar dark + glass + hero pontilhado + foto montanha | Sidebar refundada, Sunburst Orb, Hero Cinematography, workspace switcher | §5.13, §6.1, §6.5 | **Coberto.** A Ref 1 mostra o item ativo "Agent studio" como **pill branca de cantos arredondados** (não pill-full) — ver Delta 1. |
| Ref 2 — Aurora Orb + conduits + glass tiles com numerais grandes | Aurora Orb, conduits, `.alg-card--glass`, KPI numeral | §6.2, §3.1, §5.3 | **Coberto, com refino.** A Ref 2 revela um **cone de luz vertical descendente** sob a esfera que o §6.2 não menciona — ver Delta 2. |
| Ref 3 — checkpoints com átomos semânticos inline + lista de simulações | Inline Semantic Atoms, `.alg-list` | §6.4, §5.14 | **Coberto.** Confirma os variants exatos (`memory`/`criteria`/`action`/`eval`/`condition`/`agent`). |
| Ref 4 — stack de planetas em cascata | Planet Avatars + cascade picker | §6.3 | **Coberto.** Confirma cromia por planeta (gás laranja, azul-verde, anel, vermelho-marciano, violeta). |
| REF CRM — kanban 4 colunas, cards nome/canal/data/aging | CRM Kanban pattern | §7 | **Coberto em estrutura; cromia rejeitada por decisão.** A delta entrega os 4 valores OKLCH atenuados exatos por coluna — ver Delta 3. |

---

## Delta 1 — Raio da pill ativa da sidebar: NÃO é `pill` (9999px)

`DESIGN.md` §5.13 item 3 e §3.4 dizem "pill inversa" e listam `--alg-radius-pill: 9999px` para "sidebar item ativo". **A Ref 1 contradiz:** o item ativo "Agent studio" é um retângulo branco de cantos **suavemente arredondados (~10–12 px)**, altura ~36 px — não uma cápsula full-round. Cápsula full-round num item de 36 px de altura com ícone+texto leria como botão de toggle, não como linha de navegação selecionada.

**Spec travada para o engenheiro:**
- Item de nav ativo = `border-radius: var(--alg-radius-md)` (12 px), **não** `--alg-radius-pill`.
- Fill `var(--alg-fg-primary)` (branco 1.0), texto `var(--alg-bg-inverse)`→ na prática `color: #000` / `var(--alg-black-1)`.
- Ícone do item ativo herda `currentColor` (preto) — stroke 1.5 continua.
- `--alg-radius-pill` permanece correto para avatares e chips; só o item de nav muda.

> Ação no doc: corrigir §5.13 e a linha "sidebar item ativo (pill inversa)" de §3.4 para `radius-md`. Renomear mentalmente "pill inversa" → "**inverse tab**" (a inversão de elevação é o tell, não o formato cápsula).

---

## Delta 2 — Aurora Orb tem um CONE DE LUZ vertical, não só conduits radiais

§6.2 descreve a esfera + halo + conduits radiais para os cards. A **Ref 2 mostra um elemento adicional não documentado**: um **feixe/cone de luz vertical** que desce da base da esfera (magenta no topo → violeta → transparente), como o rastro de um reator. É o que dá a sensação de "objeto suspenso emitindo energia", não só "bolinha colorida". Sem ele, o orb perde metade da vida.

**Spec travada (novo sub-token a adicionar em `_tokens.scss`):**
```css
/* cone de luz vertical sob o Aurora Orb (Ref 2) */
--alg-aurora-beam: linear-gradient(
  180deg,
  color-mix(in oklch, var(--alg-aurora-1), transparent 35%) 0%,
  color-mix(in oklch, var(--alg-aurora-3), transparent 70%) 45%,
  transparent 100%
);
```
Aplicação: pseudo-elemento `::after` na esfera, largura ~14 % do diâmetro no topo afinando para ~4 %, altura ~1.6× o diâmetro, `filter: blur(6px)`, `opacity: 0.7`, `mix-blend-mode: screen`. Anima junto do `conduit glow ramp` (acompanha o ciclo de 6 s).

> Ação no doc: adicionar o "vertical light beam" como 4º loop ambiente do §6.2 e o token `--alg-aurora-beam` ao §3.1. Conduits da Ref 2 são **3 raios para cima** (não 6 simétricos) — a disposição radial é livre, mas o engenheiro deve seguir a foto: feixes saindo apenas para os cards visíveis, ângulos irregulares (orgânico), não um leque simétrico de relógio.

---

## Delta 3 — Cromia atenuada das 4 colunas do kanban: valores OKLCH exatos

§7.1 manda usar "status semântico atenuado (oklch L≈0.50, C≤0.12)" e nomeia a intenção por coluna, mas **não trava os 4 valores**. O engenheiro precisa deles para a barra de 2 px do topo da coluna. Travados aqui (derivados dos hues semânticos já no `_tokens.scss`, rebaixados em L e C):

| Coluna | Papel semântico | Barra topo (2 px) | Texto do header |
|---|---|---|---|
| Novo Lead | info atenuado | `oklch(0.55 0.10 235)` | branco 0.72 |
| Qualificado | warning atenuado | `oklch(0.62 0.11 85)` | branco 0.72 |
| Proposta Enviada | accent-violet atenuado | `oklch(0.55 0.12 295)` | branco 0.72 |
| Negociação | danger-adjacent atenuado | `oklch(0.55 0.11 35)` | branco 0.72 |

Regra dura confirmada pela REF CRM **ao contrário**: a referência usa headers de coluna **preenchidos** em azul/amarelo/roxo/laranja saturados (arco-íris). **Isso é exatamente o que rejeitamos.** No Cinematic OS a cor vira: (a) barra de 2 px no topo, (b) o counter pill herda um tint de 12 % daquela cor, (c) nada mais. Background da coluna = `--alg-bg` (canvas preto), nunca preenchido.

> Ação no doc: colar esta tabela de 4 valores no §7.1 substituindo a descrição verbal.

---

## Delta 4 — REQUISITO DE PRODUTO NOVO: agente do setor no RODAPÉ + âncora de scroll no topo

Esta é a única **mudança de produto**, não de craft. O founder agora exige um padrão de layout que o DESIGN.md ainda não descreve (o §5.12 atual coloca o agente num **right rail sticky de 360 px** — isso está **revogado** para as telas de Overview de setor):

1. O chat do agente do setor é o **último elemento da página** (full-width, dentro da densidade operacional), com headline editorial **"Fale com o agente do setor 'Operations'"**. Não ocupa rail lateral.
2. No **topo-direito da página** há um ícone discreto (Planet Avatar sm + glyph chevron-down ou `message-circle`) que, ao clicar, **faz scroll suave até o chat do agente** (`scroll-behavior: smooth`, respeitando reduced-motion). É o atalho "falar com o cérebro deste setor" sem rolar a mão.
3. O avatar do agente no chat é um **Planet Avatar** (§6.3), não `.alg-avatar` humano.

**Spec travada:**
- O `.alg-agent` deixa de ser `position: sticky` right-rail nas telas de Overview; vira bloco de fluxo no fim do `<main>`. (O right-rail pode permanecer válido em telas de conversa 1:1, mas **não** no Overview de setor.)
- Âncora: `<a href="#sector-agent">` no header → `id="sector-agent"` no bloco do agente. Ícone = Planet Avatar 24 px + label mono `FALAR COM O AGENTE`.
- O Sector Overview, portanto, é uma **central de dados densa que termina em conversa** — alinhado ao padrão "Sector Overview = central de dados densa" da memória do projeto (não é tela hero cinematográfica).

> Ação no doc: reescrever §5.12 para "agente em rodapé de fluxo + âncora no header" e marcar o right-rail como padrão legado de telas de conversa.

---

## Specs já crisp (nenhuma ação — só confirmação para o engenheiro)

- Aurora gradient stops, conduit, halo: exatos em `_tokens.scss` linhas 188–215. **Usar verbatim.**
- Glass 3 níveis (bg + filter + grain SVG + highlight): exatos linhas 342–360. Grain via `::after` opacity 0.6 `mix-blend-mode: overlay`.
- Elevation 1–4 (com inset highlight obrigatório): exatos linhas 372–393.
- Motion: `--alg-ease-cinematic` cubic-bezier(0.32,0.72,0,1) default; `--alg-ease-ambient` cubic-bezier(0.45,0.05,0.55,0.95) para loops; durações 120/180/240/340/520 ms + ambient 4/6/8 s.
- Densidades: operational = 24 px padding / 16 px gap; KPI anchor pode subir gap → 32 px (regra de subida §3.3).
- LeadAgingChip dual-coded (cor+glyph+texto) — `●` em-dia / `◐` atenção / `○` atrasado / `—` neutro. Não-negociável.
- Planet Avatar = determinístico por `fnv1a(agent_name) % library.length`. Placeholder programático (radial gradient + noise) cobre até a curadoria humana entregar os 12–16 SVGs.

---

## Resumo executivo (para o founder, não-técnico)

O sistema de design no papel já está no padrão. As 5 imagens de referência não pedem nada de novo no conceito — só apertam 4 detalhes para o time não ter que adivinhar:

1. **Aba selecionada na barra lateral** é um retângulo branco de cantos levemente arredondados (não uma cápsula totalmente redonda). Igual à Ref 1.
2. **A esfera Aurora tem um facho de luz descendo dela** (como um reator), além dos raios que ligam aos cards. Igual à Ref 2.
3. **As 4 colunas do funil** ganham cor só numa linha fininha no topo, em tom suave — nunca o arco-íris saturado da referência crua.
4. **Novo pedido seu, agora oficial:** o agente de cada setor fica **no fim da página** ("Fale com o agente do setor X"), com um **ícone no topo** que rola a tela até ele. Sai a barra lateral de agente.

Os 3 mockups em `preview/` mostram exatamente isso, renderizado no padrão final.
