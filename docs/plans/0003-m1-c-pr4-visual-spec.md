# Adendo ao plano 0003 §10 PR 4 — Visual Spec do Frontend Wire-up

> **Status:** ADENDO ao plano `0003-m1-c-backend-leads-reais.md` §10 PR 4.
> **Gerado em resposta ao design review de 2026-05-24.**
> **PR 4 (`algorythmo/m1c-frontend-wire-real-data`) NÃO abre antes deste documento estar aprovado pelo founder.**
>
> **Owner:** designer agent. **Implementação:** engineer agent (PR 4).
> **Não substitui** o plano mãe — adiciona a camada visual que estava faltando entre "backend pronto" e "tela bonita". Os endpoints, o data shape e a sequência de PRs continuam exatamente como descritos no plano 0003 §5–§10.

---

## 0. Por que este adendo existe

O plano 0003 §10 PR 4 enumera o que o engineer precisa **construir** (LeadCard com owner, drawer, composable `useStageHistory`, i18n, vitest). Não enumera o que o engineer precisa **decidir visualmente** antes de teclar Vue: grid do card, placeholder do owner, anatomia do drawer, design da timeline, identidade do actor `system`, loading/erro states, tokens, microcopy.

Sem essa camada, PR 4 vira improviso: drawer genérico shadcn-ish, timeline como `<ul>` de strings, "Sem dono" em texto cinza, skeleton vira spinner. Founder rejeita no `/design-review` e a PR refaz duas vezes. Este doc evita isso.

Tudo aqui se ancora nos tokens já existentes em `engines/algorythmo/app/assets/stylesheets/_tokens.scss` e nos componentes já entregues (`AlgDrawer`, `AlgAvatar`, `LeadAgingChip`). Nada novo é inventado por capricho — tudo que é proposto novo está justificado.

---

## 1. Grid revisado do `LeadCard` com owner

### 1.1 Estado atual

`LeadCard.vue` (M1-B) é uma linha densa de 5 colunas:

```
┌─────────────────────────────────────────────────────────────┐
│ [📷]  Maria Silva — Cosmetic ......  4d 2h  [● 4d 2h]  ⋮   │   ← ~36px altura
└─────────────────────────────────────────────────────────────┘
   ↑     ↑                              ↑       ↑          ↑
 canal   nome (1fr)                   tempo  aging chip  menu
```

`grid-template-columns: auto 1fr auto auto auto`. Padding `0.625rem 0.75rem`. Altura natural ~36-40px. Funciona porque o nome respira no `1fr`.

Inserir o avatar do owner sem repensar grid mata o `1fr`: nome encolhe, ellipsis dispara em "Maria S…" — leitura escaneável morre. Founder lê 30+ cards de cima a baixo; nome truncado é o ponto onde o Kanban falha como instrumento de gestão.

### 1.2 Opção A — Card vira 2 linhas (header + footer)

```
┌─────────────────────────────────────────────────────────────┐
│  Maria Silva — Cosmetic Importadora                    ⋮    │   ← header  (28px)
│                                                              │
│  [💬]  WhatsApp · 4d 2h  ● 4d 2h                  [👤MS]    │   ← footer  (24px)
└─────────────────────────────────────────────────────────────┘
   ↑                                                    ↑
 canal · tempo                                       avatar owner
```

**Grid:**
```
grid-template-columns: 1fr auto;
grid-template-rows: auto auto;
grid-template-areas:
  "name menu"
  "meta owner";
```

- **Linha 1 (header):** nome a `1fr` (ganha o espaço todo, pode usar ~24ch antes de ellipsis) + botão `⋮` colado à direita.
- **Linha 2 (footer):** meta agrupada (canal icon + label de canal + " · " + tempo + aging chip) e avatar do owner à direita.
- **Tipografia footer:** `var(--alg-text-xs)` (~12px), `color: var(--alg-text-tertiary)`. Meta deixa de competir com o nome.
- **Padding:** `var(--alg-space-3) var(--alg-space-3)` (12px). Gap entre linhas: `var(--alg-space-2)` (8px).
- **Altura mínima:** `min-height: 64px`. Resolve sub-pixel em 1x/2x. Garante 4 cards visíveis sem scroll em coluna de altura 320px (mobile).
- **Channel label:** texto curto (`WhatsApp`, `Email`, `Instagram`, `Widget`) — vira informação textual além do ícone, melhora screen reader e elimina dependência de adivinhar emoji.

**Custo:** card cresce ~24px (de ~36 para ~64). Densidade cai. Em troca: nome respira, owner é sinal visual primário, canal vira label real.

### 1.3 Opção B — Avatar substitui o ícone de canal

```
┌─────────────────────────────────────────────────────────────┐
│  [👤MS]  Maria Silva — Cosmetic ...  4d 2h  [● 4d 2h]  ⋮    │   ← ~36px
└─────────────────────────────────────────────────────────────┘
       ↑
   avatar owner; canal vira tooltip do avatar (e badge no canto inferior do avatar)
```

**Grid:** mantém `auto 1fr auto auto auto`.
**Avatar:** 24px, com badge `8px` no canto inferior-direito (ícone de canal). Tooltip on-hover: `WhatsApp · Maria atendeu`.

**Custo:** densidade preservada. Canal continua at-a-glance via badge. Mas: badge de 8px sobre avatar de 24px é frágil em 1x; tooltip esconde info em touch; placeholder "sem dono" precisa de outro tratamento (badge sozinho em avatar cinza fica órfão); aumenta peso visual do canto esquerdo (avatar pesa mais que emoji), enquanto a hierarquia natural quer o nome dominante.

### 1.4 Decisão: **Opção A** (2 linhas)

**Justificativa em 1 frase:** o card existe pra ser scaneado em lote — separar nome (linha 1, leitura) de meta+owner (linha 2, contexto) entrega ambos sem que um sufoque o outro, e habilita evoluções (tags, due-date, badge "novo") sem refazer o grid.

Razões secundárias:
- Owner deixa de competir com canal pelo mesmo slot visual.
- Channel label (texto) supera ícone em a11y e em desambiguação (📷 = Instagram OU câmera? Resolvido).
- "Sem dono" tem espaço dedicado e legível (ver §2), não fica espremido como badge.
- Linha 1 sem aging chip = leitura primária ainda é nome+stage; chip vira reforço no footer.
- Setas de hierarquia futura (badge "Manu propôs ação", chip "Aprovação pendente") encaixam na linha 1 à esquerda do menu sem reflow.

