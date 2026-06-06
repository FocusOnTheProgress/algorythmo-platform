# 0013 — Tela do Operador = Chatwoot de fábrica (stock) + CRM + Copiloto

**Status:** DRAFT (aguarda revisão eng/design + go do founder)
**Branch base:** `algorythmo/main`
**Branch de trabalho:** `algorythmo/operador-stock`
**Conta alvo:** Modeloja = `account_id 2`
**Decisão governante:** ver memória `project-operator-stock-chatwoot`.

---

## 1. Objetivo (régua subtrativa)

O usuário de papel **`agent`** na conta 2 deve ver o **Chatwoot original, tema CLARO, layout/identidade de fábrica** — SEM nenhuma camada visual da Algorythmo (Cinematic). As **únicas** adições permitidas:

1. **CRM** (entrada de menu + tela kanban — engine `algorythmo`, já existente)
2. **Copiloto** (entrada de menu + tela — já existente)
3. **Marca Modeloja** (logo/nome por-conta — mecanismo `AlgBrandLogo` já existente)

O painel de **`administrator`** permanece **exatamente** como está (Cinematic escuro, setores, Conselho, Brain, Marketplace, Início). **Não regredir o admin** é requisito de aceitação tão forte quanto entregar o operador stock.

---

## 2. Estado atual (auditado 2026-06-05/06)

### 2.1 Tema / "pele" — aplicada GLOBALMENTE, não por papel
- `app/javascript/dashboard/helper/themeHelper.js`: lê `localStorage['color_scheme']` (default `auto`) → `auto`/`dark` ⇒ `.dark` no `<body>` + `data-theme="dark"` no `<html>`; `light` ⇒ remove `.dark` + `data-theme="white"`. **Dark-first por construção** (auto resolve p/ escuro).
- `engines/algorythmo/app/assets/stylesheets/_chrome.scss` (importado global via `_woot.scss:15`):
  - `:root:not([data-theme='white'])` — redefine os tokens light do host p/ valores dark (canvas escuro por padrão).
  - `.dark:not([data-theme='white'])` — paridade dark + purga azul.
  - **Blocos SEM guarda (atingem todos, inclusive white):** `.bg-n-brand`/`.text-n-brand`/etc (purga de marca p/ ciano, `!important`); `font-family: var(--alg-font-sans) !important` em `html,body,button,input,select,textarea`; vidro/grain/elevação em `.app-sidebar, nav.secondary-menu`; focus-ring de marca.
  - `[data-theme='white']` — remapeia o chrome do host p/ a escala "Paper" (NÃO é stock Chatwoot — é a versão clara da Algorythmo, ainda com Inter + ciano).
- `app/javascript/dashboard/assets/scss/_woot.scss:23-42`: **segundo** ponto que força Inter `!important` em `html,body`.

➡️ **Conclusão:** mesmo no tema "claro" existente, o operador veria fonte Inter + acento ciano + vidro — **não** o Chatwoot de fábrica. O host Chatwoot tem um tema light completo e testado (`_next-colors.scss` `:root`), mas hoje ele é **sobrescrito** pela camada Algorythmo. Para o operador ver stock, é preciso **neutralizar a camada Algorythmo do chrome** só pra ele.

### 2.2 Menu (`Sidebar.vue`) — vazamentos para o agente
| Item | Hoje p/ agente | Alvo |
|---|---|---|
| AlgorythmoInicio | **visível** (sem gate) | esconder (admin-only) |
| Contacts / Companies / Conversation | visível (stock) | manter |
| Conversation › Operação ao Vivo | **visível** (adição nossa) | esconder (admin-only) |
| Conversation › Caixa de Entrada (pessoal CEO) | **visível** (adição nossa) | esconder (admin-only) |
| CRM | visível (flag) | **manter** |
| 8 setores (Commercial…Administration) | **visíveis** se cut-flag OFF (gate é account-level, não por papel) → órfãos sem header | esconder (admin-only) |
| C-Levels | **visível** (sem gate) | esconder (admin-only) |
| Brain | escondido (isAdmin no menu) | manter escondido |
| Copiloto | visível | **manter** |
| Marketplace | **visível** (sem gate) | esconder (admin-only) |
| Settings | visível (filhos cut-gated) | manter (comportamento upstream do agente) |

### 2.3 Rotas — segurança
- Setores / C-Levels / Marketplace: `meta.permissions: ['administrator']` → agente é **redirecionado**. OK.
- **BRECHA:** `algorythmo_brain_viewer` permite `agent` → agente entra por URL. **Fechar (admin-only).**
- `algorythmo_admin_inicio` permite `agent` → após esconder do menu, **fechar rota** também (admin-only).
- CRM / Copiloto: permitem `agent`. OK (são as adições).

### 2.4 Aterrissagem
- `routes/index.js:56,69`: já computa `isAdmin` por conta; hoje **todos** caem em `inicio`. Mudar não-admin p/ `dashboard` (conversas).

---

## 3. Arquitetura da solução

### 3.1 Mecanismo central: marca de superfície por papel (`data-surface`)
Introduzir **um** atributo no `<html>`: `data-surface`.
- **Admin (e qualquer não-operador):** atributo ausente ou `="algorythmo"` → camada Cinematic aplica **igual a hoje** (zero regressão).
- **Operador (`agent`):** `data-surface="stock"` →
  1. **`data-theme="white"`** continua sendo setado (mantém os tokens `--alg-*` "Paper" ativos, para que **CRM e Copiloto** — componentes nossos — renderizem claros/coerentes).
  2. **Camada de chrome do host é neutralizada** (Stream 1 abaixo) → o Chatwoot mostra seus próprios defaults light (`:root` do host, fonte Lato/sistema, azul Chatwoot, chrome sem vidro).

