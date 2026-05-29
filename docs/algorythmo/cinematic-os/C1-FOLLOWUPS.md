# Cinematic OS C1 — Deferidos do C1 → C7

Itens identificados no review adversarial do PR #93 (C1 — dark-first global +
purga Chatwoot, verdict FIX-THEN-SHIP) que foram conscientemente adiados para o
C7 (polish pesado). Nenhum bloqueia o C1; o blocker de acessibilidade (botão
primário branco-sobre-ciano) foi corrigido no próprio PR #93.

Cada item tem dono lógico, impacto de produto e o fix arquitetural proposto.

---

## 1. Super-admin / onboarding não herdam o tema dark

**O que é:** O pack Vite do super-admin (`superadmin.js`) e o fluxo de
instalação/onboarding (`installation/onboarding`) têm entrypoints SCSS próprios
que **não** importam o entry algorythmo (`engines/algorythmo/app/assets/
stylesheets/algorythmo`). Resultado: essas telas continuam claras, com o azul
Chatwoot — incluindo a **primeira tela de instalação de uma instância nova**.

**Impacto:** O dashboard operacional (a tela que o cliente PME usa todo dia) já
está dark-first e sem azul. O super-admin é uma tela interna de operador, e o
onboarding de install roda uma vez por instância. Impacto no cliente: baixo.
Impacto na percepção de "produto acabado" numa demo de install: médio.

**Próximo passo (C7):** importar o entry algorythmo (ou ao menos `_chrome.scss`)
nos packs `superadmin` e `installation/onboarding`, com o mesmo tag soft-fork.
Validar contraste das telas de install no dark.

> **Atualização C1.1 (2026-05-29) — NÃO é só importar o entry.** Tentamos no
> PR-B do C1.1 e a review adversarial (codex, P1) pegou a regressão antes do
> merge: importar `algorythmo.scss` no `super_admin/index.scss` deixa o `body`
> dark (via `_chrome.scss` §5 `body { background: var(--alg-bg) }`), MAS o
> console do Administrate é renderizado em ERB com classes Tailwind **literais**
> hard-coded (`text-slate-800`, `border-slate-100` em `_navigation.html.erb`,
> `_nav_item.html.erb`, `accounts/show.html.erb`, etc.). Resultado: texto escuro
> sobre fundo escuro → **console do operador ilegível**. A import foi revertida.
>
> **Escopo real do "super-admin dark" (followup dedicado):**
> 1. Retokenizar TODAS as views ERB do `app/views/super_admin/**` (trocar
>    `slate-*`/`gray-*`/`bg-white` literais por tokens `n-*`).
> 2. Adicionar `app/javascript/superadmin_pages/**/*.vue` ao `content` do
>    `tailwind.config.js` (hoje fora do scan — codex P2; os utilities `n-*` que
>    o playground usaria só existem por acidente de outros arquivos escaneados).
> 3. SÓ ENTÃO importar o entry no pack + retokenizar o playground Robin.
> 4. QA visual logado no console + tela de install antes de declarar pronto.
>
> Impacto no cliente: baixo (console é interno do operador). Por isso ficou de
> fora do C1.1 e segue como dívida explícita.

---

## 2. White Model (`[data-theme='white']`) sobrescrito pelo `:root` dark

**O que é:** O `_chrome.scss` redefine os tokens de tema do host no `:root` para
valores dark (é o que torna o app dark-first antes de `.dark`). Isso tem
especificidade igual ao seletor `[data-theme='white']` do `_tokens.scss` e é
importado depois — então o canvas dark **vence silenciosamente** o White Model.
Quem ligar `data-theme='white'` hoje continua vendo o canvas dark do host.

**Impacto:** Nenhum agora. O White Model não tem toggle público (já é deferido
desde o v1 — ver FOLLOW-UPS.md "Modelo White"). Os tokens `--alg-*` do White
Model continuam corretos; só a camada de override do host chrome não respeita o
opt-in.

**Próximo passo (C7, junto com o toggle do White Model):** escopar o canvas
dark do `_chrome.scss` para `:root:not([data-theme='white'])` (e o mesmo nos
overrides de surface), para o White Model voltar a vencer quando explicitamente
ligado.

---

## 3. Classes legadas bare (não-`n-`, sem `dark:`) que escapam da camada de variável

**O que é:** A purga do C1 opera na camada de variáveis (família `--blue-*`,
utilities `n-brand`, surfaces `n-*`). Classes Tailwind **legadas e literais** que
não passam por variável — ex.: `text-slate-600` sem variante `dark:` — não são
alcançadas e renderizam com contraste ruim no dark.

**Casos conhecidos:**
- `app/javascript/dashboard/settings/security/Index.vue:46` — `text-slate-600`
  sobre canvas dark ≈ ~2.5:1 (reprova AA).
- Super-admin playground / telas internas com paleta literal slate/gray.

**Impacto:** Pontual, em telas de settings/admin secundárias. O happy path
operacional já está coberto pela camada de variável.

**Próximo passo (C7):** varredura per-view de classes bare literais (`text-slate-*`,
`bg-white`, etc. sem `dark:`), trocando por tokens `n-*` ou variantes `dark:`.
Rodar axe-core por rota para pegar os contrastes residuais.

---

*Origem: review adversarial do PR #93 (C1). Mantido vivo — consumir no C7.*
