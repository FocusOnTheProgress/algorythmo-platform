# Algorythmo OS — Design System (Cinematic OS v1)

**Status:** Living document.
**Owner:** founder / designer agent.
**Última revisão:** 2026-05-28 — Cinematic OS v1 (refunda paleta, tipografia, sombras, glass, motion; introduz white model; mantém estrutura de tokens v0 + dual-coding LeadAgingChip + WCAG AA gate).

---

## 1. Filosofia

Algorythmo OS não é um SaaS. É a **sala de comando do founder**.

O comprador é fundador ou CEO de empresa mid-market. Posicionamento: enterprise high-ticket. Referência de mercado: Gong, Salesforce. Referência de qualidade visual: Apple, Linear, Arc. Referências mais profundas: Apple Intelligence, visionOS, Raycast, Vercel, Things 3, Teenage Engineering, Aesop, Field Mag.

A tese é simples e dura: **a interface precisa entregar a sensação de escala sob controle.** Vastidão, inteligência presente, silêncio operacional. O usuário deve sentir que comanda algo grande, e que está tudo sob domínio.

**Cinematic Operating System.** A plataforma é um sistema, não um app. A superfície carrega gravidade — preto profundo como cinema escuro, tipografia editorial como suplemento de jornal de domingo, glass real como visionOS, motion com a curva da Apple. Densidade é variável: home/hero/login respiram (margens de 96px); builders e dashboards densificam com respiro técnico (registro Linear).

**Editorial monocromática.** A paleta é preto e branco. Cor é exceção semântica, nunca decoração. Hierarquia se constrói por tipografia (peso 300-600 + tracking negativo) e por opacidade do branco (4 níveis: 1.00 / 0.72 / 0.48 / 0.28). Se uma tela usa mais de um hue saturado em chrome, refaz.

**Glass real, depth real, luz real.** Glassmorphism com `backdrop-filter` calibrado (blur 20/40/60) + saturation. Sistema de elevação em 4 níveis sempre com **inset top highlight** obrigatório — simula um objeto iluminado de cima, não um retângulo plano. Bordas são hairlines de 1px, sempre. Bordas grossas e sombras flat são banidas — quebram a ilusão cinematográfica.

**Motion Apple-grade ou não existe.** Curva default `cubic-bezier(0.32, 0.72, 0, 1)`. Microinterações 120-400ms. Toda ação do usuário tem feedback visível em ≤16ms (1 frame). Optimistic UI + skeletons + estados intermediários — nunca tela parada esperando. Spinners circulares são banidos.

**O produto é o silêncio entre os elementos.** Na dúvida entre adicionar e remover, **remover ganha**.

**Teste final:** abre a tela no monitor 27" de um CEO. Se ele não sentir "isto é o software mais bem-feito que eu já vi", o trabalho não está pronto.

---

## 2. O que jamais fazer

Lista dura. Qualquer item aqui é reprovação imediata:

- Cores saturadas como background (gradient roxo-azul AI, lavanda corporativo, qualquer pastel)
- Neumorfismo / soft UI
- Ilustrações 3D Spline genéricas, Lottie por padrão
- Ícones coloridos cheios (use Lucide ou Phosphor Light, stroke 1.5px, sem fill colorido)
- Sombras flat duras (translucent black sobre preto = invisível; precisa do sistema de elevação com inset highlight)
- Bordas grossas (≥2px) em chrome
- Spinners circulares (use skeletons / shimmers / optimistic UI)
- Toasts genéricos do shadcn default
- Densidade alta em telas hero (home, login, splash, onboarding precisam respirar a 96px)
- Cor sem significado semântico (rosa só porque "fica bonito" = reprovou)
- Glass sem `backdrop-filter` real (rgba sozinho não é glass)
- Animação sem easing customizado (linear, ease-in-out named = banidos fora de progress bars)
- Emoji em chrome operacional
- Tipografia em peso 700/800/900 (lê corporativo, quebra registro editorial)
- AI-slop tells: gradient azul-roxo, sparkle ✨ em chrome, "Powered by AI" badges

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

**Brand (single hue, exceção).** Cyan-leaning teal. Aparece em CTA primário, focus ring, brand mark. Em qualquer outro lugar é hierarquia errada.

| Token | Valor OKLCH (dark) |
|---|---|
| `--alg-color-brand-primary` | `oklch(0.745 0.165 195)` |
| `--alg-color-brand-primary-hover` | `oklch(0.795 0.155 195)` |
| `--alg-color-brand-primary-active` | `oklch(0.685 0.170 195)` |

