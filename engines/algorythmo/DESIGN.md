# Algorythmo OS — Design System

**Status:** Living document. Trilha D do MVP (plano 0001 §10). Atualizado conforme tokens, components ou assets mudam.
**Owner:** founder / designer agent.
**Última revisão:** 2026-05-23 — D.1 a D.4 entregues.

---

## 1. Filosofia

Algorythmo OS é um painel operacional para PMEs brasileiras escalarem com AI. Cada superfície da UI é uma janela para esse trabalho — não uma vitrine de funcionalidades, não um dashboard genérico, não uma cópia do upstream Chatwoot.

**Dark-first, por princípio operacional.** Pessoas que rodam um CRM passam o dia dentro dele. Tela escura reduz fadiga, aproxima a interface da gravitas dos terminais profissionais (Linear, Vercel, Stripe Dashboard), e permite que a hierarquia se construa pela emissão de luz — branco onde importa, cinza quando descansa, brand teal quando precisa puxar o olho. Light mode é opt-in, espelhado fielmente, mas não é o default.

**Tipografia editorial.** A maioria dos SaaS escolhe Inter (ou Roboto) para tudo e termina ali. A gente usa Inter na superfície operacional (denso, neutro, eficiente em 11-14px), mas reservamos uma face display para os momentos com peso editorial — empty states, telas de onboarding, hero da landing, modais de marco. Tracking negativo, pesos médios (não 800/900 que fica corporativo), letterspacing intencional. Lowercase nos lockups de marca: lowercase tem mais autoridade visual hoje do que UPPERCASE.

**Referência mental:** Linear (densidade), Vercel (precisão), Stripe (clareza), Apple (rigor de tipografia e motion), Airbnb (calor humano sem perder profissionalismo). Não somos:

- **Não somos Chatwoot upstream.** Eles otimizam para um agente de suporte genérico em mercado global. A gente otimiza para o operador PME brasileiro usando AI como mão direita.
- **Não somos Material Design.** Sem ripples, sem FABs, sem sombras flat-colored que mostram a costura.
- **Não somos Bootstrap nem Tailwind UI default.** Sem azul-marinho de "tema corporativo". Sem gradient roxo-azul que grita "AI startup 2023".

**O que estamos buscando:** um sistema que pareça construído por gente que cuida. Que numa auditoria de venda de empresa, ninguém olhe e ache template. Que rode liso a 60 fps. Que respeite quem usa: dual-coding pra daltonismo, contraste WCAG AA mínimo, `prefers-reduced-motion`, touch targets de 44px em mobile.

---

## 2. Token reference

Os tokens vivem em `engines/algorythmo/app/assets/stylesheets/_tokens.scss`. Todos expostos como CSS custom properties em `:root` (dark default) e `[data-theme='light']` (override). Convenção de nome: `--alg-<categoria>-<papel>-<step?>`.

### 2.1 Color — neutrals (9 steps)

| Token | Valor (dark) | Uso |
|---|---|---|
| `--alg-color-neutral-1` | `oklch(0.145 0.005 264)` | Surface base, beneath o app shell |
| `--alg-color-neutral-2` | `oklch(0.180 0.006 264)` | App bg default |
| `--alg-color-neutral-3` | `oklch(0.218 0.008 264)` | Raised surface (cards, dropdowns) |
| `--alg-color-neutral-4` | `oklch(0.258 0.010 264)` | Card hover, overlay subtle |
| `--alg-color-neutral-5` | `oklch(0.310 0.011 264)` | Borders default, dividers |
| `--alg-color-neutral-6` | `oklch(0.395 0.012 264)` | Border hover, muted icon |
| `--alg-color-neutral-7` | `oklch(0.530 0.013 264)` | Tertiary text, placeholder |
| `--alg-color-neutral-8` | `oklch(0.690 0.012 264)` | Secondary text |
| `--alg-color-neutral-9` | `oklch(0.970 0.004 264)` | Primary text, max contrast |

**Por que OKLCH e não HSL:** lightness em OKLCH é perceptualmente uniforme. `hsl(0 0% 50%)` é visualmente mais escuro que `hsl(60 0% 50%)` — o sistema HSL mente. OKLCH não mente, então o nosso ramp de neutrals tem deltas de luz que o olho lê como o mesmo passo.

