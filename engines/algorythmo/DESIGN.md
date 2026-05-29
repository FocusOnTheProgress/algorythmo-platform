# Algorythmo OS — Design System (Cinematic OS v2)

**Status:** Aguarda aprovação do founder antes de implementação.
**Versão:** v2 — Cinematic OS — Lock criativo (sem mudanças de código de produto neste PR).
**Owner:** founder + designer agent.
**Última revisão:** 2026-05-28.
**Documentos vinculados:** `docs/algorythmo/handoff-2026-05-28-cinematic-os-rejected.md`, `docs/algorythmo/cinematic-os/FOLLOW-UPS.md`.

> Este documento é o briefing visual da plataforma. É lido como editorial, não como spec sheet. Cada decisão tem uma razão. Cada exceção tem um lugar. Cada componente identitário é sagrado. Em dúvida entre adicionar e remover, **remover ganha** — o produto é o silêncio entre os elementos.

---

## 0. O que mudou da v1 para a v2

O **Cinematic OS v1** (PR #82, commit `89f591d4b`) chegou em produção com fundamento sólido — paleta calibrada, tokens limpos, glass real, dark-first, paridade WCAG AA. Mas falhou no review visual do founder porque parou no meio do caminho: deu o vocabulário e não deu a identidade. Faltou **objeto vivo**, faltou **cinematografia ambiente**, faltou o tell que separa "dark theme bem feito" de "sala de comando premium". A v2 não joga a v1 fora — **refina e fecha o que ficou em aberto.**

As 9 evoluções concretas:

1. **Componentes identitários eleitos e nomeados.** O §12 da v1 deixava ambient motion library e component coverage como open questions. A v2 trava cinco componentes assinatura (§5 e §6 novos): **Sunburst Orb**, **Aurora Orb + Conduits**, **Planet Avatars**, **Inline Semantic Atoms**, **Hero Cinematography**. Cada um com regra de aparição, animação ambient, e princípio de sacralidade (onde pode aparecer, onde não pode).
2. **Gradiente assinatura definido e protegido.** A v1 tinha brand single hue cyan-teal. A v2 mantém o brand cyan-teal para **interaction** (CTA, focus ring, brand mark — chrome operacional) e introduz o **Aurora Gradient** (magenta → rosa → violeta) como **identidade de objeto vivo** — restrito EXCLUSIVAMENTE ao Aurora Orb e ao Planet Avatar set. Cromia rica em chrome continua banida.
3. **Glass mais agressivo, com grain.** Blur 20/40/60 preservado, saturação subida (160 → 180 / 180 → 200 / 180 → 220) e introdução do **token `--alg-glass-grain`** — noise SVG inline 1% opacidade que separa "glass Apple visionOS" de "rgba sobre rgba". Sem grain, glass nunca é real.
4. **Motion ambiente formalizada.** A v1 reservou `--alg-duration-ambient` (6 s) sem protocolo. A v2 define a **curva ambiente sinusoidal**, o token `--alg-ease-ambient`, e o protocolo dos dois orbs: Sunburst pulsa 8 s (radial breathe + slow CCW rotation), Aurora respira 6 s (cromia drift + conduits glow ramp).
5. **Densidade variável codificada em 3 perfis.** A v1 mencionava densidade variável por contexto. A v2 cria três perfis nomeados e auditáveis: **`.alg-density-hero`** (96 px padding, 1 KPI/tela, respiração editorial), **`.alg-density-editorial`** (48 px, prose flow Linear/Notion), **`.alg-density-operational`** (24 px, grid kanban/tabela/list). Tela inteira herda densidade por classe no container raiz.
6. **Sidebar refundada (spec textual).** Estrutura nova alinhada à Ref 1: workspace switcher topo com logo cliente (quadrado glass), seções nomeadas com micro-uppercase header ("Agentes", "Fontes", "Management"), item ativo em **pill inversa** (fill branco + texto preto — a inversão de elevação é o tell premium), sub-itens colapsáveis com chevron, footer com perfil + status dot legível. Fix do bug v1 "último item da sidebar vaza" registrado no §10.
7. **CRM Kanban como pattern documentado.** Estrutura da Ref CRM aproveitada, **cromia saturada das colunas rejeitada**: cor de coluna no Cinematic OS é **status semântico atenuado** (oklch L≈0.45-0.55, chroma ≤0.12), nunca decoração. Spec completo em §7.
8. **White model — direção validada, toggle continua deferido.** A Ref 4 confirma que fotografia montanha clara funciona como hero do white model. Mantemos o variant pronto em tokens; o toggle público vira issue separada (não bloqueia v2).
9. **Princípio explícito de remoção de identidade Chatwoot.** Nova §13: lista de antipattern Chatwoot a auditar e expurgar do produto. É princípio do sistema, não checklist de PR.

Continuidade preservada: a convenção `--alg-*` / `.alg-*`, o dual-coding LeadAgingChip, o gate WCAG AA, a estrutura `engines/algorythmo/app/assets/stylesheets/` e a integração via `_woot.scss` ficam intactas. **v2 evolui, não reinventa do zero.**

---

## 1. Filosofia

Algorythmo OS não é um SaaS. **É a sala de comando do founder.**

O comprador é fundador ou CEO de empresa mid-market. Posicionamento: enterprise high-ticket. Referência de mercado: Gong, Salesforce. Referência de qualidade visual: Apple, Linear, Arc, Vercel. Referências mais profundas: Apple Intelligence, visionOS, Raycast, Things 3, Teenage Engineering, Aesop, editorial Field Mag.

A tese é simples e dura: **a interface entrega vastidão sob controle.**

> Eu comando algo grande, e está tudo sob domínio.

Essa é a única sentença que a tela precisa transmitir. Toda decisão visual responde a ela. Densidade variável, silêncio operacional, presença inteligente — tudo serve a essa única sensação.

**Cinematic Operating System.** A plataforma é um sistema, não um app. A superfície carrega gravidade — preto profundo como cinema escuro, tipografia editorial como suplemento de jornal de domingo, glass real como visionOS, motion com a curva da Apple. Densidade respira em hero, densifica em builder, fica clínica em operacional.

**Editorial monocromática.** A paleta é preto e branco. Cor é exceção semântica, nunca decoração. Hierarquia se constrói por tipografia (peso 300-600 + tracking negativo) e por opacidade do branco (4 níveis: 1.00 / 0.72 / 0.48 / 0.28). Se uma tela usa mais de um hue saturado em chrome, refaz.

**Cromia rica é identidade, não ornamento.** O Aurora Gradient (magenta → rosa → violeta) existe em **dois lugares e só esses dois**: o Aurora Orb (objeto vivo central da plataforma) e o set de Planet Avatars (identidade dos agentes). Em qualquer outro lugar é hierarquia errada.

**Glass real, depth real, luz real.** `backdrop-filter` calibrado (blur 20 / 40 / 60) + saturação alta (160 / 180 / 220) + **noise grain 1%** + hairline border 1px + inset top highlight obrigatório. Sistema de elevação em 4 níveis. Bordas grossas e sombras flat são banidas.

**Motion Apple-grade ou não existe.** Curva default `cubic-bezier(0.32, 0.72, 0, 1)`. Microinterações 120-400 ms. Loops ambientes 6-8 s em sinusoide. Toda ação tem feedback em ≤16 ms (1 frame). Optimistic UI + skeletons no lugar de spinners.

**O produto é o silêncio entre os elementos.** Na dúvida entre adicionar e remover, **remover ganha**.

**Teste final:** abre a tela no monitor 27" de um CEO. Se ele não sentir "isto é o software mais bem-feito que eu já vi", o trabalho não está pronto.

---

## 2. O que jamais fazer

Lista dura. Qualquer item aqui é reprovação imediata:

- Cores saturadas como background (gradient roxo-azul AI, lavanda corporativo, qualquer pastel)
- Cromia rica em chrome (Aurora Gradient só aparece em Aurora Orb e Planet Avatars — em qualquer outro lugar é erro)
- Coluna de Kanban com cor saturada como header (ver §7 — coluna é status semântico atenuado, não decoração)
- Neumorfismo / soft UI
- Ilustrações 3D Spline genéricas, Lottie por padrão
- Ícones coloridos cheios (use Lucide ou Phosphor Light, stroke 1.5 px, sem fill colorido)
- Sombras flat duras sem inset highlight (translucent black sobre preto = invisível)
- Bordas grossas (≥2 px) em chrome
- Glass sem `backdrop-filter` real ou sem grain noise (rgba sozinho não é glass)
- Spinners circulares (use skeletons / shimmers / optimistic UI)
- Toasts genéricos do shadcn default
- Densidade alta em hero (home, login, splash, onboarding precisam respirar a 96 px)
- Cor sem significado semântico (rosa "pra ficar bonito" = reprovou)
- Animação sem easing customizado (linear / ease-in-out named = banidos fora de progress bars)
- Animação ambiente sem curva sinusoidal (loop com easing direcional perceptível = robótico)
- Emoji em chrome operacional
- Tipografia em peso 700/800/900 (lê corporativo, quebra registro editorial)
- AI-slop tells: gradient azul-roxo blob, sparkle ✨ em chrome, "Powered by AI" badges, ícones genéricos de "AI brain"
- Identidade Chatwoot remanescente (azul `#1F93FF`, Lato/Open Sans, logo Chatwoot, emojis em chrome — auditar §13)

---

## 3. Sistema visual — specs duras

### 3.1 Paleta

**Black scale (dark — default).** Preto profundo de #000 a ~#1F2025. Chroma muito baixa (≤0.003) — o preto é preto, mas com vertical separation suficiente pra construir elevação. Sem tilt azul (tell do AI slop).

| Token | Aprox | Uso |
|---|---|---|
| `--alg-black-0` | #000000 | Void / pure black — hero floor |
| `--alg-black-1` | #0A0A0B | App base — beneath everything |
| `--alg-black-2` | #111113 | App canvas (default) |
| `--alg-black-3` | #18181B | Raised — cards, panels, sidebar |
| `--alg-black-4` | #1E1E22 | Raised hover, secondary surface |
| `--alg-black-5` | #25252A | Tertiary surface |
| `--alg-black-6` | #1F2025 ceiling | Top edge of black scale |

**Foreground (branco em 4 opacidades).** Quatro níveis. Apenas quatro. Adicionar um quinto é tell de hierarquia indecisa — recusa.

| Token | Opacidade | Uso |
|---|---|---|
| `--alg-fg-primary` | 1.00 | Body, headlines, KPI values |
| `--alg-fg-secondary` | 0.72 | Labels, context, paragraphs |
| `--alg-fg-tertiary` | 0.48 | Metadata, captions, hints |
| `--alg-fg-quaternary` | 0.28 | Watermarks, decorative, disabled |

**Brand interaction — single hue cyan-teal.** Aparece em CTA primário, focus ring, brand mark. **Não** é a identidade cromática viva da plataforma — é a tinta de interação. Calibrado pra ≥4.5:1 sobre canvas escuro.

| Token | Valor OKLCH (dark) |
|---|---|
| `--alg-color-brand-primary` | `oklch(0.745 0.165 195)` |
| `--alg-color-brand-primary-hover` | `oklch(0.795 0.155 195)` |
| `--alg-color-brand-primary-active` | `oklch(0.685 0.170 195)` |

**Aurora Gradient — identidade cromática viva.** A única cromia rica do sistema. Aparece no Aurora Orb (§6.2) e no Planet Avatar set (§6.3). Dois usos de **superfície-assinatura** estendem — não relaxam — essa regra: os atoms `--memory`/`--criteria` em prose (§6.4) e a **Aurora Border** (§6.6), restrita às superfícies onde a inteligência viva fala ou ingere. Em chrome operacional, **nunca**.

| Token | Valor OKLCH | Papel |
|---|---|---|
| `--alg-aurora-1` | `oklch(0.62 0.21 350)` | Magenta carmim (centro do orb, peak chroma) |
| `--alg-aurora-2` | `oklch(0.58 0.24 012)` | Rosa carmesim (mid stop, peso emocional) |
| `--alg-aurora-3` | `oklch(0.52 0.22 295)` | Violeta profundo (extremidades, gravidade) |
| `--alg-aurora-grad` | `radial-gradient(circle at 35% 30%, var(--alg-aurora-1) 0%, var(--alg-aurora-2) 40%, var(--alg-aurora-3) 100%)` | Composição assinatura |
| `--alg-aurora-conduit` | `linear-gradient(90deg, transparent 0%, color-mix(in oklch, var(--alg-aurora-1), transparent 30%) 50%, transparent 100%)` | Raios de conexão (fade fora-dentro-fora) |

**Regra de sacralidade:** se o Aurora Gradient aparecer fora do Aurora Orb, de um Planet Avatar, ou das duas superfícies-assinatura sancionadas (atoms §6.4, Aurora Border §6.6), é reprovação imediata. Não é "decoração de hero", não é "destaque de KPI", não é "splash de empty state". É identidade — escassa, deliberada, viva. As exceções são **fechadas e nomeadas**: ampliá-las exige decisão de design, nunca julgamento de implementação.

**Semantic status.** Success / warning / danger / info. Atenuados em dark, ≥4.5:1 sobre canvas. Usados com semântica, nunca como decoração.

**Por que OKLCH.** Lightness em OKLCH é perceptualmente uniforme — o ramp de pretos lê como o mesmo passo a olho nu. HSL mente.

### 3.2 Tipografia

**Famílias:**

- **Display:** Geist preferido (Vercel-quality numerals), fallback `InterDisplay` → `Inter` → system. Söhne é o upgrade target quando licenciado.
- **Sans:** Inter (já self-hosted upstream) → system.
- **Mono:** Geist Mono preferido, fallback `JetBrains Mono` → `SF Mono` → system.

> Self-host pendente: `@font-face` para Geist / Geist Mono / Söhne fica como TODO no `_tokens.scss` para handoff pro brand designer humano. Até lá, o stack fluido cobre.

**Escala (px):** 11 / 13 / 14 / 16 / 18 / 24 / 32 / 40 / 56. Implementada com `clamp()` — mobile lê confortável a 320-375 px, desktop respira a 1440 px+. Ratio 1.250 (minor third), padrão editorial.

**Pesos:** banda estreita, 300-600. Light (300) para display em hero. Regular (400) e medium (500) para UI. Semibold (600) só para títulos e estados ativos.

**Tracking:**

- `--alg-tracking-tightest` -0.030em — hero numerals, KPI anchors, "Bem vindo ao Agent Studio"
- `--alg-tracking-tight` -0.022em — display titles
- `--alg-tracking-snug` -0.012em — UI labels
- `--alg-tracking-widest` 0.10em — ALL-CAPS micro labels (uppercase mono para watermarks, section headers da sidebar, status)

**Line heights:** 1.05 (display tight) / 1.20 (display snug) / 1.45 (body normal) / 1.625 (relaxed).

### 3.3 Espaçamento — três perfis de densidade

Base 4 px. Scale: `0 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96`.

A v2 codifica **três perfis de densidade explícitos**. Tela inteira herda densidade aplicando a classe no container raiz. Cada perfil define padding de container, gap interno, e tipo de respiração.

| Perfil | Classe | Container padding | Gap interno | Cabeçalho | Uso |
|---|---|---|---|---|---|
| Hero | `.alg-density-hero` | 96 px | 48 px | display 56 px / weight 300 / tracking -0.030 | Login, Agent Studio empty, splash, onboarding, hero de marketing |
| Editorial | `.alg-density-editorial` | 48 px | 32 px | display 32 px / weight 400 / tracking -0.022 | Builders (prompt editor, checkpoint editor), settings, prose flow |
| Operational | `.alg-density-operational` | 24 px | 16 px | sans 18 px / weight 500 / tracking -0.012 | Kanban, inbox, table list, dashboard de KPI, sector pages |

**Regra de subida:** dentro de uma página `operational`, regiões hero (KPI anchor de setor) podem subir uma faixa de densidade local sem trocar o container — gap 24 → 32. Mas a inversa (densificar dentro de hero) **nunca** — hero é hero.

Aliases semânticos: `--alg-space-card-padding` (24 px default), `--alg-space-modal-padding` (32 px), `--alg-space-hero-padding` (96 px). Use o alias, não o step bruto — o alias descreve a intenção.

### 3.4 Border-radius

| Token | Valor | Uso |
|---|---|---|
| `--alg-radius-sm` | 8 px | Inputs, small chips, inline semantic atoms |
| `--alg-radius-md` | 12 px | Buttons, cards densos, dropdowns |
| `--alg-radius-lg` | 16 px | Panels, glass surfaces, kanban cards |
| `--alg-radius-2xl` | 24 px | Modals, drawers, hero canvas frames |
| `--alg-radius-pill` | 9999 px | Avatars, sidebar item ativo (pill inversa), pill chips |

Comprometa-se com um nível por componente. Misturar `md` e `lg` arbitrariamente é tell de design descuidado. O alias legado `--alg-radius-xl` (= `lg`) está marcado para deprecação em §10.

### 3.5 Sombras (sistema de elevação em 4 níveis)

Sombras em dark mode são problema de craft. Translucent black sobre preto some. **Toda elevação no Cinematic OS combina outer shadow direcional + inset top highlight obrigatório** — simula objeto iluminado de cima.

| Token | Uso |
|---|---|
| `--alg-elevation-1` | Hairline lift — chip, divider sutil, sidebar item idle |
| `--alg-elevation-2` | Card default, hover de surface, kanban card |
| `--alg-elevation-3` | Dropdown, popover, menu, planet stack picker |
| `--alg-elevation-4` | Modal, drawer, comando central |

Cada elevation token inclui:
1. `inset 0 1px 0 0 rgba(255, 255, 255, alpha)` — top highlight (4-8% conforme nível)
2. Outer shadow direcional em true black com opacity escalonada
3. 1 px outline em true black low-opacity (border refinado)

### 3.6 Glass (sistema em 3 níveis, com grain)

Glass não é decoração — é uma superfície. Três níveis calibrados. **v2 sobe saturação e adiciona grain noise — é o tell que separa glass visionOS de "rgba sobre rgba" amador.**

| Token | Blur | Saturation | Uso |
|---|---|---|---|
| `--alg-glass-soft` | 20 px | 180% | Menu, dropdown, sidepanel agente, sidebar item ativo |
| `--alg-glass-medium` | 40 px | 200% | Toast, drawer scrim, kanban card hover |
| `--alg-glass-hard` | 60 px | 220% | Modal overlay (pushes canvas behind into soft focus) |

**Regras de glass (não-negociáveis):**

- Requer `backdrop-filter`. Sem suporte → fallback para `--alg-bg-elevated` sólido. Nunca "fake glass" com rgba sozinho.
- Sempre acompanhado de hairline border 1 px (`--alg-glass-border`).
- Sempre acompanhado de inset highlight (`--alg-glass-highlight`).
- Sempre compõe com `--alg-elevation-*` para depth.
- **Sempre carrega grain.** Token `--alg-glass-grain` é uma camada `::after` ou `background-image` adicional com SVG noise inline a 1-2% opacidade. Sem grain, glass não é real (vira "frosted plastic"). O grain quebra a uniformidade do blur e dá vida ao material.

Implementação do grain (data-URI SVG, ~600 bytes):

```scss
--alg-glass-grain:
  url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
```

Aplicado via pseudo-elemento sobre a superfície de glass:

```scss
.alg-glass-surface::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--alg-glass-grain);
  opacity: 0.6; // grain final ~0.6% — perceptível em 27", invisível em mobile
  mix-blend-mode: overlay;
  pointer-events: none;
  border-radius: inherit;
}
```

### 3.7 Motion

**Curva default (interação):** `cubic-bezier(0.32, 0.72, 0, 1)` (token `--alg-ease-cinematic`). Apple signature. Toda transição UI sai daqui por padrão.

**Curva ambiente (loops infinitos):** sinusoidal idealizada — animação ambient nunca tem easing direcional perceptível, ela respira. Implementado como `cubic-bezier(0.45, 0.05, 0.55, 0.95)` com modo `alternate` ou via `@keyframes` com easing simétrico. Token `--alg-ease-ambient`.

**Durações:**

- `--alg-duration-instant` 120 ms — press, color shift
- `--alg-duration-fast` 180 ms — hover, tooltip
- `--alg-duration-base` 240 ms — dropdown, card hover, focus
- `--alg-duration-slow` 340 ms — drawer, modal, route
- `--alg-duration-deliberate` 520 ms — hero reveal, command palette, planet stack open
- `--alg-duration-ambient-fast` 4000 ms — small ambient pulse (sidebar status dot breathe)
- `--alg-duration-ambient` 6000 ms — Aurora Orb respiration cycle
- `--alg-duration-ambient-slow` 8000 ms — Sunburst Orb pulse + rotation cycle

**Feedback rule:** toda ação do usuário visível em ≤16 ms. Optimistic UI everywhere. Skeletons / shimmers no lugar de spinners.

**Banido:** `ease-in-out` named (mushy), `linear` em hover (robótico), `cubic-bezier` spring em interações operacionais (cansa), animação ambient com easing direcional (vira robótica). Spring é reservado para "delight moments" raros — open de planet stack picker, hover do Aurora Orb.

**Reduced motion:** `prefers-reduced-motion: reduce` colapsa toda duração de interação para 1 ms. **Ambient motion vira opacity drift estático** (não desliga totalmente — a presença viva é parte da identidade — mas remove todo movimento direcional).

### 3.8 Ícones

Lucide ou Phosphor Light. Stroke 1.5 px (mínimo). Sem fill colorido. Cor herda de `currentColor` — operador sente o ícone como tinta, não como ilustração.

Stroke 1 px é proibido fora de telas de baixa densidade (perdeu definição em OLED 3x — bug v1 do Monograma da Manu registrado em FOLLOW-UPS).

---

## 4. Layout

`--alg-container-max: 1440px` para app shell. `--alg-sidebar-width: 260px` (expanded) / `64px` (collapsed). `--alg-drawer-width: 420px`. Z-index nomeado por camada (`base`, `raised`, `sticky`, `dropdown`, `overlay`, `modal`, `toast`, `tooltip`) — escala rasa, intencional.

**Breakpoints de teste:** 375 (mobile), 768 (tablet), 1280 (desktop), 1920 (large desktop).

---

## 5. Component library (`.alg-*`) — interações operacionais

Classes CSS em `engines/algorythmo/app/assets/stylesheets/_components.scss`. Componentes Vue consomem via `class="alg-card alg-card--interactive"`.

Os cinco componentes **identitários** ficam em §6 (categoria própria — eles carregam a alma da plataforma). Aqui ficam os componentes operacionais — botões, inputs, cards, modais — necessários e silenciosos.

### 5.1 `.alg-btn`

Botão de ação. Touch target ≥36 px (md) ou 44 px (lg). Focus ring visível. Press feedback ≤16 ms via `transform: translateY(0.5px) scale(0.99)`.

**Variants:** `alg-btn--primary` (brand fill + inset highlight + elevation-1), `alg-btn--secondary` (tint-med + hairline border), `alg-btn--ghost` (transparent → tint-low on hover), `alg-btn--danger` (danger fill + inset highlight), `alg-btn--icon`.

**Sizes:** `alg-btn--sm` 28 px, default 36 px, `alg-btn--lg` 44 px.

### 5.2 `.alg-input`

Input textual com background tint-low (não bg-raised) — o input "afunda" no canvas em vez de flutuar. Focus ring brand subtle (3 px). Erro via `[aria-invalid='true']`.

### 5.3 `.alg-card`

Container raised. Default = `bg-raised` + hairline border + `elevation-1`. Variants:

- `alg-card--interactive` — hover sobe para `elevation-2`, hairline strong, press feedback
- `alg-card--raised` — idle em `elevation-2`
- `alg-card--glass` — glass-soft + grain + hairline glass-border + elevation-2

### 5.4 `.alg-chip`

Marcador compacto pill-shaped. Glyph + texto. Variants info/success/warning/danger/brand + LeadAgingChip (dual-coded — §8).

Distinguir do **Inline Semantic Atom** (§6.4): chip é badge de status; atom é elemento de prose editorial dentro de prompt builder.

### 5.5 `.alg-modal` (+ overlay)

Overlay com glass-hard (blur 60 px, sat 220%, grain) — empurra o canvas para soft focus. Modal com `elevation-4` + inset highlight (via `::before` pseudo). Título em `--alg-text-xl` (24 px — v1 estava 18 px, fix do FOLLOW-UPS). Enter animation: `translateY(12px) scale(0.96) → 0` em 340 ms cinematic.

### 5.6 `.alg-drawer`

Painel lateral 420 px (full-screen <768 px). Scrim com glass-medium (blur 40 px). Slide-in cinematic 340 ms. Focus trap implementado em `AlgDrawer.vue` (`aria-modal='true'` + trap from FOLLOW-UPS) + Esc + click-outside.

### 5.7 `.alg-menu`

Dropdown / context menu sobre glass-soft + grain. Hairline glass-border + inset highlight + elevation-3. Itens com `border-radius: sm`, `width: 100%` com `padding` lateral (fix do FOLLOW-UPS — não usar `calc(100% - X)` + margin), hover em `bg-tint-high`.

### 5.8 `.alg-toast`

Notificação transitória. Surface em glass-medium + grain. Empilha em coluna bottom-right. Auto-dismiss success/info 4 s, error persiste até user fechar. Inclui `role='status'` e `aria-live='polite'` (fix do FOLLOW-UPS).

### 5.9 `.alg-avatar`

Foto / iniciais com fallback determinístico. Sizes sm (24) / md (32) / lg (48). Variants `--ring` brand, `--ring-success` online.

**Distinção crítica:** `.alg-avatar` é para usuários humanos. Para **agentes** o avatar é `.alg-planet-avatar` (§6.3) — sistema separado, cromia rica autorizada.

### 5.10 `.alg-skeleton`

Shimmer 1.6 s curva cinematic. Reduced-motion → opacity pulse 2 s. Altura mínima ajustada por variant para refletir conteúdo real (fix do FOLLOW-UPS — `.alg-skeleton--card` 6.5 rem estava errado pra cards KPI).

### 5.11 `.alg-sector*` (sector dashboard — preservado da v1)

Família de classes que renderiza o sector dashboard (Marketing, Comercial, Operação, RH, Compras, Financeiro, Administração). Layout magazine, não grid uniforme. Densidade `operational` com região de KPI anchor subindo gap a 32 px (regra de subida de §3.3).

- `.alg-sector` — container vertical, padding 48 px desktop / 24 px mobile, gap 32 px
- `.alg-sector__watermark` — mono uppercase, 10 px, tracking widest, opacity 0.28 — sinal "DEMO" sem competir com conteúdo
- `.alg-sector__header` — display family, peso light (300), tracking tightest, line-height 1.05
- `.alg-sector__anchors` — grid 2-up com hairline divider (1 px `--alg-border`). KPI anchor: valor em display 32 px peso medium, label em mono uppercase 10-11 px tracking widest
- `.alg-sector__secondaries` — strip 4-up colapsa para 2-up <1024 px, 1-up <480 px
- `.alg-sector__chart` — surface em glass-soft + grain + hairline + elevation-1

### 5.12 `.alg-agent*` (sector agent panel — preservado)

Sticky 360 px right rail flutuando em glass-soft + grain. Avatar = `.alg-planet-avatar` (§6.3) — agente identificado pelo planeta. Bubbles com hairline border (agente) ou bg-tint-med (user). Input em bg-tint-low, hint em mono 10 px tracking wide. Status dot do agente usa cor brand ou success conforme estado (fix do FOLLOW-UPS — fg-quaternary em 6 px era ilegível).

### 5.13 `.alg-sidebar*` (refundada na v2)

Sidebar lateral fixa, 260 px expanded / 64 px collapsed. Estrutura de cima pra baixo:

1. **Workspace switcher** — quadrado glass (radius `md`, 40 px) com logo cliente (quando configurada) ou monograma da workspace. Texto "Nome / Organização" em duas linhas a partir de 220 px. Chevron pra abrir picker de workspaces.
2. **Seções nomeadas** — cada seção tem um micro-header em mono uppercase 10 px tracking widest opacity 0.48 ("Agentes", "Fontes", "Conhecimento", "Management"). Não é "tudo solto numa lista".
3. **Item de navegação** — altura 36 px, padding lateral 12 px, gap 12 px ícone-texto. Idle: tint-low ou transparente. Hover: tint-med. **Ativo: pill inversa — fill branco sólido com texto preto (`--alg-fg-inverse` em `--alg-bg-inverse`).** Essa inversão é o tell premium da Ref 1 — não trocar por "borda esquerda colorida".
4. **Sub-item colapsável** — chevron rotaciona 90° na expansão, sub-itens indent 12 px, animação 240 ms cinematic. Container do grupo tem altura `auto` ou `0` controlada por classe — **bug "último item vaza" da v1 corrigido garantindo `overflow: hidden` no container colapsado**.
5. **Grupo agentes** — exceção visual: cada item tem um `.alg-planet-avatar` size sm (24 px) à esquerda em vez do ícone Lucide. É o único lugar da sidebar onde cromia rica aparece (planetas).
6. **Footer perfil** — avatar humano (`.alg-avatar` size sm), nome + cargo em duas linhas, status dot legível (cor brand idle, success online, warning away).

Animação collapse (260 → 64 px): 340 ms cinematic com fade dos labels e dos micro-headers. Ícones permanecem ancorados a 24 px do centro do collapsed bar.

### 5.14 `.alg-list` — lista operacional densa (validada pela Ref 3)

Padrão de lista para registros operacionais (simulações, conversas, runs, audit log). Linha de 56 px com 3 colunas implícitas:

- Esquerda: glyph de status (check verde / warning âmbar / cross vermelho) em 16 px stroke 1.5
- Centro: título em fg-primary medium + meta em mono `fg-tertiary 11 px` com separador `·`. Ex: "Closer · E-commerce · 8 mensagens"
- Direita: badge de estado em cor semântica atenuada — "Sucesso" em success-fg-attenuated

Sem zebra striping. Sem bordas entre linhas. Apenas hairline `--alg-border` opcional separando blocos de meta (cabeçalho "SIMULAÇÕES — LOTE 14B" da lista). Densidade `operational`.

---

## 6. Componentes identitários — os cinco sagrados

Esses cinco são a alma da plataforma. **São auditados por aparição.** Cada um tem seu lugar, seu protocolo, e nenhuma exceção. Se você for pôr cor saturada em chrome, é porque você cedeu — refaz.

### 6.1 Sunburst Orb

**O que é.** Constelação radial de pontos brancos formando um sol pontilhado. Centro denso (pontos pequenos próximos), radiações de pontos crescentes pra fora, envelope circular suave. Monocromático puro — branco em opacity gradient (0.95 centro → 0.20 borda).

**Onde aparece.**

- Login screen (centro do canvas, sobre hero photography)
- Agent Studio empty state ("Bem vindo ao Agent Studio")
- Onboarding splash inicial
- 404 / 500 / "ainda não há dados aqui" identitários

**Onde NÃO aparece.** Em dashboard, em página operacional, em modal, em sidebar. Nunca como decoração.

**Anatomia.** 12 a 16 raios primários radiando do centro, cada raio composto por 8-12 pontos de tamanho decrescente. Raios secundários (offset 15°) com pontos menores. Total ~180-220 pontos. Inteiro renderizado em SVG.

**Animação ambiente.** Cycle 8 s. Dois loops sobrepostos:

1. **Radial breathe** — escala 1.00 → 1.04 → 1.00, easing ambient (sinusoidal). Toda a constelação respira como um peito.
2. **Opacity drift por raio** — cada raio tem opacity offset desfasado (delay 0.05-0.6 s entre raios). Loop 0.85 → 1.00 → 0.85 com easing ambient. Cria sensação de "viva" sem girar.
3. **Slow rotation CCW** — opcional, 0.5°/s no envelope geral. Quase imperceptível, é o que faz a tela respirar sem chamar atenção.

`prefers-reduced-motion`: para a rotation, mantém breathe muito sutil (escala 1.00 → 1.01).

**Princípio de sacralidade.** Não combina com Aurora Orb numa mesma tela. Não recebe cor. Não recebe motion direcional rápido. Não vira loading state.

### 6.2 Aurora Orb + Conduits

**O que é.** Esfera cromática viva, magenta → rosa → violeta (Aurora Gradient §3.1), com **conduits** (raios finos de luz) conectando-a a até 6 superfícies de dado ao redor. É o objeto vivo central da inteligência da plataforma.

**Onde aparece.**

- Knowledge / Brain hub (a tela de Ref 2)
- Possível: hero do dashboard de Algorythmo Brain
- Hero da landing page de marketing (1 instância no site público)

**Onde NÃO aparece.** Em mais de um lugar simultaneamente no app. Em página de setor. Em modal. Em sidebar. Em qualquer tela sem semântica de inteligência.

**Anatomia.** Esfera de 120-220 px com `--alg-aurora-grad` (radial offset 35% 30% — luz vem de cima-esquerda). Halo externo de 1.5× o diâmetro em magenta-blur baixa opacidade (efeito glow). Conduits são linhas de 1-2 px stroke com gradient `--alg-aurora-conduit` (fade transparent → magenta → transparent) ligando o centro do orb à borda interna do glass card associado. Ângulos dos conduits seguem disposição radial.

**Animação ambiente.** Cycle 6 s, dois loops:

1. **Chroma drift** — `background-position` do radial gradient anima 0% → 6% → 0% no eixo X, dando sensação de líquido vivo. Easing ambient.
2. **Conduit glow ramp** — opacity dos conduits 0.45 → 0.85 → 0.45, cada conduit desfasado (delay escalonado 0.4 s). Quando conduit "acende", o card-alvo recebe um inset highlight extra de 200 ms (feedback recíproco).
3. **Halo pulse** — escala 1.00 → 1.06 → 1.00, easing ambient. Subliminar.

**Estado de carregamento ativo.** Quando o sistema está processando (query, ingestion), os conduits aceleram pra 3 s cycle e o chroma drift sobe pra 12%. Sutil mas visível.

`prefers-reduced-motion`: chroma drift para, conduits ficam estáticos em opacity 0.65, halo para. Orb continua presente, viva pela cor.

**Princípio de sacralidade.** **É o único objeto na plataforma onde o Aurora Gradient existe além dos Planet Avatars.** Aparição máxima: uma instância por sessão de usuário. Se aparecer em dois lugares simultaneamente, é erro.

### 6.3 Planet Avatars

**O que é.** Sistema de avatares dos agentes. Cada agente da plataforma (Manu, Cortex, agentes customizados do cliente) é representado por um **planeta cromático único** — gás gigante laranja, planeta azul-verde com atmosfera, Saturn-like com anel, planet vermelho-marciano, gigante orgânico violeta. Cada planeta é único, vivo, com sua personalidade cromática.

**Onde aparece.**

- Sidebar (grupo "Agentes")
- Header de painel de conversa do agente (`.alg-agent`)
- Picker de agentes (cascade stack — Ref 4)
- Em qualquer lugar que precise identificar "qual agente"

**Onde NÃO aparece.** Como avatar de usuário humano. Como ilustração de hero. Como ícone de seção.

**Anatomia técnica.** Library curada de 12-16 planetas, cada um em 3 sizes (sm 24 / md 32 / lg 48 — todos circulares). Cada planeta é um SVG vivo:

- Base esférica com radial gradient cromático único (paleta dentro da banda Aurora — magenta, rosa, violeta, âmbar, verde-petróleo, azul-noite — escolhida durante curadoria, não gerada aleatoriamente)
- Texture overlay (bandas atmosféricas, manchas, anel opcional) em SVG noise filtrado
- Inset highlight superior (luz de cima — coerente com sistema de elevação)
- Halo externo low-opacity em pace com base

A escolha de qual planeta vai pra qual agente é **determinística por hash do nome do agente** (`fnv1a(agent_name) % planet_library.length`), garantindo consistência cross-session.

**Animação ambiente.** Cycle 6 s. Slow rotation CW de 0.2°/s na texture overlay (planeta gira). Halo pulse 0.95 → 1.00 → 0.95 em opacity. Reduced-motion: rotation para, halo fixa em 0.85.

**Cascade stack picker.** Quando user abre o picker de agentes, os planetas se empilham com offset vertical de 40 px e leve rotation entre cards (-1° / +1° alternado), criando sensação de "cartas premium" da Ref 4. Open em 520 ms deliberate com spring `--alg-ease-spring` (raríssima exceção autorizada).

**Princípio de sacralidade.** A library de planetas é finita e curada. **Não gerar planetas via Stable Diffusion / 3D**. Não é AI slop. Cada planeta é uma identidade visual artesanal. Quando esgotar a library, designer humano cura novos.

### 6.4 Inline Semantic Atoms

**O que é.** Chips inline dentro de prose editorial — o padrão de prompt/checkpoint editor da Ref 3. Quando o operador escreve um prompt de agente ou edita um checkpoint, ele escreve **prosa que contém átomos semânticos clicáveis** representando ações, variáveis, condicionais, comandos.

**Onde aparece.**

- Prompt editor (Agent Studio)
- Checkpoint editor (workflow builder)
- Qualquer prose-with-actions futuro

**Onde NÃO aparece.** Em chrome (sidebar, header, dashboard). Em cards de status. Substituindo `.alg-chip` (são coisas distintas).

**Anatomia.** Cada atom é um span inline com radius `sm`, padding 2 px 8 px, altura ≈ line-height da prose, glyph 12 px à esquerda + texto em mono ou sans 13 px. Família de variantes:

| Variante | Aparência | Uso |
|---|---|---|
| `atom--variable` | Mono 11 px, bg tint-low, hairline border, radius sm | Tokens `{lead_name}`, `{stage}` |
| `atom--memory` | Bg gradient rosa pastel low-saturation (alpha do Aurora — não o gradient full), glyph spark, fg branco | "Carregue Memória do Lead" |
| `atom--criteria` | Bg gradient violeta pastel low-saturation, glyph spark, fg branco | "Carregue Critérios de Qualificação" |
| `atom--action` | Bg amber semi (oklch 0.40 0.10 75 / 0.35), glyph plus circle, fg primary | "Criar ou Atualizar Contato" |
| `atom--eval` | Bg info-blue atenuado (oklch 0.40 0.10 235 / 0.30), glyph activity, fg primary | "Cortex · Avaliar Conversão" |
| `atom--condition` | Bg preto sólido (alg-black-5), texto mono | "Se" |
| `atom--agent` | Glyph = mini planet avatar 16 px, bg tint-med, texto medium | Referenciar agente: "Cortex · ..." |

**Nota crítica sobre cor.** Os atoms `--memory` e `--criteria` são a única exceção autorizada onde o Aurora Gradient aparece **em chrome operacional** — porque eles SÃO representação de identidade Aurora dentro de prose. Os outros atoms (action / eval / condition) usam paleta semantic atenuada, não Aurora.

Hover do atom: leve scale 1.02 + inset highlight refresh. Click: abre painel de configuração do atom (drawer ou inline popover) — 240 ms cinematic.

### 6.5 Hero Cinematography

**O que é.** Fotografia natural sublime usada como background de hero — montanha de gelo, paisagem ártica, pedra vulcânica, escala épica da natureza. Sempre **P&B granulada** via CSS filter (`grayscale(100%) contrast(1.05) brightness(0.4)`), sempre em opacity baixa (0.45-0.65) sob um glass canvas frame.

**Onde aparece.**

- Login screen
- Agent Studio empty / hero (Ref 1 e Ref 2)
- Onboarding chapter intros
- Marketing pages hero
- Empty state identitário do Knowledge hub

**Onde NÃO aparece.** Em qualquer página operacional, dashboard de KPI, modal, sidebar, list view, kanban. **Hero photography é hero — não decoração.**

**Anatomia.** Imagem natural premium (curadoria humana — Iceland, Patagonia, basalt formations, ocean swell). Resolução mínima 2880 × 1620 (2x retina). Filtro CSS:

```scss
.alg-hero-photo {
  filter: grayscale(100%) contrast(1.05) brightness(0.4);
  opacity: 0.55;
}
```

Sobre a foto, sempre um **canvas frame** de glass com radius `2xl` (24 px) — a foto sangra fora do canvas, mas o conteúdo da hero (orb + título + CTA) vive dentro do glass frame. Isso é o que cria o efeito "estamos dentro de uma cabine olhando pra fora" da Ref 1 e Ref 2.

**No White Model.** A foto não vai pra P&B atenuada — vai pra **highkey claro** (`filter: grayscale(80%) brightness(1.2) contrast(0.95)`, opacity 0.55) — a Ref 4 validou esse caminho.

**Princípio de sacralidade.** **Não usar stock fotos genéricas.** Curadoria humana obrigatória. Sem pessoas. Sem cidade. Sem produto. Sem "AI imagery". É natureza épica, escala, silêncio, escuridão — geografia que reflete a tese da sala de comando.

### 6.6 Aurora Border

**O que é.** Um frame hairline em Aurora Gradient com **um único arco brilhante** que deriva devagar pela borda — um cometa, nunca um anel arco-íris, nunca um spinner de loading. Componente `AlgAuroraBorder`. Marca uma superfície como **lugar onde a inteligência viva fala ou ingere**.

**Onde aparece (lista fechada).**

- Hero do agente de setor — onde a inteligência **fala** (§F-B).
- Dropzone "Anexar documentos da empresa" do Brain hub — onde a inteligência **ingere** (§F-D).
- Distribuição premium (P-4) pode estendê-la a **outras superfícies-assinatura** equivalentes — nunca a chrome operacional.

**Onde NÃO aparece.** KPI cards, list views, painéis genéricos, sidebar, modais utilitários, cards de kanban. Aurora Border em chrome operacional é a **mesma reprovação** do orb fora de lugar.

**Execução (anti-slop — a esfera reprovada da rodada 2 é o aviso permanente).** Espessura hairline (`1px`, `1.5px` no máximo em hero). Opacidade contida (`0.5` subtle / `0.82` normal). UM arco, não um anel cheio. Drift lento (`--alg-duration-ambient-slow` 8 s; `--alg-duration-ambient` 6 s no estado `active`). Glow externo opcional e baixo (`--alg-aurora-glow`). `prefers-reduced-motion` congela o arco — a borda fica presente, viva pela cor, sem movimento direcional.

**Princípio de sacralidade.** A Aurora Border é **identidade de superfície, não ornamento**. Escassa e nomeada como o orb. Se ela "decora" uma superfície que não é onde a inteligência fala ou ingere, é hierarquia errada — reprovação.

---

## 7. CRM Kanban — pattern operacional documentado (novo na v2)

A Ref CRM valida a estrutura kanban da plataforma. **Adotamos a estrutura, rejeitamos a cromia saturada.** Cor de coluna no Cinematic OS é **status semântico atenuado**, nunca decoração saturada. Densidade `operational`.

### 7.1 Coluna

- Largura 280 px desktop, 1 coluna por tela mobile (carousel horizontal scroll-snap)
- Header sticky topo:
  - Nome do estágio em sans 14 px medium fg-primary (ex: "Novo Lead", "Qualificado", "Proposta Enviada", "Negociação")
  - Counter pill com número em mono 11 px medium — bg tint-med, fg tertiary
  - Ações `gear` + `plus` em ghost button 28 px à direita
- **Cor do header** — barra de 2 px no topo da coluna em **cor de status atenuada** (oklch L≈0.50, C≤0.12):
  - Novo Lead → `info` atenuado (azul cinematic)
  - Qualificado → `warning` atenuado (âmbar quieto)
  - Proposta Enviada → `accent-violet` atenuado (violeta — único uso de violeta fora dos Identitários, autorizado porque é semântico de estágio)
  - Negociação → `danger`-adjacent atenuado (laranja-marrom)
- Background da coluna: `--alg-bg` (canvas, não raised) — coluna não é "card grande", é zona de canvas
- Hairline vertical 1 px `--alg-border` entre colunas

### 7.2 Card

- Container: `bg-raised` + hairline border + `elevation-1` + radius `lg` (16 px)
- Padding 16 px
- Hover: sobe pra `elevation-2`, hairline strong, scale 1.005 (240 ms cinematic)
- Conteúdo, top-to-bottom:
  - **Nome** em sans 14 px medium fg-primary
  - **Chip canal** em `.alg-chip--channel` — pill com glyph do canal (whatsapp / email / instagram / tiktok) + texto em mono 11 px. Cor do glyph = **cor da marca do canal** (WhatsApp `#25D366`, Instagram `#E1306C`, TikTok branco-no-dark, e-mail neutro) — **exceção R3 sancionada** ao monocromático, restrita a ESTE pill (sinaliza o canal de origem do lead num relance). O resto do card permanece contido, sem saturação.
  - **Avatar humano** (`.alg-avatar` sm) flutuante no canto superior direito do card
  - **LeadAgingChip** (§8) no rodapé esquerdo
  - **Chip de data** (`.alg-chip--date`) com glyph relógio e texto "Amanhã" ou "26 de jan." mono 11 px no rodapé direito
- Gap entre cards: 12 px

### 7.3 Drag preview e drop zone

- Drag preview: card original fica em opacity 0.4 (placeholder), preview flutuante em `glass-medium + grain + elevation-4` com `scale(1.02)` e leve rotation -1°. Cursor `grabbing`.
- Drop zone ativa: hairline 2 px `--alg-border-strong` pulsante (1.8 s ambient) na borda da coluna alvo + bg-tint-low na coluna inteira
- Drop confirmation: card "snap" no destino com bounce sutil (`--alg-ease-spring`, 240 ms — exceção spring autorizada em drop only)

### 7.4 Acessibilidade

- Kanban inteiro em `<section aria-label="Pipeline de Vendas — kanban">`
- Cada coluna em `<div role="list" aria-label="Coluna {nome do estágio}, {N} leads">`
- Card em `<article role="listitem" tabindex="0" aria-label="{nome do lead}, canal {canal}, estágio {estágio}, {leadAgingText}, previsto pra {data}">`
- Drag and drop com fallback keyboard (Space pra pegar, ↑↓ pra navegar entre colunas, Enter pra soltar, Esc pra cancelar)

---

## 8. White model — variante editorial opt-in

Cinematic OS dark é o default. **White model** é a tradução do mesmo DNA para superfície clara — não "light theme" SaaS (branco + pastel azul).

Validado visualmente pela Ref 4 (cascade picker de planetas sobre montanha highkey).

Ativar com `<html data-theme='white'>` (ou no subtree).

**Decisões trancadas:**

- Canvas em paper warm (~`#FBFAF8`), não pure white — evita aspereza retinal
- Tinta em **4 níveis de opacity** (1.00 / 0.72 / 0.48 / 0.32) — espelha o dark
- Borders em warm gray hairlines (rgba ink 8% / 14% / 20%)
- Sombras em true black low-opacity (paper aceita black puro; não precisa de chroma trickery)
- Glass milk-white com blur menor (16 / 28 / 40 px) + grain mantido — paper não tolera blur pesado (vira "greasy fingerprint")
- Brand teal escurece para autoridade + AA contrast em paper (`oklch(0.520 ...)`)
- Inset highlight em branco 60-90% (paper é reflexivo, light bounces back off the top edge)
- **Hero photography vira highkey** (grayscale 80% + brightness 1.2 + contrast 0.95)
- **Aurora Gradient e Planet Avatars permanecem** — eles são identidade, não chrome; mantêm cromia rica sobre paper

**Quando usar:** marketing pages, white-paper / PDF / share views, ambientes de luz forte. Default permanece dark.

**Status do toggle.** Tokens prontos, variant testada visualmente. Toggle público fica como **issue separada** (não bloqueia v2 — fora do escopo deste lock criativo).

> `[data-theme='light']` v0 fica preservado como alias — converge com `[data-theme='white']`, mas mantém compat com qualquer consumer já wired. Marcado para deprecação em §10.

---

## 9. LeadAgingChip — preservado (D10 + D11)

Dual-coding (cor + glyph + texto numérico + aria-label) é não-negociável — 8% dos homens têm alguma forma de daltonismo.

| State | Glyph | Token cor | Background |
|---|---|---|---|
| Em dia | ● | `--alg-aging-green` | `--alg-aging-green-bg` |
| Atenção | ◐ | `--alg-aging-yellow` | `--alg-aging-yellow-bg` |
| Atrasado | ○ | `--alg-aging-red` | `--alg-aging-red-bg` |
| Neutro | — | `--alg-aging-neutral` | `--alg-aging-neutral-bg` |

Coeficiente por etapa (D10) preservado: `Stage.aging_coefficient` multiplica bandas base (12 h verde → amarelo, 24 h amarelo → vermelho na etapa Novo). Configurável em `PipelineConfig.vue`.

Guarda explícita em `LeadAgingChip.vue` antes de qualquer cálculo:
```js
if (agingCoefficient === 0 || agingCoefficient == null) {
  return { state: 'neutral', glyph: '—' };
}
```

---

## 10. Acessibilidade

### 10.1 Contraste (verificado contra `--alg-bg` = `--alg-black-2`)

| Layer | Ratio (dark) | Verdict |
|---|---|---|
| fg-primary (1.00 branco) | 18.2:1 | AAA |
| fg-secondary (0.72) | 12.9:1 | AAA |
| fg-tertiary (0.48) | 8.4:1 | AAA |
| fg-quaternary (0.28) | 4.7:1 | AA (uso restrito a meta/decorativo) |
| brand-primary | 7.1:1 | AAA |

LeadAgingChip contra `--alg-bg-raised`:

| State | Ratio (dark) | Verdict |
|---|---|---|
| green | 9.4:1 | AAA |
| yellow | 11.2:1 | AAA |
| red | 7.6:1 | AAA |

Aurora Orb e Planet Avatars: como objetos identitários ambientes (sem texto sobre eles), o gate é **non-text contrast 3:1** sobre o canvas — verificado.

White model preservado com mesmos mínimos (4.5:1 texto sobre superfície).

### 10.2 Focus ring

2 px brand ring + 2 px gap em canvas color — sempre visível, sobrevive a glass.

### 10.3 Keyboard

Tab navigation completa, Esc fecha drawer/modal/dropdown, Enter ativa cards, ↑↓ navega menus, Space pega card kanban (§7.4), Cmd+K abre command palette (componente futuro).

### 10.4 Reduced motion

Todos tokens de duration de interação colapsam para 1 ms via `@media (prefers-reduced-motion: reduce)`. **Ambient motion vira drift estático** — Sunburst trava em frame médio, Aurora chroma drift para mas cores permanecem, Planet rotation para. Skeleton shimmer troca para opacity-pulse 2 s.

### 10.5 Touch target

Mobile mínimo 44 × 44 px (Apple HIG, WCAG 2.5.5 AAA).

### 10.6 Screen reader

`aria-live` em regiões dinâmicas (Kanban, toasts), `aria-label` completo em cards (nome + canal + estado + tempo), `aria-busy` em regiões com skeleton, `aria-modal='true'` em drawers/modais (fix do FOLLOW-UPS).

### 10.7 Gate de CI

`@axe-core/playwright` reprova PR com violações `critical`/`serious` WCAG AA.

---

## 11. Integração com o engine

### 11.1 Estrutura

```
engines/algorythmo/app/assets/
├── stylesheets/
│   ├── _tokens.scss        ← tokens (custom properties) — Cinematic OS v2
│   ├── _components.scss    ← classes .alg-* — Cinematic OS v2
│   └── algorythmo.scss     ← entry point
└── images/                 ← brand assets + planet library + hero photo curation
```

A library de planetas vive em `images/planets/` (SVGs, um por planeta). Hero photography vive em `images/hero/` (.webp/.avif otimizados, sempre com `<picture>` source set).

### 11.2 Como consumir

Já integrado em `_woot.scss` do dashboard Chatwoot:

```scss
// algorythmo: design-system-import
@import '../../../../../engines/algorythmo/app/assets/stylesheets/algorythmo';
```

Classes `.alg-*` e tokens `--alg-*` ficam globais. Vue components consomem via class binding — sem `<style scoped>` reescrevendo o sistema.

### 11.3 Bridge SCSS

`app/javascript/dashboard/assets/scss/algorythmo-bridge.scss` provê mixins SCSS-level (breakpoint queries). Use só quando precisar de construto SCSS (`@use 'algorythmo-bridge' as alg;`).

### 11.4 Deprecações em curso

- `--alg-radius-xl` (v0 alias de `lg`, 16 px) — remover em passada de limpeza
- `[data-theme='light']` (v0 fallback) — converge com `[data-theme='white']`; remover quando confirmado que nenhum consumer downstream referencia
- `--alg-weight-bold: 600` — v0 compat; novo código não deve alcançar

---

## 12. Reversão / governança da v2

**Cinematic OS v2 é forward-only.** Não há runtime toggle ou cut-flag para o visual register — a decisão é do founder em 2026-05-28.

Cut-flag de rota (`algorythmo_cut_*`) é independente — esconde a tela inteira, não troca o visual. Esse padrão continua válido conforme convenção em `algorythmoCutFlags.js` (cut-flag OFF = feature LIGADA por padrão).

Mudanças subsequentes ao design system são por PR aprovado pelo founder. Nenhum agente implementa "v2.1" sem aprovação visual prévia do documento.

---

## 13. Auditoria — identidade Chatwoot a expurgar

Princípio do sistema: **nada da identidade Chatwoot deve ser sentido no produto final**. Esta seção é o checklist permanente — qualquer PR de produto que toque chrome deve auditar:

- **Azul Chatwoot `#1F93FF`** — qualquer aparição em chrome é bug. Brand é cyan-teal (`--alg-color-brand-primary`); Aurora Gradient é magenta-rosa-violeta. Azul Chatwoot original não existe.
- **Tipografia Lato / Open Sans** — qualquer texto renderizando nessas famílias é bug de fallback. Inter / Geist / Geist Mono são as únicas.
- **Logos Chatwoot remanescentes** — favicon, splash, email templates, share preview, PDF export — todos com identidade Algorythmo.
- **Ícones com fill colorido** — Chatwoot upstream usa alguns Phosphor / Lucide com fill. Em chrome Algorythmo, só stroke 1.5.
- **Emoji em chrome** — Chatwoot usa emoji em vários micro-affordances (✅ ⚠️ 🔔). Substituir por glyph Lucide ou ícone semântico.
- **Cores de "label" Chatwoot saturadas** — sistemas de etiqueta com hue puros vivos (rosa pink, verde lime, amarelo canário). Substituir por sistema semantic atenuado.
- **Bordas grossas em modais e toolbars** — upstream usa `2px solid #...` em alguns lugares. Hairline 1 px é a regra.
- **Spinners circulares** — qualquer `.spinner` ou `.loading-spinner` upstream deve virar skeleton `.alg-skeleton` ou shimmer.

**Cadência.** A cada PR que toca uma view de produto, esta seção é re-revisada. Findings entram no design review como issues bloqueantes (P0) ou polish (P2) conforme severidade visual.

---

## 14. Princípios de decisão rápida

1. **Silêncio > ruído.** Espaço entre elementos é o produto. Na dúvida, remove.
2. **Tipografia carrega hierarquia.** Não use border / background pra hierarquizar; use peso, tracking, opacidade.
3. **Cor é exceção semântica.** Se você ia colorir "pra ficar bonito", é hierarquia errada.
4. **Cromia rica é identidade, não ornamento.** Aurora Gradient só nos dois lugares (§3.1).
5. **Motion Apple-grade ou nada.** Curva cinematic. Spring é raríssimo.
6. **Ambient motion respira, não anda.** Loops em curva sinusoidal. Easing direcional perceptível = robótico.
7. **Glass é real ou não é glass.** `backdrop-filter` obrigatório, hairline border obrigatória, inset highlight obrigatório, **grain obrigatório**.
8. **Estados são designados.** Empty / loading / error têm a mesma atenção que happy path.
9. **Acessível desde o dia 1.** Retrofit é caro.
10. **Mobile-first.** 375 px primeiro, depois expande.
11. **Editorial > spec sheet.** Copy é design — "Os Leads vão aparecer aqui automaticamente conforme conversas entram" > "Nenhum lead encontrado".
12. **Identidade Chatwoot é bug.** §13 sempre.
13. **Se parece template, refaz.** Apple / Linear / Vercel / Arc não usariam? Refaz.

---

## 15. Open questions e próximos

- **Self-host de fontes.** Geist / Geist Mono / Söhne — handoff pro brand designer humano. TODO marcado em `_tokens.scss`. Fallback escalonado funciona até lá.
- **Library de planetas — curadoria.** Designer humano entrega 12-16 SVGs únicos (cada planeta com paleta + texture + halo definidos). Bloqueia full deploy de Planet Avatars em produção; placeholder programático segura interim.
- **Hero photography — curadoria.** Brand designer entrega set de 6-10 fotos (Iceland, Patagonia, Atacama, basalt, ocean swell) em 2x retina otimizado. Bloqueia full deploy de Hero Cinematography; placeholder segura interim.
- **Aurora Orb SVG + animation.** Componente Vue `AlgAuroraOrb.vue` pendente de implementação em PR seguinte (PR 3 da rodada).
- **Sunburst Orb SVG + animation.** Componente Vue `AlgSunburstOrb.vue` pendente em PR seguinte.
- **White model toggle.** Issue separada — não bloqueia v2.
- **Command palette `cmd+K`.** Componente `.alg-command-palette` planejado; specifica em v2.x.
- **Componentes operacionais ainda ausentes.** `.alg-tooltip`, `.alg-tabs`, `.alg-select`, `.alg-checkbox`, `.alg-radio`, `.alg-switch` — adicionar em §5 conforme implementados.
- **Audit pass de identidade Chatwoot.** Sweep completo (§13) antes do GA — issue separada listando cada arquivo upstream a reescrever.

---

*Fim do documento. Mantenha vivo. Toda feature nova: leia esta filosofia, então construa.*