**Engineer deve implementar a Opção A.** Opção B fica registrada como alternativa rejeitada — não é fallback nem variante.

### 1.5 Especificação completa do novo `LeadCard`

```
┌───────────────────────────────────────────────────────────────┐
│                                                                │
│  Maria Silva — Cosmetic Importadora                       ⋮   │  ← linha 1 (24px)
│                                                                │
│  [💬] WhatsApp · 4d 2h          ● 4d 2h        [👤MS]         │  ← linha 2 (20px)
│                                                                │
└───────────────────────────────────────────────────────────────┘
   ↑ padding 12px      ↑ gap 8px               ↑ avatar 20px
```

| Slot | Token tipográfico | Cor | Notas |
|---|---|---|---|
| Nome (`drawer-title` no drawer também) | `--alg-text-sm` + `--alg-weight-semibold` (600) | `--alg-text-primary` | `line-height: --alg-leading-snug`. Ellipsis em overflow. |
| Botão `⋮` | mesmo do atual | `--alg-text-tertiary`, hover `--alg-text-primary` | mantém `data-testid="lead-card-menu-trigger"`. |
| Channel icon + label | `--alg-text-xs` + `--alg-weight-medium` | `--alg-text-tertiary` | ícone como hoje (`channel_icon`), label = texto traduzido por canal (`whatsapp` → `WhatsApp`). |
| Separador " · " (U+00B7) | `--alg-text-xs` | `--alg-text-muted` | Mesma classe `.alg-lead-card__sep`. |
| Tempo (mantido) | `--alg-text-xs` | `--alg-text-tertiary` | sem mudança no cálculo (ver §9). |
| Aging chip | LeadAgingChip existente | tokens próprios | reduzido pra `compact` (sem label de tempo dentro do chip, só glyph) — evita redundância com o tempo já visível ao lado. **Adiciona prop `compact: Boolean` ao LeadAgingChip** (default false; engineer ativa true no card). |
| Avatar owner | `--alg-radius-pill` | gradiente AlgAvatar | `size="sm"` (20px). Aria-label = nome do owner. |

**Hover/focus:** mantém os shadows atuais (`--alg-card-shadow-hover`) e o `--alg-focus-ring`. Sem mudança aqui.

**`data-testid` novos no card** (CONTRACT_M1B bump v1.1.0 já cobre os do drawer — esses são adicionais e devem entrar no mesmo bump):

```
[data-testid="lead-card-owner-avatar"]         ← presente sempre (com ou sem owner)
  [data-owner-state="assigned" | "unassigned"] ← discrimina os 2 estados
  [data-owner-id="N"]                           ← presente apenas quando assigned
[data-testid="lead-card-channel-label"]        ← texto do canal (novo, junto com o ícone)
```

---

## 2. Placeholder de owner ausente

### 2.1 Por que "Sem dono" é ruim

"Sem dono" / "Sem responsável" / "Não atribuído" — todas conotam falha (lead esquecido, processo bagunçado). O estado correto na linguagem do produto é **"disponível"**: o lead acabou de chegar, ainda não foi pego por ninguém, e o primeiro a responder vira o dono (decisão registrada em `project_algorythmo_os_product_vision.md` — "quem pega leva").

### 2.2 Visual

Avatar circular `20px` (mesmo tamanho do avatar de owner real), com:
- **Background:** `var(--alg-bg-raised-hover)` (`--alg-color-neutral-4`) — distinguível do card bg sem chamar atenção.
- **Border:** `1px dashed var(--alg-border-strong)` — o tracejado é o sinal universal de "slot vazio aguardando preenchimento" (Linear, Notion, Figma usam o mesmo padrão).
- **Ícone interno:** `hand` (Lucide, `1.25rem` → encaixa em 20px com padding visual). Cor: `var(--alg-text-tertiary)`. Stroke 1.5px.

Lucide `hand` (não `user-plus`) porque a metáfora correta é "lead aguardando ser pego", não "adicionar usuário ao sistema". Diferença sutil mas decisiva — `user-plus` lê como "crie um cadastro", o que não é a ação aqui.

### 2.3 Microcopy

- **Tooltip (on-hover do avatar):** `Available · click to assign` / `Disponível · clique para atribuir`.
  - O "click to assign" pré-anuncia o feature M2/M3 sem implementá-lo. Em M1-C o click ainda não faz nada — a tooltip fica como "promessa visual" do comportamento futuro.
  - **Em M1-C, o avatar tem `aria-disabled="true"` + cursor `default`** — não é clicável ainda. A tooltip aparece mesmo assim (cobre o futuro). Quando M2 destravar reassign manual, basta remover o `aria-disabled` e ligar o handler.
- **Aria-label do avatar:** `Lead available, no owner assigned` / `Lead disponível, sem dono atribuído`. Mais explícito que a tooltip pra leitor de tela.
- **Sem texto inline no card.** Avatar carrega o sinal sozinho. Nada escrito "Sem dono" em lugar algum.

### 2.4 Quando o owner é setado

Quando `lead.owner` deixa de ser null (primeiro outbound humano), a transição visual é:
- Avatar placeholder → avatar real (AlgAvatar com `src` e `name`) com fade-in de `opacity 0 → 1` em `var(--alg-duration-fast)` (140ms) + `var(--alg-ease-out)`.
- Sem morph de tamanho/posição — só fade do conteúdo no mesmo slot, pra não chamar atenção desproporcional pro evento.

---

## 3. `LeadDetailDrawer` — Spec completa

### 3.1 Base técnica

**Reusa o `AlgDrawer.vue` existente.** Não cria drawer novo, não importa shadcn-vue, não usa `<dialog>` nativo. O AlgDrawer já tem: teleport para body, focus trap, Esc, scrim com transição, `transform: translateX(100%)` de entrada, `--alg-duration-slow` (340ms) com `--alg-ease-out`. Apenas precisa receber o conteúdo correto.

**Wrapper específico:** `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadDetailDrawer.vue`. Recebe props `:open`, `:lead`, emite `update:open` / `reopen`.

### 3.2 Dimensões

- **Largura desktop (≥ md, 768px+):** `var(--alg-drawer-width)` = **420px**.
  - Por que 420 e não 480: token já existe, drawer atual (`AlgDrawer`) já roda em 420, e o conteúdo (contato + canal + owner + timeline) cabe confortavelmente em 420 com `--alg-space-modal-padding` (24px) lateral.
  - 480px deixaria o conteúdo "boiando" — em telas <1440px a sensação é de painel inchado. 420 é o ponto onde a densidade casa com a coluna do Kanban (cards de ~280px).