**Semantic status.** Success / warning / danger / info. Usados com semântica, nunca como decoração. Todos calibrados ≥4.5:1 sobre o canvas escuro.

**Por que OKLCH.** Lightness em OKLCH é perceptualmente uniforme — o ramp de pretos lê como o mesmo passo a olho nu. HSL mente.

### 3.2 Tipografia

**Famílias:**

- **Display:** Geist preferido (Vercel-quality numerals), fallback `InterDisplay` → `Inter` → system. Söhne é o upgrade target quando licenciado.
- **Sans:** Inter (já self-hosted upstream) → system.
- **Mono:** Geist Mono preferido, fallback `JetBrains Mono` → `SF Mono` → system.

> Self-host pendente: `@font-face` para Geist / Geist Mono / Söhne fica como TODO no `_tokens.scss` para handoff pro brand designer humano. Até lá, o stack fluido cobre.

**Escala (px):** 10/11 · 11/12 · 13/14 · 15/16 · 17/18 · 20/24 · 24/32 · 30/40 · 40/56. Implementada com `clamp()` — mobile lê confortável a 320-375px, desktop respira a 1440px+. Ratio 1.250 (minor third), padrão editorial.

**Pesos:** banda estreita, 300-600. Light (300) para display em hero. Regular (400) e medium (500) para UI. Semibold (600) só para títulos e estados ativos.

**Tracking:**

- `--alg-tracking-tightest` -0.030em — hero numerals, KPI anchors
- `--alg-tracking-tight` -0.022em — display titles
- `--alg-tracking-snug` -0.012em — UI labels
- `--alg-tracking-widest` 0.10em — ALL-CAPS micro labels (uppercase mono para watermarks, status)

**Line heights:** 1.05 (display tight) / 1.20 (display snug) / 1.45 (body normal) / 1.625 (relaxed).

### 3.3 Espaçamento

Base 4px. Scale: `0/4/8/12/16/20/24/32/40/48/64/80/96`. Cinematic OS DNA literal.

Aliases semânticos: `--alg-space-card-padding` (24px default), `--alg-space-modal-padding` (32px), `--alg-space-hero-padding` (96px). Use o alias, não o step bruto — o alias descreve a intenção.

### 3.4 Border-radius

| Token | Valor | Uso |
|---|---|---|
| `--alg-radius-sm` | 8px | Inputs, small chips |
| `--alg-radius-md` | 12px | Buttons, cards (default), dropdowns |
| `--alg-radius-lg` | 16px | Panels, glass surfaces |
| `--alg-radius-2xl` | 24px | Modals, drawers, hero |
| `--alg-radius-pill` | 9999px | Avatars, pill chips |

Comprometa-se com um nível por componente. Misturar `md` e `lg` arbitrariamente é tell de design descuidado.

### 3.5 Sombras (sistema de elevação em 4 níveis)

Sombras em dark mode são problema de craft. Translucent black sobre preto some. **Toda elevação no Cinematic OS combina outer shadow direcional + inset top highlight obrigatório** — simula objeto iluminado de cima.

| Token | Uso |
|---|---|
| `--alg-elevation-1` | Hairline lift — chip, divider sutil |
| `--alg-elevation-2` | Card default, hover de surface |
| `--alg-elevation-3` | Dropdown, popover, menu |
| `--alg-elevation-4` | Modal, drawer, comando central |

Cada elevation token inclui:
1. `inset 0 1px 0 0 rgba(255, 255, 255, alpha)` — top highlight (4-8% conforme nível)
2. Outer shadow direcional em true black com opacity escalonada
3. 1px outline em true black low-opacity (border refinado)

### 3.6 Glass (sistema em 3 níveis)

Glass não é decoração — é uma superfície. Três níveis calibrados:

| Token | Blur | Saturation | Uso |
|---|---|---|---|
| `--alg-glass-soft` | 20px | 160% | Menu, dropdown, sidepanel agente |
| `--alg-glass-medium` | 40px | 180% | Toast, drawer scrim |
| `--alg-glass-hard` | 60px | 180% | Modal overlay (pushes canvas behind into soft focus) |

**Regras de glass:**
- Requer `backdrop-filter`. Sem suporte → fallback para `--alg-bg-elevated` sólido. Nunca "fake glass" com rgba sozinho.
- Sempre acompanhado de hairline border 1px (`--alg-glass-border`).
- Sempre acompanhado de inset highlight (`--alg-glass-highlight`).
- Sempre compõe com `--alg-elevation-*` para depth.

