# Plano 0008 — Implementação do Cinematic OS v2 (camada de design sobre a estrutura)

**Status:** DRAFT — aguarda founder travar sequência (decisão D-SEQ abaixo).
**Data:** 2026-05-28
**Owner:** Gustavo (founder/CEO) + designer agent + engineer agent.
**Linhagem:** implementa `engines/algorythmo/DESIGN.md` (Cinematic OS v2, aprovado doc-only no PR #83) sobre a estrutura entregue na Rodada 2 (plano 0007 — 8 setores no SectorShellV2). Sucede as "pendências futuras" carimbadas no fim do 0007.
**Escopo:** **frontend somente.** Transformar o app de "Chatwoot reorganizado" em "Algorythmo OS cinematográfico". NÃO é nova feature de produto — é a aplicação da identidade visual.

---

## 0. Diagnóstico (por que ainda parece Chatwoot)

O app rodando tem os tokens `--alg-*` disponíveis e usa `.alg-*` em telas isoladas (setores), MAS:
- O **tema dark-first nunca foi aplicado globalmente** — `:root` ainda usa as variáveis de tema do Chatwoot (claro). O login, a topbar, as conversas, tudo renderiza no tema Chatwoot.
- O **azul Chatwoot `#1F93FF`** vive no chrome (botões, links, login).
- O **logo Chatwoot** aparece no login/favicon.
- Os **5 componentes identitários** (Sunburst Orb, Aurora Orb, Planet Avatars, Inline Semantic Atoms, Hero Cinematography) **não existem como código** — só como spec.
- O Cinematic v1 que foi mergeado (#82) era **white model** e foi **reprovado** pelo founder.

**A transformação acontece em camadas, da fundação ao polish.**

---

## 1. Dependências de curadoria humana (§15 do DESIGN.md) — honestas e bloqueantes

Três coisas exigem entrega de designer/brand humano. **Não bloqueiam começar** — placeholders programáticos seguram o interim — mas a fidelidade "final" depende delas:

| Dependência | Bloqueia | Interim |
|---|---|---|
| **Fontes** Geist / Geist Mono / Söhne (self-host @font-face) | Tipografia editorial "final" | Inter (já self-hosted) cobre — fica 90% lá |
| **Library de planetas** (12-16 SVGs curados) | Planet Avatars "final" | Placeholder programático (SVG gradient + noise por hash do nome) |
| **Hero photography** (6-10 fotos Iceland/Patagonia 2x) | Hero Cinematography "final" | Placeholder (gradient escuro + grain, ou 1-2 fotos livres de stock CC0 enquanto isso) |

Founder decide depois se contrata o brand designer pra esses 3, ou se aceita os placeholders como suficientes pro lançamento.

---

## 2. Decisão a travar (D-SEQ) — por onde começar

Duas estratégias de primeira entrega. Mudam o que o founder vê primeiro:

- **A) Fundação primeiro (transformação ampla):** o app INTEIRO vira dark-first e perde a cara de Chatwoot (azul/logo/fonte) numa passada. Menos "uau" numa tela só, mas tudo muda de uma vez — login, setores, conversas, chrome. É a base que faz todo o resto ler cinematográfico.
- **B) Showpiece primeiro (uau imediato):** uma tela hero completa (Login com Sunburst Orb + hero photography + glass frame) entregue ponta a ponta primeiro — impacto visual máximo numa tela, mas o resto do app continua Chatwoot até as próximas entregas.

Recomendação: **A (fundação primeiro)**. Sem o tema global dark, qualquer showpiece fica ilhado num mar de azul Chatwoot. A fundação destrava a percepção em todas as telas de uma vez.

---

## 3. Sequência de milestones (cada um = 1 PR encadeado, loop CI + adversarial + design-review)