> Separação limpa: `data-theme` controla a pele dos **nossos** componentes; `data-surface` controla se o **chrome do host** é Algorythmo ou stock. O admin nunca recebe `stock`, então seu caminho é byte-a-byte o de hoje.

### 3.2 Resolução papel → superfície + anti-flash (FOUC)
- A decisão "operador ⇒ stock" depende do papel **na conta corrente** (`auth/getCurrentRole` / `accounts` do usuário). Resolver no boot do dashboard (App.vue) e **reagir** a troca de conta.
- **Anti-flash:** persistir a superfície resolvida em `localStorage` (espelhando o padrão do `color_scheme`). Um script de boot síncrono lê `localStorage` **antes do primeiro paint** e seta `data-surface` + ausência de `.dark` p/ o operador → sem piscar dark→light após o 1º login. (O `vueapp.html.erb` boota `.dark` p/ anti-flash do admin; o early-script corrige p/ stock quando a superfície persistida = stock.)

### 3.3 Escopo CSS (o "descolar")
Adicionar `:not([data-surface='stock'])` (ou ancestral `html:not([data-surface='stock'])`) a **todos** os blocos de chrome do host em `_chrome.scss`:
- bloco `:root:not([data-theme='white'])` (canvas dark)
- bloco `.dark:not([data-theme='white'])` (paridade dark)
- bloco `[data-theme='white']` (remap chrome do host p/ Paper) — suprimir p/ stock, deixando o host light de fábrica
- utilitários de marca (`.bg-n-brand` etc.)
- força de fonte (`html,body,button,…`)
- vidro/grain/elevação da sidebar + focus-ring
E em `_woot.scss:23-42`: escopar a força de Inter `!important` com `:not([data-surface='stock'])`.

**Inerte p/ stock (não mexer):** `_tokens.scss` (tokens `--alg-*` só afetam componentes nossos), `_components.scss` (`.alg-*` só usados por telas nossas; o operador stock não as renderiza, exceto CRM/Copiloto, que **queremos** com tokens Paper).

---

## 4. Streams (cada um = 1 PR focado, adversarial-reviewer + CI verde antes do merge)

### Stream 1 — Pele por papel (o coração)
- `data-surface` mechanism: resolução papel→superfície (App.vue), persistência localStorage, early-boot anti-FOUC.
- Escopar `_chrome.scss` + `_woot.scss` host-chrome a `:not([data-surface='stock'])`.
- **Aceite:** operador stock = fundo claro, fonte e azul de fábrica, sidebar sem vidro; admin **idêntico** a hoje (diff de render = 0). CRM/Copiloto renderizam claros/coerentes.
- **Testes:** unit da resolução de superfície; guarda de não-regressão do admin (snapshot/seletores intactos).

### Stream 2 — Menu enxuto, sem órfãos (`Sidebar.vue`)
- `isAdmin`-gate em: AlgorythmoInicio, os 8 setores, C-Levels, Marketplace, e os sub-itens de conversa "Operação ao Vivo" + "Caixa de Entrada".
- Garantir nenhum header órfão na visão do agente (INTELIGÊNCIA já é ungated p/ Copiloto — manter; conferir que não fica header vazio).
- **Aceite:** menu do agente = Contatos, Companies, Conversas (Canais/Times/Pastas/Etiquetas), CRM, Copiloto, Settings. Nada de admin visível.

### Stream 3 + 4 — Aterrissagem + travar rotas (PR de segurança/navegação)
- `routes/index.js`: não-admin aterrissa em `dashboard`.
- `algorythmo_brain_viewer` e `algorythmo_admin_inicio`: `meta.permissions` → `['administrator']` apenas.
- **Aceite:** agente logando cai nas conversas; URL direta de Brain/Início → redirect p/ dashboard.

### Stream 5 — Marca + QA visual
- Confirmar `AlgBrandLogo` (logo por-conta) aparece na sidebar stock do operador.
- **designer agent**: QA visual operador vs Chatwoot de fábrica (deve parecer stock, claro, com logo Modeloja).
- **/browse** logado como operador: conversas, contatos, CRM, Copiloto; e logado como admin: nada regrediu.

---

## 5. Riscos & mitigação
- **R1 — host light nunca exercitado neste fork** (sempre sobrescrito p/ dark). Mitig.: o light do host é upstream testado; QA visual + browser logado confirmam; telas do operador são puro upstream.
- **R2 — regressão silenciosa no admin** ao escopar CSS. Mitig.: usar `:not([data-surface='stock'])` (ausência de atributo = comportamento atual); teste de não-regressão; QA admin no Stream 5.
- **R3 — FOUC dark→light no 1º load do operador** (antes do localStorage existir). Mitig.: early-boot lê localStorage; 1º login pode piscar 1x; aceitável v1, refino se o founder notar.
- **R4 — CRM/Copiloto destoando** (claros porém com identidade nossa dentro do stock claro). Decisão de produto já tomada: são adições nossas; designer ajusta coerência no Stream 5.

## 6. Fora de escopo
- Mexer no engine CRM/Copiloto (lógica), na tela de admin, no go-live do Brain/sidekiq (já no ar).
- Mudança de schema upstream.
- Criação da conta da operadora (setup que o founder roda no container; comando entregue à parte).

## 7. Setup da conta operadora (entregue ao founder, fora do código)
- Criar usuário `agent` na conta 2: e-mail `sitemodeloja@gmail.com`, nome `<a confirmar>`, senha `Novamodeloja@10` (atende política: maiúscula + especial). Runner defensivo (memória `feedback-chatwoot-password-policy-runner`).