### 2.2 Color — semantic

| Token | Uso |
|---|---|
| `--alg-bg` / `--alg-bg-base` / `--alg-bg-raised` / `--alg-bg-raised-hover` | Surfaces (app, raised, hover) |
| `--alg-bg-overlay` | Modal scrim (com backdrop-filter blur) |
| `--alg-border` / `--alg-border-hover` / `--alg-border-focus` | Bordas operacionais |
| `--alg-text-primary` / `--alg-text-secondary` / `--alg-text-tertiary` / `--alg-text-muted` / `--alg-text-inverse` | Hierarquia de texto |
| `--alg-color-success` / `--alg-color-warning` / `--alg-color-danger` / `--alg-color-info` (+ `-subtle`, `-fg`) | Status |
| `--alg-color-brand-primary` (+ `-hover`, `-active`, `-subtle`, `-fg`) | Brand teal |

### 2.3 Color — LeadAgingChip (D10 + D11)

Tokens explícitos com **dual-coding** (cor + glyph) para daltonismo. Ver §4 abaixo.

| State | Cor token | Background token | Glyph | Glyph token (CSS content) |
|---|---|---|---|---|
| Em dia (green) | `--alg-aging-green` | `--alg-aging-green-bg` | ● | `--alg-aging-green-glyph` (`\25CF`) |
| Atenção (yellow) | `--alg-aging-yellow` | `--alg-aging-yellow-bg` | ◐ | `--alg-aging-yellow-glyph` (`\25D0`) |
| Atrasado (red) | `--alg-aging-red` | `--alg-aging-red-bg` | ○ | `--alg-aging-red-glyph` (`\25CB`) |
| Neutro / desativado | `--alg-aging-neutral` | `--alg-aging-neutral-bg` | — | `--alg-aging-neutral-glyph` (`\2014`) |

Contraste WCAG verificado contra `--alg-bg-raised`:

| State (dark) | Ratio | Verdict |
|---|---|---|
| green sobre neutral-3 | 8.2:1 | AAA |
| yellow sobre neutral-3 | 10.1:1 | AAA |
| red sobre neutral-3 | 6.8:1 | AA |

Light theme re-tunado em `_tokens.scss` para manter ≥4.5:1 em superfície clara.

### 2.4 Typography

| Token | Valor | Uso |
|---|---|---|
| `--alg-font-display` | `AlgorythmoDisplay, InterDisplay, Inter, system-ui, …` | Hero, empty states, modais de marco |
| `--alg-font-sans` | `Inter, -apple-system, …` | UI operacional (default body) |
| `--alg-font-mono` | `JetBrains Mono, SF Mono, Menlo, Consolas, …` | IDs, código, dados de sistema |
| `--alg-text-2xs` … `--alg-text-4xl` | `clamp(min, fluid, max)` | Escala fluida, 10px → 56px |
| `--alg-leading-tight` (1.10) / `-snug` (1.25) / `-normal` (1.45) / `-relaxed` (1.625) | Line heights |
| `--alg-tracking-tight` (-0.022em) … `-widest` (0.10em) | Letterspacing |
| `--alg-weight-regular/medium/semibold/bold` | 400 / 500 / 600 / 700 |

**Escala fluida (clamp):** entre breakpoints, os tamanhos interpolam suave em vez de pular. Mobile lê confortável a 320-375px, desktop respira a 1440px+. Ratio 1.250 (minor third).

**Fontes display:** `AlgorythmoDisplay` é nome reservado para a face que o brand designer humano vai produzir (custom ou licenciada). Fallback escalonado para `InterDisplay` (já self-hosted no Chatwoot upstream) → `Inter` → system stack.

### 2.5 Spacing

Base **4px** (não 8px). Justificativa em comentário no token file.

| Token | Valor | Uso típico |
|---|---|---|
| `--alg-space-1` | 4px | Hair gap (label-input, glyph-text) |
| `--alg-space-2` | 8px | Tight inline gap |
| `--alg-space-3` | 12px | Default inline gap |
| `--alg-space-4` | 16px | Default block gap (card padding) |
| `--alg-space-6` | 24px | Section gap small |
| `--alg-space-8` | 32px | Section gap medium |
| `--alg-space-12` | 48px | Section gap large |
| `--alg-space-16` | 64px | Page padding desktop |