- **Mobile (< md):** **full-screen**, usando `100dvw × 100dvh` (dynamic viewport — `dvh` evita bounce iOS Safari quando a barra some/aparece). Em mobile o drawer ocupa a tela inteira; o scrim some (não faz sentido com 100% de cobertura).

### 3.3 Animação

Já configurada no `AlgDrawer.vue`:
- **Entrada:** `transform: translateX(100%) → 0`, `var(--alg-duration-slow)` (340ms) com `var(--alg-ease-out)` = `cubic-bezier(0.22, 1, 0.36, 1)`. É a curva canônica do design system Algorythmo — a mais próxima da curva Apple (`cubic-bezier(0.32, 0.72, 0, 1)`) entre os tokens existentes. **Não trocar.** Trocar criaria token novo só pra esse drawer, e o resto do app ficaria fora de alinhamento.
- **Saída:** `var(--alg-duration-base)` (220ms) com `var(--alg-ease-in)`. Saída mais rápida que entrada — princípio do design system: revelar é cinematográfico (340ms), esconder é discreto (220ms).
- **Scrim:** fade `opacity 0 → 1` em `--alg-duration-base` + `--alg-ease-out`.

### 3.4 Scrim (backdrop)

- **Cor:** `var(--alg-bg-overlay)` = `oklch(0.140 0.005 264 / 0.72)` no dark, `oklch(0.300 0.010 264 / 0.45)` no light. Tokens existentes.
- **Blur:** **adicionar** `backdrop-filter: blur(8px)` no `.alg-drawer-scrim`. Hoje não tem. Justificativa: dá profundidade real (o Kanban atrás vira textura, deixa de competir pela atenção). Apple/Linear/Stripe todos usam. Custo de perf: GPU compositing, OK em hardware moderno. Fallback gracioso em browsers sem suporte (sem blur, fica só o overlay escuro — não quebra).

**Engineer:** adicionar `backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);` ao `.alg-drawer-scrim` em `AlgDrawer.vue` quando este PR rodar. Isso beneficia AlgDrawer global, não só o LeadDetailDrawer — é melhoria absorvida pelo bridge de design.

### 3.5 Fechamento

Já cobertos pelo AlgDrawer atual:
- [x] Esc (document-level listener)
- [x] Click no scrim
- [x] Botão `×` no header

**Adicionar:**
- **Swipe right em touch (mobile):** quando `pointerType === 'touch'` e `deltaX > 80px && deltaY < 40px`, fechar. Implementação simples via `@touchstart`/`@touchmove`/`@touchend` no `.alg-drawer`. Sem libs. Não bloquear scroll vertical do body do drawer (`overflow-y: auto` continua funcionando).
- **`@touchmove` listener:** opcional fase 1 — se engineer estiver apertado, swipe-to-close pode ficar como follow-up (não-bloqueia M1-C). Esc + scrim + X cobrem o essencial. Adicionar tracking issue se for postergado.

### 3.6 Anatomia do corpo

Ordem dos blocos, de cima para baixo:

```
┌──────────────────────────────────────────────────────────┐
│ [👤MS]  Maria Silva                                  ×   │  ← header sticky
│                                                           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  CONTATO                                                  │  ← bloco 1
│  ────────                                                 │
│  Email     maria@cosmetic.com.br                          │
│  Telefone  +55 11 9XXXX-XXXX                              │
│                                                           │
│  CANAL                                                    │  ← bloco 2
│  ─────                                                    │
│  [💬] WhatsApp                                            │
│  Recebido via WhatsApp Business · há 4 dias               │
│                                                           │
│  DONO                                                     │  ← bloco 3
│  ────                                                     │
│  [👤MS] Maria Silva       (atribuída há 4d 2h)            │
│   OU:                                                     │
│  [🤚 placeholder]  Disponível — primeiro a responder       │
│                    vira o dono                            │
│                                                           │
│  CONVERSAS  (2)                                           │  ← bloco 4 (já reservado no CONTRACT)
│  ─────────                                                │
│  → Conversa #4821 · WhatsApp · há 4d                      │
│  → Conversa #4905 · WhatsApp · há 2d                      │
│                                                           │
│  ATIVIDADE                                                │  ← bloco 5  (NOVO M1-C)
│  ──────────                                               │
│  │                                                        │
│  ●  [👤GB] Gustavo moveu para Qualificado                  │
│  │       há 2h                                            │
│  │                                                        │
│  ●  [👤GB] Gustavo respondeu a conversa                    │
│  │       (não-evento, ver §4.6)                          │
│  │                                                        │
│  ●  [⌬]   Algorythmo criou em Novo                        │
│           há 4 dias                                       │
│                                                           │
│  [reopen button quando aplicável]                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### 3.7 Header sticky

- **Estrutura:** `AlgAvatar size="md"` (40px) + nome (`var(--alg-text-lg)`, weight `--alg-weight-semibold`) à esquerda, botão close à direita.
- **Sticky:** `position: sticky; top: 0; z-index: 1` dentro do `.alg-drawer__body` (engineer adapta o slot do AlgDrawer pra suportar ou move pro `.alg-drawer__header` existente).
- **Background:** mesmo `--alg-bg-raised`. Sob scroll, adiciona `box-shadow: 0 1px 0 var(--alg-border)` pra criar uma linha que separa header do conteúdo rolando (padrão Stripe/Linear).
- **Padding:** `var(--alg-space-modal-padding)` (24px).

### 3.8 Bloco labels (CONTATO / CANAL / DONO / etc.)

- **Estilo label:** uppercase, tracking `--alg-tracking-widest` (0.10em), peso `--alg-weight-medium`, tamanho `--alg-text-2xs` (10-11px), cor `--alg-text-tertiary`.
- **Espaçamento:** `margin-bottom: var(--alg-space-2)` antes do conteúdo do bloco; `margin-top: var(--alg-space-6)` antes do próximo label (24px entre seções).
- **Sem divisores horizontais.** O contraste de peso label/conteúdo + o gap de 24px já estrutura visualmente. Régua horizontal entre cada bloco viraria barulho (anti-padrão Linear).

### 3.9 Pares label/value dentro de um bloco

Layout em 2 colunas (label fixo + value flexível):

```
┌────────────────────────────────────────┐
│  Email     maria@cosmetic.com.br       │
│  Telefone  +55 11 9XXXX-XXXX           │
└────────────────────────────────────────┘
```

- **Grid:** `grid-template-columns: 80px 1fr; gap: var(--alg-space-2) var(--alg-space-3);`.
- **Label:** `--alg-text-xs`, `--alg-text-tertiary`, `--alg-weight-regular`. **Em sentence case** (`Email`, `Telefone`) — não uppercase aqui (uppercase é só pro label do bloco). Discrimina hierarquia.
- **Value:** `--alg-text-sm`, `--alg-text-primary`, `--alg-weight-regular`. Email/telefone aceitam `text-decoration: none` por padrão; on hover viram link sutil (`color: --alg-text-brand`, `text-decoration: underline`).
- **Quando value é null:** mostrar em `--alg-text-muted` o texto `not provided` / `não informado` em itálico. Nunca esconder a label — ausência é informação.

### 3.10 `data-testid` no drawer (atualiza CONTRACT_M1B v1.1.0)

Plano mãe §7.3 já reserva:
```
[data-testid="drawer-owner-name"]
[data-testid="drawer-stage-history-list"]
```

Adicionar a esses 2 (no mesmo bump v1.1.0):
```
[data-testid="lead-detail-drawer"]                     ← root (já existe no CONTRACT §7)
[data-testid="drawer-owner-avatar"]                    ← header + bloco DONO
[data-testid="drawer-owner-block"]                     ← seção inteira
[data-testid="drawer-owner-unassigned-placeholder"]    ← visível quando lead.owner == null
[data-testid="drawer-stage-history-block"]             ← seção ATIVIDADE
[data-testid="drawer-stage-history-item"]              ← cada entry (x N)
  [data-actor-type="user|system|agent_bot"]