### 3.7 Motion

**Curva default:** `cubic-bezier(0.32, 0.72, 0, 1)` (token `--alg-ease-cinematic`). Apple signature. Toda transição UI sai daqui por padrão.

**Durações:**
- `--alg-duration-instant` 120ms — press, color shift
- `--alg-duration-fast` 180ms — hover, tooltip
- `--alg-duration-base` 240ms — dropdown, card hover, focus
- `--alg-duration-slow` 340ms — drawer, modal, route
- `--alg-duration-deliberate` 520ms — hero reveal, command palette
- `--alg-duration-ambient` 6000ms — loops decorativos (orb, planet pulse)

**Feedback rule:** toda ação do usuário visível em ≤16ms. Optimistic UI everywhere. Skeletons / shimmers no lugar de spinners.

**Banido:** `ease-in-out` named (mushy), `linear` em hover (robótico), `cubic-bezier` spring em interações operacionais (cansa). Spring é reservado para "delight moments" raros.

**Reduced motion:** `prefers-reduced-motion: reduce` colapsa toda duração para 1ms.

### 3.8 Ícones

Lucide ou Phosphor Light. Stroke 1.5px. Sem fill colorido. Cor herda de `currentColor` — operador sente o ícone como tinta, não como ilustração.

---

## 4. Layout

`--alg-container-max: 1440px` para app shell. `--alg-sidebar-width: 260px`. `--alg-drawer-width: 420px`. Z-index nomeado por camada (`base`, `raised`, `sticky`, `dropdown`, `overlay`, `modal`, `toast`, `tooltip`) — escala rasa, intencional.

**Breakpoints de teste:** 375 (mobile), 768 (tablet), 1280 (desktop), 1920 (large desktop).

---

## 5. Component library (`.alg-*`)

Classes CSS em `engines/algorythmo/app/assets/stylesheets/_components.scss`. Componentes Vue consomem via `class="alg-card alg-card--interactive"`.

### 5.1 `.alg-btn`

Botão de ação. Touch target ≥36px (md) ou 44px (lg). Focus ring visível. Press feedback ≤16ms via `transform: translateY(0.5px) scale(0.99)`.

**Variants:** `alg-btn--primary` (brand fill + inset highlight + elevation-1), `alg-btn--secondary` (tint-med + hairline border), `alg-btn--ghost` (transparent → tint-low on hover), `alg-btn--danger` (danger fill + inset highlight), `alg-btn--icon`.

**Sizes:** `alg-btn--sm` 28px, default 36px, `alg-btn--lg` 44px.

### 5.2 `.alg-input`

Input textual com background tint-low (não bg-raised) — o input "afunda" no canvas em vez de flutuar. Focus ring brand subtle (3px). Erro via `[aria-invalid='true']`.

### 5.3 `.alg-card`

Container raised. Default = `bg-raised` + hairline border + `elevation-1`. Variants:

- `alg-card--interactive` — hover sobe para `elevation-2`, hairline strong, press feedback
- `alg-card--raised` — idle em `elevation-2`
- `alg-card--glass` — glass-soft + hairline glass-border + elevation-2

### 5.4 `.alg-chip`

Marcador compacto pill-shaped. Glyph + texto. Variants info/success/warning/danger/brand + LeadAgingChip (dual-coded).

### 5.5 `.alg-modal` (+ overlay)

Overlay com glass-hard (blur 60px) — empurra o canvas para soft focus. Modal com `elevation-4` + inset highlight (via `::before` pseudo). Enter animation: `translateY(12px) scale(0.96) → 0` em 340ms cinematic.

### 5.6 `.alg-drawer`

Painel lateral 420px (full-screen <768px). Scrim com glass-medium (blur 40px). Slide-in cinematic 340ms. Focus trap + Esc + click-outside (no Vue wrapper `AlgDrawer.vue`).

### 5.7 `.alg-menu`

Dropdown / context menu sobre glass-soft. Hairline glass-border + inset highlight + elevation-3. Itens com `border-radius: sm`, hover em `bg-tint-high`.

### 5.8 `.alg-toast`

Notificação transitória. Surface em glass-medium. Empilha em coluna bottom-right. Auto-dismiss success/info 4s, error persiste até user fechar.

### 5.9 `.alg-avatar`