**Aliases semânticos:** `--alg-space-card-padding`, `--alg-space-card-gap`, `--alg-space-section-gap`, `--alg-space-modal-padding`, `--alg-space-input-padding-{x,y}`, `--alg-space-button-padding-{x,y}`, `--alg-space-page-padding-{mobile,desktop}`. Sempre que possível, usar o alias em vez do step bruto — o alias descreve a intenção.

### 2.6 Radii

| Token | Valor | Uso |
|---|---|---|
| `--alg-radius-none` | 0 | Hard edges (table cells) |
| `--alg-radius-xs` | 2px | Chip glyph slots |
| `--alg-radius-sm` | 4px | Inputs (snappy, profissional) |
| `--alg-radius-md` | 8px | Buttons, chips |
| `--alg-radius-lg` | 12px | Cards, dropdowns |
| `--alg-radius-xl` | 16px | Modais, panels |
| `--alg-radius-2xl` | 24px | Hero surfaces, splash |
| `--alg-radius-pill` | 9999px | Avatars, toggle pills |

**Regra:** comprometa-se com um nível por componente. Misturar `rounded-md` e `rounded-lg` arbitrariamente é tell de design descuidado.

### 2.7 Shadow

Sombras em dark mode são problema de craft. Translucent black puro some sobre cinza escuro. A nossa solução: cada nível combina outer shadow direcional + 1px border-glow + (em alguns níveis) chroma sutil pra sugerir luz.

| Token | Uso |
|---|---|
| `--alg-shadow-xs` | Hair lift — chips, divisores sutis |
| `--alg-shadow-sm` | Cards default |
| `--alg-shadow-md` | Hover de card, dropdown |
| `--alg-shadow-lg` | Popover, tooltip rico |
| `--alg-shadow-xl` | Modal, drawer |
| `--alg-ring-focus` | Focus ring WCAG (2px brand + 2px gap) |
| `--alg-glow-subtle` | Inner highlight nas raised surfaces |

### 2.8 Motion

| Token | Valor | Uso |
|---|---|---|
| `--alg-duration-instant` | 80ms | Press feedback |
| `--alg-duration-fast` | 140ms | Hover de botão, color shift |
| `--alg-duration-base` | 220ms | Dropdown open, card hover |
| `--alg-duration-slow` | 340ms | Drawer slide, modal enter |
| `--alg-duration-deliberate` | 520ms | Hero, large reveal |
| `--alg-ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrada |
| `--alg-ease-in` | `cubic-bezier(0.64, 0, 0.78, 0)` | Saída |
| `--alg-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Bidirecional |
| `--alg-ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Delight moments only |
| `--alg-ease-linear` | `linear` | Progress bars apenas |

**Banido:** `ease-in-out` named (mushy), `linear` em hover/transition (robótico), spring em interações operacionais (cansa).

`prefers-reduced-motion: reduce` colapsa todos os duration tokens para 1ms.

### 2.9 Layout

`--alg-container-{sm,md,lg,xl,2xl}` para max-widths, `--alg-container-max: 1440px` para app shell. `--alg-sidebar-width: 260px`, `--alg-drawer-width: 420px`. Z-index nomeado por camada (`base`, `raised`, `sticky`, `dropdown`, `overlay`, `modal`, `toast`, `tooltip`) — escala rasa, intencional.

**Breakpoints de teste:** 375px (mobile), 768px (tablet), 1280px (desktop), 1920px (large desktop).

---

## 3. Component library (`.alg-*`)

Os componentes vivem em `engines/algorythmo/app/assets/stylesheets/_components.scss`. **São classes CSS, não componentes Vue.** A trilha B (Kanban) consome essas classes nos seus `.vue` files via `class="alg-card alg-card--interactive"`.

### 3.1 `.alg-btn`

Botão de ação. Touch target ≥36px (md) ou 44px (lg). Focus ring visível. Loading state com spinner overlay.

**Variants:** `alg-btn--primary`, `alg-btn--secondary`, `alg-btn--ghost`, `alg-btn--danger`, `alg-btn--icon` (square, icon-only).
**Sizes:** `alg-btn--sm` (28px), default (36px), `alg-btn--lg` (44px).
**States:** `[disabled]`, `[aria-disabled='true']`, `[data-loading='true']`.

```html
<button class="alg-btn alg-btn--primary">
  <svg class="alg-btn__icon" aria-hidden="true">…</svg>
  Criar pipeline