[data-testid="drawer-stage-history-loading"]           ← skeleton (§7)
[data-testid="drawer-stage-history-error"]             ← erro (§8)
[data-testid="drawer-stage-history-empty"]             ← sem entries (caso edge — lead novo sem nenhuma transição registrada)
[data-testid="drawer-stage-history-retry"]             ← botão "Tentar novamente"
```

CONTRACT_M1B bump v1.1.0 lista esses **+** os 2 do plano mãe, todos no mesmo PR `[CONTRACT_BUMP]`.

---

## 4. Stage history timeline — Design completo

### 4.1 Anti-padrão a evitar

Lista chapada (`<ul><li>{ator} {ação} {tempo}</li></ul>`) é logfile. Vira ruído com 5 entries. Não é o que o produto precisa.

A timeline é o instrumento mais carregado de significado do drawer — é onde o founder vê **a jornada do lead** materializada. Tem que ler como uma narrativa visual, não como log de servidor.

### 4.2 Estrutura

Timeline vertical com guia esquerda contínua (1px) + nodes circulares na guia + 2 linhas de texto por entry à direita.

```
│
●  [👤GB] Gustavo moveu para Qualificado
│         há 2h
│
●  [👤GB] Gustavo moveu para Em proposta
│         há 1d (de Qualificado para Em proposta)
│
●  [⌬]    Algorythmo criou em Novo
          há 4 dias · 21 mai 2026, 14:32