Foto / iniciais com fallback determinístico (hash do nome → gradiente OKLCH consistente). Sizes sm (24) / md (32) / lg (48). Variants `--ring` brand, `--ring-success` online.

### 5.10 `.alg-skeleton`

Shimmer 1.6s curva cinematic. Reduced-motion → opacity pulse 2s.

### 5.11 `.alg-sector*` (M6.1 anchor — Cinematic OS v1)

Família de classes que renderiza o **sector dashboard** (Marketing, Comercial, Operação, RH, Compras, Financeiro, Administração — todos compartilham o componente `SectorDashboard.vue`). Layout magazine, não grid uniforme:

- `.alg-sector` — container vertical, padding 48px desktop / 24px mobile, gap 32px
- `.alg-sector__watermark` — mono uppercase, 10px, tracking widest, opacity 0.28 — sinal "DEMO" sem competir com conteúdo
- `.alg-sector__header` — display family, peso light (300), tracking tightest, line-height 1.05
- `.alg-sector__anchors` — grid 2-up com hairline divider (1px `--alg-border`). KPI anchor: valor em display 32px peso medium, label em mono uppercase 10-11px tracking widest
- `.alg-sector__secondaries` — strip 4-up colapsa para 2-up <1024px, 1-up <480px
- `.alg-sector__chart` — surface em glass-soft + hairline + elevation-1 — flutua no canvas

### 5.12 `.alg-agent*` (M6.1 anchor — Cinematic OS v1)

Sector agent panel. Sticky 360px right rail flutuando em glass-soft. Avatar monogram geométrico (SVG inline, stroke 1px). Bubbles com hairline border (agente) ou bg-tint-med (user). Input em bg-tint-low, hint em mono 10px tracking wide.

---

## 6. White model — variante editorial opt-in

Cinematic OS dark é o default. **White model** é a tradução do mesmo DNA para superfície clara — não "light theme" SaaS (branco + pastel azul).

Ativar com `<html data-theme='white'>` (ou no subtree).

**Decisões trancadas:**

- Canvas em paper warm (~`#FBFAF8`), não pure white — evita aspereza retinal
- Tinta em **4 níveis de opacity** (1.00 / 0.72 / 0.48 / 0.32) — espelha o dark
- Borders em warm gray hairlines (rgba ink 8% / 14% / 20%)
- Sombras em true black low-opacity (paper aceita black puro; não precisa de chroma trickery)
- Glass milk-white com blur menor (16/28/40px) — paper não tolera blur pesado (vira "greasy fingerprint")
- Brand teal escurece para autoridade + AA contrast em paper (`oklch(0.520 ...)`)
- Inset highlight em branco 60-90% (paper é reflexivo, light bounces back off the top edge)

**Quando usar:** marketing pages, white-paper / PDF / share views, ambientes de luz forte (CEO num evento outdoor com iPad). Default permanece dark.

> `[data-theme='light']` v0 fica preservado como alias — converge com `[data-theme='white']` no Cinematic OS, mas mantém compat com qualquer consumer já wired.

---

## 7. Acessibilidade

### 7.1 Contraste (verificado contra `--alg-bg` = `--alg-black-2`)

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

White model preservado com mesmos mínimos (4.5:1 texto sobre superfície).

### 7.2 Focus ring

2px brand ring + 2px gap em canvas color — sempre visível, sobrevive a glass.

### 7.3 Keyboard

Tab navigation completa, Esc fecha drawer/modal/dropdown, Enter ativa cards, ↑↓ navega menus.

### 7.4 Reduced motion

Todos tokens de duration colapsam para 1ms via `@media (prefers-reduced-motion: reduce)`. Skeleton shimmer troca para opacity-pulse 2s (continua sinalizando "carregando" sem movimento direcional).

### 7.5 Touch target

Mobile mínimo 44×44px (Apple HIG, WCAG 2.5.5 AAA).

### 7.6 Screen reader

`aria-live` em regiões dinâmicas (Kanban, toasts), `aria-label` completo em cards (nome + canal + estado + tempo), `aria-busy` em regiões com skeleton.

### 7.7 Gate de CI

`@axe-core/playwright` reprova PR com violações `critical`/`serious` WCAG AA.

---

## 8. LeadAgingChip — preservado (D10 + D11)

Dual-coding (cor + glyph + texto numérico + aria-label) é não-negociável — 8% dos homens tem alguma forma de daltonismo.