</button>

<button class="alg-btn alg-btn--ghost alg-btn--icon alg-btn--sm" aria-label="Mais opções">
  <svg class="alg-btn__icon" aria-hidden="true">⋮</svg>
</button>

<button class="alg-btn alg-btn--secondary" data-loading="true">
  Salvando…
</button>
```

### 3.2 `.alg-input`

Input textual. Focus ring brand. Estado de erro via `[aria-invalid='true']` ou `.alg-input--error`. Wrapper `.alg-input-group` para input + icon.

**Variants:** `alg-input--search` (toolbar variant), `alg-input--error`.
**Sizes:** `alg-input--sm` (28px), default (36px), `alg-input--lg` (44px).

```html
<label class="alg-input-group">
  <svg class="alg-input-group__icon" aria-hidden="true">…</svg>
  <input class="alg-input alg-input--search" placeholder="Buscar leads" />
</label>

<input class="alg-input" aria-invalid="true" aria-describedby="err-1" />
<span id="err-1" class="alg-text-danger">Esse contato já tem Lead aberto.</span>
```

### 3.3 `.alg-card`

Container raised. Default = surface raised + border sutil + shadow-sm. Variants para interatividade e elevação.

**Variants:** `alg-card--interactive` (hover/active/focus states), `alg-card--raised` (shadow-md no idle), `alg-card--flush` (sem padding — você gerencia).

**Composição (opcional):** `.alg-card__header`, `.alg-card__title`, `.alg-card__meta`, `.alg-card__footer`. O LeadCard real (B.4) provavelmente usa esses helpers.

```html
<article class="alg-card alg-card--interactive" role="button" tabindex="0">
  <header class="alg-card__header">
    <h3 class="alg-card__title">Maria Santos</h3>
    <button class="alg-btn alg-btn--ghost alg-btn--icon alg-btn--sm" aria-label="Ações do lead">⋮</button>
  </header>
  <p class="alg-card__meta">
    <svg class="alg-btn__icon" aria-hidden="true">…</svg>
    WhatsApp
  </p>
  <footer class="alg-card__footer">
    <span class="alg-chip alg-chip--aging" data-state="yellow" aria-label="Atenção, 18 horas nesta etapa">
      <span class="alg-chip__glyph" aria-hidden="true">◐</span>
      18h
    </span>
  </footer>
</article>
```

### 3.4 `.alg-chip`

Marcadores compactos. Pill-shaped. Glyph + texto.

**Variants:** `alg-chip--info`, `alg-chip--success`, `alg-chip--warning`, `alg-chip--danger`, `alg-chip--brand`, **`alg-chip--aging`** (state-driven via `data-state`).

```html
<span class="alg-chip alg-chip--info">
  <svg class="alg-chip__icon" aria-hidden="true">…</svg>
  WhatsApp
</span>

<span class="alg-chip alg-chip--aging" data-state="red" aria-label="Atrasado, 3 dias nesta etapa">
  <span class="alg-chip__glyph" aria-hidden="true">○</span>
  3d
</span>
```

### 3.5 `.alg-modal` (+ overlay)

Modal central com scrim blur. Sem dependência de componente Vue específico — trilha B encapsula em `<teleport to="body">`.

**Estrutura:** `.alg-modal-overlay > .alg-modal > [.alg-modal__header, .alg-modal__body, .alg-modal__footer]`.
**Variants do modal:** `alg-modal--sm` (420px), default (560px), `alg-modal--lg` (720px).

### 3.6 `.alg-skeleton`

Placeholder shimmer. Animação 1.4s easing in-out. Em `prefers-reduced-motion: reduce`, troca para opacity-pulse 2s.

**Variants:** `alg-skeleton--text`, `alg-skeleton--title`, `alg-skeleton--avatar`, `alg-skeleton--card`.

```html
<div aria-busy="true" aria-live="polite">
  <div class="alg-skeleton alg-skeleton--card"></div>
  <div class="alg-skeleton alg-skeleton--card"></div>