```

### 4.3 Guia vertical

- **Elemento:** `border-left: 1px solid var(--alg-border)` na coluna à esquerda do conteúdo. Token `--alg-border` = `--alg-color-neutral-5`. Sutil mas presente.
- **Posicionamento:** 8px da borda esquerda do bloco ATIVIDADE.
- **Extensão:** começa 6px **antes** do primeiro node e termina 6px **depois** do último — guia não pode tocar nada, fica órfã elegante. Padrão Linear/Vercel.

### 4.4 Nodes

- **Forma:** círculo `8px × 8px`, `border-radius: 50%`.
- **Posicionamento:** centro alinhado à guia (offset `-4px` em margin-left pra ficar centralizado sobre a linha de 1px).
- **Cor por tipo de evento:**

| Tipo | Token cor node | Quando |
|---|---|---|
| Criação (`from_stage_id` é null) | `var(--alg-color-success)` | Lead nasce — verde indica "começo positivo". |
| Transição neutra (entre etapas open) | `var(--alg-color-neutral-7)` | Movimentação dentro do funil. |
| Fechamento "won" (`to_stage.kind === 'won'`) | `var(--alg-color-success)` | Reforço de cor do stage Won. |
| Fechamento "lost" (`to_stage.kind === 'lost'`) | `var(--alg-color-danger)` | Reforço de cor do stage Lost. |
| Reabertura (`from_stage.kind === 'won' || 'lost'` e `to_stage.kind === 'open'`) | `var(--alg-color-info)` | Sinal de "volta pra ativo". |

- **Sem texto/glyph dentro do node.** Cor sozinha basta; node é puro marcador.
- **Ring:** node tem `box-shadow: 0 0 0 3px var(--alg-bg-raised)` pra "comer" a guia atrás dele — visualmente parece flutuante sobre a linha. Sem isso, a guia atravessa o node e fica feio.

### 4.5 Conteúdo de cada entry

Estrutura de 2 linhas + avatar à esquerda (do conteúdo, não do node):

```
●  [👤GB] {Nome do ator} {verbo} {complemento}
│         {tempo relativo} {(detalhe contextual opcional)}
```

- **Linha 1 (`--alg-text-sm`, `--alg-weight-medium`, cor `--alg-text-primary`):**
  - Avatar 20px (AlgAvatar `size="sm"`) na esquerda do texto.
  - **Criação:** `{ActorName} criou em {stage_name}` — ex: `Algorythmo criou em Novo`. EN: `{ActorName} created in {stage_name}`.
  - **Transição:** `{ActorName} moveu para {to_stage_name}` — ex: `Gustavo moveu para Qualificado`. EN: `{ActorName} moved to {to_stage_name}`.
  - **Setinhas:** quando o detalhe linha 2 fizer referência cruzada from→to, usar **`→` (U+2192, RIGHTWARDS ARROW)**. Nunca `>` ASCII, nunca emoji `➡️`, nunca SVG inline. Unicode + font do sistema renderiza consistente.
- **Linha 2 (`--alg-text-xs`, `--alg-weight-regular`, cor `--alg-text-tertiary`):**
  - Tempo relativo (`há 2h`, `há 4 dias`, `há 3 sem`). Mesmo formatador de `timeFormat.js` que o card usa.
  - **Tooltip (`<time datetime="...">` com `title=`):** timestamp absoluto formatado em PT-BR/EN (`21 mai 2026 às 14:32` / `May 21, 2026 at 2:32 PM`).
  - **Para transições:** texto adicional `(de {from_stage_name} para {to_stage_name})` / `(from {a} to {b})`. Para criação, só o tempo (não tem "from").

### 4.6 Decisão crítica — Manu na timeline

A memória `project_algorythmo_os_product_vision.md` é taxativa: **Manu é indistinguível de humano** no UI. Aplicando aqui:

- Entry de Manu (`actor_type='agent_bot'`, `actor_id = AgentBot da Manu`) renderiza **exatamente** como entry de usuário humano:
  - Avatar 20px com a foto da Manu (campo do `AgentBot`).
  - Nome "Manu" (campo do `AgentBot`).
  - Mesma cor de node (neutra, como qualquer transição).
  - **Sem chip "Bot", sem ícone robô, sem cor diferente, sem rótulo `AI`.**
- O frontend recebe `actor_summary = { id, name, thumbnail }` do backend (plano mãe §7.1). O renderizador da entry **não checa `actor_type`** para decidir aparência humana vs bot — só usa `actor_summary`. O `actor_type` fica como `data-attribute` (`data-actor-type`) pra analytics/qa.

**Justificativa:** decisão de produto travada, fora do escopo do designer questionar. O risco regulatório está reconhecido na memória e tem mitigação pós-M4 prevista. Designer apenas garante que a UI não vaze a distinção.

### 4.7 Não-evento: "respondeu a conversa"

Stage history grava só transições de etapa e criação. Resposta de mensagem não vira entry de stage_history — vai entrar em **timeline de mensagens** futura (out of scope M1-C).

**Engineer:** não inventar entry de mensagem. A timeline lista APENAS o que vem de `GET /leads/:id/stage_history`. Pintar mensagem aqui é incorporar dado que o backend não envia.

(Pra evitar ambiguidade: o wireframe da §3.6 com "Gustavo respondeu a conversa" é exemplo ilustrativo de algo que VAI existir num futuro — não está no escopo deste PR. Não implementar.)

### 4.8 Densidade

- **Gap entre nodes:** `margin-top: var(--alg-space-4)` (16px) entre entries.
- **Resultado:** ~5-7 entries visíveis sem scroll dentro do drawer (assumindo viewport desktop 900px de altura). Adequado pro lead típico de PME (1-3 transições na vida).
- Lead com >7 entries: o bloco rola junto com o resto do drawer body (sem scroll interno separado).

### 4.9 Identidade visual do actor `system`

Quando o `actor_type === 'system'` (lead nasce sozinho via canal), renderiza:

- **Avatar:** quadrado `20×20` com `border-radius: var(--alg-radius-sm)` (4px) — **forma diferente** do avatar circular humano. Sutil mas reconhecível: "isso não é uma pessoa, é o sistema". Diferente de Manu, que **é pessoa** no UI.
- **Conteúdo do avatar:** monograma da Algorythmo. Glyph proposto: **U+232C BENZENE RING (⌬)** ou **U+2756 BLACK DIAMOND MINUS WHITE X (❖)** — quadrado pequeno com símbolo monocromático centralizado. Engineer escolhe entre os 2 baseado em qual renderiza mais limpo nas fontes do sistema (testar em macOS, Windows, Linux). Se nenhum render decente, fallback: **letra "A" estilizada** em `--alg-font-display`, `--alg-weight-semibold`, color `var(--alg-color-brand-primary)`.
- **Background do avatar:** `var(--alg-color-brand-primary-subtle)` (`oklch(0.300 0.080 195 / 0.18)`).
- **Cor do glyph/letra:** `var(--alg-color-brand-primary)`.
- **Sem foto.** É a marca, não uma pessoa.
- **Nome exibido:** `Algorythmo` (não `Sistema`, não `System`, não `Algorythmo OS` — só `Algorythmo`, limpo).
- **Aria-label do avatar:** `Lead criado automaticamente pelo Algorythmo OS` / `Lead created automatically by Algorythmo OS`.
- **Microcopy linha 1:** `Algorythmo criou em {stage_name}` / `Algorythmo created in {stage_name}`.

Isso resolve o tom: "Sistema" pertence a ERPs de 2003. "Algorythmo" é a marca atuando como ator. A UI introduz Algorythmo como entidade sem nunca dizer "isso é o sistema fazendo".

### 4.10 Tooltip de transição (hover sobre o tempo relativo)

```
21 mai 2026 às 14:32
de Qualificado para Em proposta
```

Implementação: `<time :datetime="iso" :title="absoluteFormatted + ' · ' + fromToLine">`. Acessível via teclado (focus no `<time>` mostra tooltip do browser).

---

## 5. Identidade do actor `system` — recap

Já especificado em §4.9 com profundidade. Aqui apenas reforço cross-cutting (pra engineer não confundir):

| Contexto | Avatar | Nome | Microcopy |
|---|---|---|---|
| Timeline do drawer | quadrado 20px + monograma | `Algorythmo` | `Algorythmo criou em {stage}` |
| (Futuro) Notificação | mesmo quadrado | `Algorythmo` | varia por contexto |
| (Futuro) Mensagem no inbox | NÃO entra como mensagem | — | sistema não posta mensagem |

Cor da marca + forma quadrada = "isto é o produto agindo". Não confundir com Manu (que é pessoa no UI, conforme decisão de produto).

---

## 6. Manu na timeline — recap

Reforço de §4.6. Para engineer não precisar interpretar:

```js
// Pseudocódigo do renderizador de entry — NÃO é o código final
function renderEntry(entry) {
  const actor = entry.actor_summary; // { id, name, thumbnail } OU null
  if (actor === null) {
    // actor_type === 'system' — usar template Algorythmo (§4.9)
    return <SystemActorEntry entry={entry} />;
  }
  // actor_type === 'user' OU 'agent_bot' — render idêntico
  return <PersonActorEntry entry={entry} actor={actor} />;
  //                                   ^^^^^^^^^^^^^^^
  //                                   sem branch pra agent_bot
}
```

`data-actor-type` no DOM existe pra QA/analytics. **Não muda visual.**

---

## 7. Loading state

### 7.1 Princípio

O drawer abre com `lead` **já em mãos** (dado do kanban store — `useLeadStore` tem o lead inteiro em memória, incluindo `owner`, `time_in_stage`, etc.). Os blocos CONTATO, CANAL, DONO, CONVERSAS renderizam **instantaneamente sem skeleton**. Apenas o bloco ATIVIDADE faz fetch lazy (`useStageHistory.fetchStageHistory(leadId)` no `onMounted` do drawer).

### 7.2 Threshold

- **Latência alvo do endpoint** (`GET /leads/:id/stage_history`): <120ms (query simples, índice cobre).
- **Threshold de exibição do skeleton:** **250ms**. Se a resposta chegar antes de 250ms, **não** mostrar skeleton — vai direto pra lista. Evita flash de skeleton que pisca por 80ms (anti-padrão clássico, faz o app parecer "instável").
- **Implementação:** setTimeout 250ms que liga `showSkeleton = true`; resposta da API liga `data = ...` e `showSkeleton = false`. Se resposta chega antes do timeout disparar, `clearTimeout` cancela e skeleton nunca aparece.

### 7.3 Skeleton — visual

3 entries placeholder, mesma estrutura da entry real (node + avatar + 2 linhas), com shimmer:

```
●  [█████]  ████████████████████████
│           ██████████