| MS | Escopo | Entrega |
|---|---|---|
| **C1 — Fundação dark + purga Chatwoot** | Aplicar tokens Cinematic OS no tema GLOBAL (`:root`/`html`), sobrescrever as variáveis de tema do Chatwoot pro dark-first. Matar o azul `#1F93FF` no chrome (→ brand cyan-teal). Trocar Lato/Open Sans → Inter/Geist. Glass real + grain + elevação nos containers de chrome. §13 audit pass inicial. | `feat(C1): Cinematic OS dark global theme + Chatwoot purge` |
| **C2 — Login premium + white-label** | Tela de login refundada: densidade hero (96px), Sunburst Orb (placeholder→SVG), hero photography (placeholder), logo Algorythmo (white-label), glass canvas frame. Favicon + título. | `feat(C2): login premium + white-label + hero density` |
| **C3 — Componentes identitários (Vue)** | `AlgSunburstOrb.vue` + `AlgAuroraOrb.vue` (+ conduits) + Planet Avatars (placeholder programático por hash) + ambient motion (sinusoidal, reduced-motion). Storybook-style demos. | `feat(C3): signature components — Sunburst, Aurora, Planet Avatars` |
| **C4 — Setores cinematográficos** | Aplicar densidade/glass/componentes novos nos 8 Overviews + chat do agente (Planet Avatar no `.alg-agent`). Empty states identitários. | `feat(C4): sector screens — cinematic density + planet agents` |
| **C5 — Brain/Knowledge hub** | A tela da Ref 2: Aurora Orb central + conduits + cards de glass com numerais. (Depende de C3.) | `feat(C5): Knowledge hub — Aurora Orb + conduits` |
| **C6 — CRM kanban** | Estrutura da Ref CRM com cromia de coluna ATENUADA (não saturada), cards, drag/drop, LeadAgingChip, a11y §7.4. | `feat(C6): CRM kanban — attenuated semantic columns` |
| **C7 — Polish + glass/motion sweep** | Modais/drawers/menus/toasts em glass-hard/medium + grain. Motion ambient em todo lugar. Sweep final §13. Inline Semantic Atoms (se Agent Studio entrar no escopo). | `feat(C7): glass + motion polish sweep + §13 audit` |

**Gate por PR:** CI (lint/Vitest/RSpec/Playwright+axe WCAG AA) + adversarial-reviewer (Opus) + **/design-review** (olho de designer — obrigatório dado o histórico do v1 reprovado). Founder aprova visualmente C1 e C2 antes de seguir (são os que definem o tom).

---

## 4. Restrições

- **Frontend somente.** Zero migration/controller/job.
- **Soft-fork zone:** tocar tema global do Chatwoot exige cuidado — marcar `// algorythmo:` em tudo, respeitar o soft-fork integrity check do CI.
- **Forward-only** (DESIGN.md §12): sem toggle de visual register. Dark é o default. White model fica como issue separada.
- **WCAG AA** non-negotiable (axe-core no CI).
- Conventional commits (`feat:`/`fix:`/`chore:` — nunca `design:`).
- Reduced-motion respeitado em todo ambient motion.

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Tema global dark quebra telas Chatwoot upstream não auditadas (legibilidade, contraste) | C1 roda /design-review + QA visual em browser real nas telas principais antes de merge. Cut-flag de emergência se regredir feio. |
| Reprovação visual do founder (como o v1) | C1 e C2 passam por aprovação visual explícita do founder ANTES de C3+. Não shipa em massa sem o tom aprovado. |
| Placeholders de planeta/hero parecerem "incompletos" | Comunicado: são interim até curadoria humana (§1). Placeholder programático com qualidade decente, não vazio. |
| Sweep global de azul Chatwoot deixar resíduo | §13 é checklist permanente; cada PR re-audita. C1 faz a primeira passada ampla, C7 fecha. |

---

## 6. Critério de pronto do programa

Founder abre o app no monitor 27": **login cinematográfico** (Sunburst + hero + glass), **app inteiro dark editorial** (zero azul Chatwoot, zero Lato), **setores com densidade e glass corretos**, **agentes com Planet Avatars**, **Brain hub com Aurora Orb vivo**, **CRM kanban atenuado**. O teste do §1 do DESIGN.md: "isto é o software mais bem-feito que eu já vi."

---

*Fim do plano. Cada milestone vira 1 PR via designer + engineer agents, com design-review obrigatório.*