</div>
```

---

## 4. LeadAgingChip (D10 + D11) — detalhe operacional

O LeadAgingChip é o **operacional heart** do Kanban. Sem ele, o board é só uma visualização. Com ele, vira radar de gargalo: o operador olha de relance, vê um cluster de pills vermelhos na coluna "Proposta" e sabe que tem fricção ali.

### 4.1 Escala base

| State | Threshold (default Novo, coef=1) | Glyph | Token |
|---|---|---|---|
| Em dia (green) | 0-12h | ● | `--alg-aging-green` |
| Atenção (yellow) | 12-24h | ◐ | `--alg-aging-yellow` |
| Atrasado (red) | 24-36h+ | ○ | `--alg-aging-red` |
| Neutro (sem alerta) | n/a — coef=0 | — | `--alg-aging-neutral` |

### 4.2 Coeficiente por etapa (D10)

Cada `Stage` tem um campo `aging_coefficient` (decimal, default por etapa). O coeficiente multiplica as bandas base:

| Stage default | aging_coefficient | Threshold real verde→amarelo | Threshold real amarelo→vermelho |
|---|---|---|---|
| Novo | 1.0 | 12h | 24h |
| Qualificado | 4.0 | 48h (2d) | 96h (4d) |
| Proposta | 7.0 | 84h (3.5d) | 168h (7d) |
| Fechado ganho | 0 | — (sem alerta) | — |
| Fechado perdido | 0 | — (sem alerta) | — |

**Customização:** tela `PipelineConfig.vue` (B.6) permite o cliente ajustar o coeficiente por etapa conforme a média do próprio negócio. Tempo numérico no chip mostra sempre `stage_entered_at → now` (ex: "18h", "3d 4h"), formatação humanizada.

### 4.3 Dual-coding rationale (D11)

Cerca de 8% dos homens têm alguma forma de daltonismo (Brasil: ~7 milhões de pessoas). Verde-vermelho é o eixo mais comprometido. Por isso, **cor não é a única dimensão de comunicação** no chip:

1. **Cor** — primária para quem enxerga normalmente
2. **Glyph** (●/◐/○) — sobrevive a daltonismo, monocromático, impressões em PB
3. **Texto numérico** — informação precisa (não "muito tempo" mas "3d 4h")
4. **`aria-label`** — leitor de tela anuncia "Atrasado, 3 dias 4 horas nesta etapa"

Os três códigos visuais redundam. Mesmo em B&W ou daltonismo, o operador distingue a urgência.

### 4.4 Guarda explícita (F6 do eng-review round 2)

Em `LeadAgingChip.vue` (B.4b), antes de qualquer cálculo:

```js
if (agingCoefficient === 0 || agingCoefficient == null) {
  return { state: 'neutral', glyph: '—' };
}
```

Sem isso, divisão por zero em fechado/Lost trash a UI.

---

## 5. Acessibilidade

### 5.1 Contraste

- Texto primário sobre superfície default: ≥10:1 (AAA).
- Texto secundário sobre superfície default: ≥6:1 (AAA).
- Texto tertiário sobre superfície raised: ≥4.5:1 (AA).
- Aging chip foreground sobre seu background: ≥4.5:1 (AA) verificado em ambos os temas.
- Focus ring: 2px solid brand + 2px gap = sempre visível (WCAG 2.4.11).

### 5.2 Keyboard navigation

Baseline MVP (D11 reduzido por F4):

- `Tab` move foco entre cards e colunas do Kanban.
- `Enter` no card abre `LeadDetailDrawer`.
- `Esc` fecha drawer / modal / dropdown.
- Drag-and-drop é **mouse-only no MVP**. `vuedraggable-next` não suporta drag-by-keyboard confiável e WAI-ARIA 1.1 deprecou `aria-grabbed`/`aria-dropeffect`. Fallback futuro: menu ⋮ → "Mover para…" — registrado pós-MVP.

### 5.3 Screen reader

- `aria-live="polite"` na região do Kanban anuncia transições de stage ("Lead Maria Santos movido para Qualificado").
- Cada card carrega `aria-label` completo: nome, canal, estado de aging + tempo na etapa.
- `aria-busy="true"` nas regiões com skeleton.
- `role="button"` + `tabindex="0"` nos cards (são interativos sem ser `<button>` para evitar conflito com drag).

### 5.4 Motion

`prefers-reduced-motion: reduce` zera todos os tokens de duration (1ms). Skeleton troca shimmer por opacity-pulse 2s (continua sinalizando "ainda carregando" sem movimento direcional).

### 5.5 Color scheme

`prefers-color-scheme` é respeitado quando o usuário **não** escolheu tema explícito (`[data-theme]` ausente). Padrão sem preferência = dark.

### 5.6 Touch target

Mobile mínimo: 44×44px (Apple HIG, WCAG 2.5.5 AAA). `.alg-btn--lg` atinge 44px. Cards no Kanban são touch-targets implícitos full-card.

### 5.7 Gate de CI

`@axe-core/playwright` em CI reprova PR com violações `critical`/`serious` WCAG AA. Configurado em M0 (T1), validado em M1 (B.13).

---

## 6. Integração com o engine

### 6.1 Estrutura atual

Os assets do engine ficam em:

```
engines/algorythmo/app/assets/
├── stylesheets/
│   ├── _tokens.scss        ← tokens (custom properties)
│   ├── _components.scss    ← classes .alg-*
│   └── algorythmo.scss     ← entry point (@import 'tokens'; @import 'components';)
└── images/
    ├── logo-mark.svg       ← mark only (placeholder)
    ├── logo-full.svg       ← mark + wordmark (placeholder)
    ├── favicon.svg         ← 32x32 (placeholder)
    └── splash.svg          ← PWA splash (placeholder)