●  [█████]  ████████████████████
│           ████████████

●  [█████]  ██████████████████████████
            █████████
```

- **Cor base:** `var(--alg-bg-raised-hover)` (`--alg-color-neutral-4`).
- **Shimmer:** gradient overlay animado `linear-gradient(90deg, transparent, oklch(1 0 0 / 0.04), transparent)` que percorre da esquerda pra direita.
- **Animation:** `1.2s ease-in-out infinite`. Opacity oscila de `0.5 → 1 → 0.5` (não totalmente transparente — não desaparece).
- **prefers-reduced-motion:** shimmer some, fica só o block estático no estado intermediário. Já é coberto automaticamente pelo `@media (prefers-reduced-motion: reduce)` que zera todas as `--alg-duration-*`.
- **`data-testid="drawer-stage-history-loading"`** no container das 3 entries.

### 7.4 Tokens novos a criar

Adicionar a `_tokens.scss`:
```scss
--alg-skeleton-bg:           var(--alg-color-neutral-4);
--alg-skeleton-shimmer:      oklch(1 0 0 / 0.04);
--alg-skeleton-duration:     1.2s;
```
Light theme:
```scss
--alg-skeleton-bg:           var(--alg-color-neutral-4);
--alg-skeleton-shimmer:      oklch(0 0 0 / 0.04);
```

Justificativa: skeleton é primitive reutilizável. Vai aparecer em outros lugares (drawer de configs, dashboard analytics). Vale token semântico, não hardcode.

### 7.5 Spinner

**Proibido.** Spinner é o padrão de "não pensei no estado de loading". Skeleton entrega:
- forma do conteúdo que vai chegar (reduz CLS percebido)
- sinal de progresso sem rotação chamativa
- alinhamento com Linear/Vercel/Stripe

Em nenhum momento desta tela aparece spinner. Engineer não importa `<Spinner />` nem cria `<svg>` rotacionando.

---

## 8. Erro state

### 8.1 Quando dispara

`fetchStageHistory(leadId)` rejecta (timeout, 5xx, 4xx, network). Erro local — drawer continua aberto, demais blocos seguem visíveis.

### 8.2 Visual

```
┌──────────────────────────────────────┐
│                                      │
│              [⚠]                     │
│   Não foi possível carregar           │
│   a atividade                        │
│                                      │
│       [ Tentar novamente ]            │
│                                      │
└──────────────────────────────────────┘
```

- **Container:** centralizado dentro do bloco ATIVIDADE, padding `var(--alg-space-6)` (24px vertical).
- **Ícone:** Lucide `alert-circle` `20×20`, stroke 1.5px, cor `var(--alg-color-warning)`.
- **Texto:** `var(--alg-text-sm)`, `var(--alg-text-secondary)`. Centralizado.
- **Botão "Tentar novamente":** estilo `text-only` (sem fill, sem border) — `var(--alg-text-sm)`, `var(--alg-text-brand)`, `text-decoration: none`, hover `text-decoration: underline`. Click chama o mesmo `fetchStageHistory` (idempotente).
- **`data-testid="drawer-stage-history-error"`** no container; `data-testid="drawer-stage-history-retry"` no botão.
- **Sem toast.** Toast é para falha que afeta **ação do usuário** (move falhou → toast). Erro local de leitura dentro de um drawer aberto é erro **local** — resolução é local (botão Retry no próprio bloco).

### 8.3 Quando É toast

Mantém o padrão M1-B atual: toast só pra `commitMove` / `rollbackMove`. Nada novo aqui em M1-C.

### 8.4 Empty state (caso edge)

Cenário improvável mas possível: lead criado antes do listener StageHistory estar montado (M1-C migration 2 é greenfield — plano mãe §8.3 cenário 2 decidiu **não retro-popular**). Esses leads abrem o drawer e a timeline vem **vazia** (`stage_history: []`).

Visual:
```
┌──────────────────────────────────────┐
│                                      │
│   Sem atividade registrada           │
│                                      │
└──────────────────────────────────────┘
```

- `var(--alg-text-sm)`, `var(--alg-text-tertiary)`, padding `var(--alg-space-6)`, centralizado.
- `data-testid="drawer-stage-history-empty"`.
- Sem botão, sem retry. É info, não erro.
- Microcopy: `No activity yet` / `Sem atividade registrada`.

---

## 9. `time_in_stage` server-side — não usar no chip

### 9.1 Risco identificado

Plano mãe §7.2 propõe expor `time_in_stage: ((Time.current - stage_entered_at)).to_i` no `lead_json`. A intenção era "frontend para de calcular relógio do cliente". Problema:

- O chip aging muda de cor em thresholds (`ratio < 1` verde, `1 ≤ ratio < 2` amarelo, `ratio ≥ 2` vermelho — CONTRACT_M1B §4).
- Polling do frontend é 8s; `now.value` atualiza a cada 30s (`AGING_TICK_MS` em KanbanBoard.vue).
- Se o backend recalcula `time_in_stage` a cada response (e o frontend re-renderiza com o valor recebido), o chip pode oscilar verde→amarelo→verde quando o relógio cliente/servidor estiver dessincronizado em 1-2 segundos no exato momento da virada de threshold.
- Atravessar threshold "para frente e para trás" em ciclos de 8s é visualmente horror — vira o sinal mais importante do Kanban num placebo nervoso.

### 9.2 Decisão

**Frontend continua calculando localmente o tempo a partir de `stage_entered_at` (timestamp absoluto, imutável durante o ciclo de vida do lead em uma etapa).**

- `stage_entered_at` não tem drift — é um ponto fixo no passado, retornado pelo server uma vez por response, e cliente faz `Date.now() - stage_entered_at_ms` sempre com a mesma referência.
- O cálculo de `aging_state` (verde/amarelo/vermelho) e do `time_human` (`4d 2h`) usa essa subtração local. Que é o que já acontece em `KanbanBoard.vue` (`toPresenter` chama `elapsedSince(lead.stage_entered_at, now)`).
- **Engineer NÃO troca o cálculo local pelo `lead.time_in_stage` server-side.** Mesmo que o backend mande o campo, frontend ignora pro propósito de chip e tempo do card.

### 9.3 Para que serve, então, o `time_in_stage` server-side?

Originalmente o plano mãe queria expor isso pelo motivo "frontend para de calcular". Esse motivo cai depois do raciocínio acima. Permanecem dois usos legítimos:

1. **Analytics / telemetria server-side** (dashboard M3 vai precisar de `time_in_stage` por lead).
2. **Outros consumidores futuros da API** (export CSV, webhook, etc.) que não têm contexto pra calcular.

**MAS:** ambos são consumidores não-presentes em M1-C. Adicionar campo só pra futuro = YAGNI.

### 9.4 Alinhamento com adversarial review backend

O adversarial review do backend (mencionado no prompt) chegou na mesma conclusão por ângulo de perf/cache. **Recomendação:** o plano mãe §7.2 deve **remover `time_in_stage` do `lead_json`** no PR 3. Backend só expõe `stage_entered_at`. PR 4 (este) não precisa nem decidir se usa — o campo nem chega.

**Ação:** designer notifica planner/founder que §7.2 do plano 0003 precisa de minor edit removendo `time_in_stage`. Não bloqueia este adendo. Bloqueia abertura de PR 3 (5 linhas a mudar no plano). Se planner mantiver `time_in_stage`, frontend simplesmente ignora — sem regressão, mas com dead field no JSON.

### 9.5 Anti-flicker no formato de tempo

Mesmo com cálculo local, há um cenário menor de "flicker": o tempo passa de `59 min` pra `1 h` num refresh do tick (30s). O `time_human` muda. Card "salta" de label de 5 chars pra label de 3 chars.

**Mitigação:** o formatador `timeSinceLabel` já existe em `helper/algorythmo/timeFormat.js` (M1-B). Confirmar com o engineer que ele:
- formata `< 1min` como `agora`
- `< 60min` como `{N} min`
- `< 24h` como `{N}h` (sem `min`)
- `< 7d` como `{N}d {H}h` (granular nos dias)
- `< 4 sem` como `{N} sem`
- `> 4 sem` como `{N} m` (meses)

Saltos entre escalas são raros (uma vez por escala — ~24h pro min→h, etc.). Aceitos. Sem necessidade de transição suave entre labels (seria over-engineering).

---

## 10. Microcopy — EN + PT-BR

Tabela canônica. Engineer adiciona ao `app/javascript/dashboard/i18n/locale/{en,pt_BR}/algorythmoCrm.json` no PR 4. Chaves seguem convenção existente (`SCREAMING_SNAKE_CASE` aninhado).

| Chave i18n | EN | PT-BR | Onde aparece |
|---|---|---|---|
| `ALGORYTHMO_CRM.LEAD_CARD.OWNER_ASSIGNED_ARIA` | `Lead owner: {name}` | `Dono do lead: {name}` | aria-label do avatar do owner (quando assigned), no card |
| `ALGORYTHMO_CRM.LEAD_CARD.OWNER_UNASSIGNED_ARIA` | `Lead available, no owner assigned` | `Lead disponível, sem dono atribuído` | aria-label do placeholder, no card |
| `ALGORYTHMO_CRM.LEAD_CARD.OWNER_UNASSIGNED_TOOLTIP` | `Available · click to assign` | `Disponível · clique para atribuir` | tooltip on-hover do placeholder |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.WHATSAPP` | `WhatsApp` | `WhatsApp` | label de canal (card linha 2) |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.EMAIL` | `Email` | `E-mail` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.INSTAGRAM` | `Instagram` | `Instagram` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.FACEBOOK` | `Facebook` | `Facebook` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.WIDGET` | `Web chat` | `Chat no site` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.API` | `API` | `API` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.SMS` | `SMS` | `SMS` | ↑ |
| `ALGORYTHMO_CRM.LEAD_CARD.CHANNEL_LABEL.UNKNOWN` | `Other channel` | `Outro canal` | fallback |
| `ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CONTACT` | `Contact` | `Contato` | bloco do drawer |
| `ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CHANNEL` | `Channel` | `Canal` | ↑ |
| `ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.OWNER` | `Owner` | `Dono` | ↑ |
| `ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.CONVERSATIONS` | `Conversations` | `Conversas` | ↑ |
| `ALGORYTHMO_CRM.DRAWER.BLOCK_LABEL.ACTIVITY` | `Activity` | `Atividade` | ↑ |
| `ALGORYTHMO_CRM.DRAWER.CONTACT.EMAIL_LABEL` | `Email` | `E-mail` | par label dentro do bloco |
| `ALGORYTHMO_CRM.DRAWER.CONTACT.PHONE_LABEL` | `Phone` | `Telefone` | ↑ |
| `ALGORYTHMO_CRM.DRAWER.CONTACT.NOT_PROVIDED` | `not provided` | `não informado` | quando email/phone é null |
| `ALGORYTHMO_CRM.DRAWER.OWNER.UNASSIGNED_LABEL` | `Available — first to reply becomes owner` | `Disponível — primeiro a responder vira o dono` | placeholder dentro do bloco DONO no drawer (texto inline; aqui SIM aparece texto, diferente do card) |
| `ALGORYTHMO_CRM.DRAWER.OWNER.ASSIGNED_SINCE` | `Assigned {time}` | `Atribuída há {time}` | ao lado do nome do owner real |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.SYSTEM_ACTOR_NAME` | `Algorythmo` | `Algorythmo` | nome do ator system |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.SYSTEM_ACTOR_ARIA` | `Lead created automatically by Algorythmo OS` | `Lead criado automaticamente pelo Algorythmo OS` | aria-label do avatar system |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.CREATED_IN` | `{actor} created in {stage}` | `{actor} criou em {stage}` | linha 1 entry de criação |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.MOVED_TO` | `{actor} moved to {stage}` | `{actor} moveu para {stage}` | linha 1 entry de transição |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.FROM_TO` | `from {from} to {to}` | `de {from} para {to}` | parte adicional da linha 2 (tooltip também) |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.EMPTY` | `No activity yet` | `Sem atividade registrada` | empty state §8.4 |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.ERROR_TITLE` | `Couldn't load activity` | `Não foi possível carregar a atividade` | erro state §8 |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.RETRY` | `Try again` | `Tentar novamente` | botão retry §8 |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.TIME_RELATIVE_AGO` | `{time} ago` | `há {time}` | formatador relativo (fallback caso `timeFormat.js` não cubra) |
| `ALGORYTHMO_CRM.DRAWER.STAGE_HISTORY.TIME_ABSOLUTE_TOOLTIP` | `{date} at {time}` | `{date} às {time}` | tooltip do `<time>` |
| `ALGORYTHMO_CRM.DRAWER.CLOSE` | `Close` | `Fechar` | botão `×` do header (já existe em AlgDrawer com default `Fechar`, este unifica) |