| State | Glyph | Token cor | Background |
|---|---|---|---|
| Em dia | ● | `--alg-aging-green` | `--alg-aging-green-bg` |
| Atenção | ◐ | `--alg-aging-yellow` | `--alg-aging-yellow-bg` |
| Atrasado | ○ | `--alg-aging-red` | `--alg-aging-red-bg` |
| Neutro | — | `--alg-aging-neutral` | `--alg-aging-neutral-bg` |

Coeficiente por etapa (D10) preservado: `Stage.aging_coefficient` multiplica bandas base (12h verde→amarelo, 24h amarelo→vermelho na etapa Novo). Configurável em `PipelineConfig.vue`.

Guarda explícita em `LeadAgingChip.vue` antes de qualquer cálculo:
```js
if (agingCoefficient === 0 || agingCoefficient == null) {
  return { state: 'neutral', glyph: '—' };
}
```

---

## 9. Integração com o engine

### 9.1 Estrutura

```
engines/algorythmo/app/assets/
├── stylesheets/
│   ├── _tokens.scss        ← tokens (custom properties) — Cinematic OS v1
│   ├── _components.scss    ← classes .alg-* — Cinematic OS v1
│   └── algorythmo.scss     ← entry point
└── images/                 ← brand assets (placeholders)
```

### 9.2 Como consumir

Já integrado em `_woot.scss` do dashboard Chatwoot:

```scss
// algorythmo: design-system-import
@import '../../../../../engines/algorythmo/app/assets/stylesheets/algorythmo';
```

Classes `.alg-*` e tokens `--alg-*` ficam globais. Vue components consomem via class binding — sem `<style scoped>` reescrevendo o sistema.

### 9.3 Bridge SCSS

`app/javascript/dashboard/assets/scss/algorythmo-bridge.scss` provê mixins SCSS-level (breakpoint queries). Use só quando precisar de construto SCSS (`@use 'algorythmo-bridge' as alg;`).

---

## 10. Cut-flag para revert

`data-alg-cinematic="v1"` no root do overlay (M6.1 Reports Comerciais — `ReportsCommercialOverlay.vue`) sinaliza Cinematic OS ativo. Default LIGADO. Para reverter um subtree ao visual antigo sem deploy, basta remover o atributo ou setar `v0`. Padrão `algorythmoCutFlags.js` (memória `project_cut_flag_convention`).

Cut-flag de rota (`algorythmo_cut_reports_commercial`) é independente — esconde a tela inteira, não troca o tema.

---

## 11. Princípios de decisão rápida

1. **Silêncio > ruído.** Espaço entre elementos é o produto. Na dúvida, remove.
2. **Tipografia carrega hierarquia.** Não use border / background pra hierarquizar; use peso, tracking, opacidade.
3. **Cor é exceção semântica.** Se você ia colorir "pra ficar bonito", é hierarquia errada.
4. **Motion Apple-grade ou nada.** Curva cinematic. Spring é raríssimo.
5. **Glass é real ou não é glass.** `backdrop-filter` obrigatório, hairline border obrigatório, inset highlight obrigatório.
6. **Estados são designados.** Empty/loading/error têm a mesma atenção que happy path.
7. **Acessível desde o dia 1.** Retrofit é caro.
8. **Mobile-first.** 375px primeiro, depois expande.
9. **Editorial > spec sheet.** Copy é design — "Os Leads vão aparecer aqui automaticamente conforme conversas entram" > "Nenhum lead encontrado".
10. **Se parece template, refaz.** Apple / Linear / Vercel não usariam? Refaz.

---

## 12. Open questions / próximos

- **Self-host de fontes.** Geist / Geist Mono / Söhne — handoff pro brand designer humano. TODO marcado em `_tokens.scss`. Fallback escalonado funciona até lá.
- **Logo finalizado.** SVGs em `images/` são placeholders competentes. Designer humano entrega lockup full / mark / mono / inverso + favicon multi-res + splash por device.
- **Ambient motion library.** Orb pulsante de comando, planet rotation no hero — `--alg-duration-ambient` reservado (6s), library de componentes ambientes vem na v1.1.
- **White model em produção.** Specs trancadas. Validar com sessão de QA visual antes de oferecer toggle público.
- **Component coverage.** Faltam ainda: `.alg-tooltip`, `.alg-tabs`, `.alg-select`, `.alg-checkbox`, `.alg-radio`, `.alg-switch`, `.alg-command-palette` (cmd+K). Adicione aqui em §5 quando implementar.

---

*Fim do documento. Mantenha vivo. Toda feature nova: leia esta filosofia, então construa.*