```

### 6.2 Como consumir (trilha B — Vue / Vite)

O upstream Chatwoot usa Vite, não Sprockets, para o frontend. Vite não tem conceito de Rails engine para assets — então a trilha B precisa importar nossos SCSS de forma explícita em vez de depender de auto-discovery.

**Caminho recomendado** (a ser feito por quem implementar trilha B):

1. Em `vite.config.mjs` adicionar alias `@algorythmo/styles` apontando para `engines/algorythmo/app/assets/stylesheets/algorythmo.scss`.
2. No entry SCSS do dashboard upstream (`app/javascript/dashboard/assets/scss/_woot.scss`), adicionar `@import '@algorythmo/styles';` **antes** de `@import 'base'` — tag `// algorythmo: design-system-import` no upstream conforme A2-front.
3. As classes `.alg-*` ficam disponíveis globalmente no dashboard Vue.

Para imagens: importar relativo no Vue (`import logoMark from '@/../../engines/algorythmo/app/assets/images/logo-mark.svg?url'`) ou configurar alias `@algorythmo/images`.

**Por que a trilha D não faz esse hook automaticamente:** mexer no `vite.config.mjs` é mudança global do build do upstream e cabe na trilha B (que de qualquer forma vai tocar Vue/Vite). Trilha D entrega o sistema; trilha B integra. Esse boundary mantém os PRs focados e o rebase de upstream mensal trivial.

### 6.3 Como consumir (mailers / Liquid)

Mailers do engine (já em `engines/algorythmo/app/views/mailers/`) podem inlinar tokens via `<style>` no `<head>` da Liquid, copiando valores de `_tokens.scss`. Email clients (Gmail, Outlook) não suportam CSS custom properties — então inline-style com valores duros. Quando o brand designer humano definir as faces finais, refletir aqui.

---

## 7. Open questions / próximos

### 7.1 Brand assets — placeholders entregues

Os SVGs em `app/assets/images/` são **placeholders competentes**, não finais. Geometria honesta (anel + notch + dot), tipografia em Inter cut, brand teal aplicado. Servem para M0/M1 não bloquear no rebrand.

**Founder action item:** contratar designer de marca humano para entregar:

- Logo finalizado em variantes (full lockup, mark-only, monocromático, inverso) em SVG + variants PNG (192, 512, 1024) para PWA manifest.
- Favicon multi-resolução ICO + 32×32 + 16×16 + Apple touch icon (180×180).
- Splash screens por device class (iOS 12 sizes, Android adaptive icon foreground/background).
- Eventual face display custom ("AlgorythmoDisplay") ou licença de uma curated (Söhne, GT Walsheim, General Sans).

### 7.2 Light theme — secundário, validar

Light theme foi tunado matematicamente mas não passou por sessão de design dedicada. Antes de oferecer toggle ao usuário (pós-M2 provavelmente), revisar:

- Aging chip contrast em superfícies muito claras.
- Sombras shadow-md/lg em light: o blur translucent não-tonal funciona, mas pode parecer plástico em telas baratas. Considerar version com tinta neutra-tilted.
- Brand teal em light: precisa ser darker (já está em `_tokens.scss` light override) — confirmar legibilidade quando o brand designer human ajustar o teal final.

### 7.3 Display face — placeholder

`--alg-font-display` aponta para `AlgorythmoDisplay` que ainda não existe. Fallback `InterDisplay` funciona mas é o mesmo font do body, então perde a hierarquia editorial. Quando a face final entrar:

1. Self-host via `next/font/local` ou link `@font-face` direto em `_tokens.scss` (preferível).
2. Validar render em Windows ClearType, macOS, Linux freetype.
3. Considerar variable font para reduzir peso de bundle.

### 7.4 Component coverage — gaps conhecidos

A trilha D entrega o núcleo. A trilha B (Kanban) e M4 (Manu) vão precisar de novos componentes que ainda não existem:

- `.alg-toast` — feedback transitório (pós-drag, pós-save).
- `.alg-tooltip` — dica contextual hover-only.
- `.alg-dropdown` / `.alg-menu` — menu ⋮ do card, popover de stage rename.
- `.alg-drawer` — `LeadDetailDrawer` (B.5). Pode ser implementado como variant lateral do `.alg-modal` ou componente novo.
- `.alg-avatar` — foto de perfil do Lead (canal). Vir do upstream Chatwoot ou rebuild?
- `.alg-tabs` — telas de configuração de pipeline.
- Form fundamentals: `.alg-label`, `.alg-fieldset`, `.alg-select`, `.alg-checkbox`, `.alg-radio`, `.alg-switch`.

Estes serão adicionados em iterações conforme trilha B / M4 demandar. Quem implementar **adiciona aqui no DESIGN.md** na seção 3 e mantém o doc vivo.

### 7.5 Quando re-revisar este doc

- Após cada feature de UI nova (`.alg-*` ou page-level pattern).
- Sempre que o brand designer humano entregar artefato final (logo, font, paleta refinada).
- A cada sync mensal de upstream (verificar se primitivos de Chatwoot que a gente integra mudaram).
- Quando habilitar light theme público — sessão de design dedicada.
- Após primeiro feedback de cliente real rodando o produto.

---

## 8. Princípios de design (decisão rápida)

Quando bater dúvida, lembrar:

1. **Densidade > respiração inútil.** Operador profissional não quer roleplay de "spacious modern". Quer ver muita informação ao mesmo tempo, hierarquizada.
2. **Contraste > decoração.** Hierarquia é construída por peso e cor de tinta, não por borders e backgrounds.
3. **Motion serve a clareza.** Se a animação não ajuda alguém a entender o que mudou, ela é ruído. Banido: bounce, springs em ações operacionais, parallax, hover-lift exagerado.
4. **Estados são designados, não tolerados.** Empty, loading, error têm a mesma atenção que happy path. Empty state genérico ("Nenhum resultado") é falha.
5. **Acessível desde o dia 1.** Retrofit é caro. Dual-coding, keyboard nav, contrast checks no commit.
6. **Mobile-first não é mantra, é restrição.** 375px primeiro, depois expande.
7. **Editorial > spec sheet.** Copy importa: "Os Leads vão aparecer aqui automaticamente conforme conversas entram pelos seus canais" > "Nenhum lead encontrado".
8. **Se parece template, redo.** Apple, Linear, Vercel não usariam isso? Refaz.

---

*Fim do documento. Mantenha vivo.*