### 10.1 Notas de conteúdo

- **"Available" / "Disponível":** decisão fundamental — nunca usar "Sem dono", "Não atribuído", "Unassigned" no UI consumido pelo usuário. Aceitar apenas em telemetria/log internos. A palavra que toca o usuário é sempre "disponível".
- **Capitalização:** PT-BR usa sentence case em microcopy (ex: `Não foi possível carregar a atividade`, não `Não Foi Possível Carregar A Atividade`). EN segue o mesmo (Stripe style: `Couldn't load activity`, não `Could not Load Activity`).
- **Contrações em EN:** preferir `couldn't`, `can't`, `won't` ao formal — alinhamento com Linear/Vercel/Stripe voice.
- **PT-BR feminino/neutro:** "atribuída" (concorda com "Maria", "Joana"). Caso o owner seja homem, ainda funciona porque o sujeito implícito é "a atribuição" / "a dona/o dono". Plurabilidade aceita.
- **"Algorythmo" sem acento, sem itálico, sem aspas.** Marca pura.

---

## 11. Resumo do delta sobre o plano mãe

| Item | Plano 0003 dizia | Este adendo trava |
|---|---|---|
| Grid do LeadCard | "renderiza avatar do `lead.owner` no canto inferior direito" | 2 linhas, owner no footer-direito, channel vira label texto |
| Placeholder owner | "ou placeholder 'Sem dono'" | Avatar tracejado com Lucide `hand`, tooltip "Disponível · clique para atribuir", sem texto inline no card |
| Drawer | "a criar — não foi feito em M1-B" | Reusa AlgDrawer, 420px desktop / full mobile, scrim com blur 8px, swipe-right opcional |
| Timeline | "lista stage_history com timestamps relativos e nome do ator" | Vertical guide + colored nodes + 2-line entries + tooltips + sticky header + 5 estados (loading/error/empty/data/single) |
| Loading | (não especificado) | Skeleton 3 entries com threshold 250ms, sem spinner, tokens novos `--alg-skeleton-*` |
| Erro | (não especificado) | Bloco local centralizado, sem toast, botão retry text-only |
| `time_in_stage` no chip | "Frontend para de calcular" | **Frontend continua calculando local** a partir de `stage_entered_at`, server-side é dead field — recomendação ao planner: remover do `lead_json` |
| `system` actor visual | (não especificado) | Quadrado 20px + monograma Algorythmo + nome "Algorythmo" + aria-label longo |
| Manu visual | (memória de produto: indistinguível) | Confirmado: render idêntico a User no DOM (avatar circular, sem chip, sem cor diferente) |
| Microcopy | "ganha as strings de owner, sem dono, histórico, ator system" | Tabela canônica de 28 chaves EN+PT-BR |
| CONTRACT bump | "v1.1.0 adiciona `drawer-owner-name` e `drawer-stage-history-list`" | v1.1.0 cobre 13 testids (este doc lista todos) + `lead-card-owner-avatar` + `lead-card-channel-label` no card |

---

## 12. Definição de pronto deste adendo (designer → engineer handoff)

Este adendo está pronto pra ser implementado quando:

- [ ] Founder leu o TL;DR e aprovou a Opção A do grid.
- [ ] Planner aceitou a recomendação §9.4 (remover `time_in_stage` do plano 0003 §7.2) — ou rejeitou explicitamente (e neste caso frontend ignora o campo).
- [ ] CONTRACT_M1B bump v1.1.0 lista os 13 testids acima.
- [ ] Engineer leu este doc inteiro antes de abrir `algorythmo/m1c-frontend-wire-real-data`.
- [ ] Engineer adicionou os tokens `--alg-skeleton-*` ao `_tokens.scss` (PR 4 inclui essa edição em paralelo aos componentes).

Quando os 5 itens acima estiverem marcados, PR 4 pode abrir.

---

## 13. O que este adendo NÃO faz

Pra não criar expectativa errada:

- **Não implementa código.** Zero `.vue`, zero `.scss`, zero `.json`. Tudo é especificação textual.
- **Não substitui o plano 0003.** Adendo sobre §10 PR 4. PRs 1, 2, 3, 5 seguem como descritos.
- **Não decide produto.** Decisões de produto (Manu indistinguível, "quem pega leva", canal-first) vêm da memória existente. Designer apenas materializa visualmente.
- **Não cobre PR 5 (Playwright).** Os testids estão aqui pra QA poder escrever testes contra eles, mas a suite de e2e é entrega de PR 5.
- **Não desenha o feature de reassign manual** (M2/M3). Apenas reserva o gesto visual (tooltip "click to assign") sem ligar handler.
- **Não desenha o feature de timeline de mensagens.** O exemplo na §3.6 é ilustração — engineer NÃO implementa "respondeu a conversa" como entry de stage_history.

---

## 14. Referências externas / inspiração visual

Para o engineer calibrar olho enquanto implementa:

- **Linear — drawer de issue:** header sticky, blocks com label uppercase + value, timeline lateral. <https://linear.app>
- **Vercel — deployment drawer:** scrim com blur, animação de slide, escape patterns. <https://vercel.com>
- **Stripe — customer drawer:** 2-column label/value, tooltip on timestamps. <https://dashboard.stripe.com>
- **Apple Mail — message list:** densidade de 2 linhas que o LeadCard imita. macOS Sonoma+.
- **Airbnb — host inbox:** avatar + nome + meta em 2 linhas, exatamente o padrão proposto pra LeadCard.

Sem screenshot embarcado — engineer abre cada um no browser ao implementar pra calibrar densidade e ritmo visual.

---

**Fim do adendo.**

