# Cinematic OS v1 — Follow-ups diferidos

Itens identificados nos reviews (adversarial + design + QA) do PR #82 que foram
conscientemente adiados. Cada item tem um dono lógico (design ou eng) e uma
nota de produto explicando o impacto real.

---

## Modelo White — botão de ativação ausente

**O que é:** O sistema tem uma segunda identidade visual (fundo branco,
tipografia editorial estilo Aesop/Field Mag). Os tokens e os valores de cor
estão prontos, mas não há nenhuma forma de o founder ativar essa variante — o
toggle não foi construído.

**Impacto:** Nenhum agora. A variante dark é o padrão e funciona. Quando
quisermos oferecer a opção paper/editorial será necessário construir o toggle
de interface e validar os componentes nesse modo.

**Próximo passo:** Marcado como `TODO(white-model-toggle)` no bloco de tokens.
Virar issue quando o White model entrar na roadmap.

---

## Título do modal pequeno demais

**O que é:** O cabeçalho dos modais usa 18px (token `--alg-text-lg`). O padrão
do sistema para superfícies elevadas é 24px. Está abaixo do peso editorial
esperado.

**Impacto:** Visual subótimo em diálogos de confirmação e formulários modais.
Não quebra funcionalidade.

**Próximo passo:** Alterar `.alg-modal__title` para `var(--alg-text-xl)` (24px)
e revisar os modais existentes para confirmar que o espaço comporta o tamanho.

---

## Tema light legado (`[data-theme='light']`)

**O que é:** Existe um bloco `[data-theme='light']` no arquivo de tokens que
é o fallback do v0. Não está em uso no produto mas ocupa espaço e pode confundir.

**Impacto:** Nenhum em runtime. Ruído no código.

**Próximo passo:** Remover quando confirmarmos que nenhum consumer downstream
(configuração de usuário, preferência salva) ainda referencia `data-theme=light`.

---

## Alias de radius redundante (`--alg-radius-xl`)

**O que é:** `--alg-radius-xl` e `--alg-radius-lg` têm o mesmo valor (16px).
O alias existe por compatibilidade com v0 mas engana — parece ser um tamanho
maior.

**Impacto:** Nenhum visual. Risco de novo código usar `xl` esperando um valor
maior e ficar surpreso.

**Próximo passo:** Deprecar `--alg-radius-xl` com comentário `// v0 alias —
prefer --alg-radius-lg` e remover em uma passada de limpeza futura.

---

## CSS `relative color` sem fallback

**O que é:** O botão de perigo usa `oklch(from var(--alg-color-danger) calc(l + 0.05) c h)`
para computar o hover — sintaxe CSS Relative Color, suporte ~92% dos browsers
em 2026 mas ausente em Firefox ESR 115 e alguns WebViews antigos.

**Impacto:** No Firefox ESR o hover do botão de perigo fica sem cor de destaque.
Não quebra, só não tem feedback de hover.

**Próximo passo:** Adicionar fallback explícito antes da linha oklch-relative.

---

## Fonte Geist não self-hosted

**O que é:** Os tokens referenciam Geist e Geist Mono como primeiros da pilha
tipográfica, mas elas não estão self-hosted no projeto — carregam via fallback
para Inter/JetBrains Mono.

**Impacto:** A identidade tipográfica do Cinematic OS não está completa. Inter
funciona bem, mas Geist tem numerais mais precisos para KPIs.

**Próximo passo:** Handoff para designer humano providenciar os arquivos
`@font-face`. TODO marcado em `_tokens.scss §12`.

---

## Monograma da Manu com traço fino demais

**O que é:** O SVG do monograma da agente Manu no painel de chat usa
`stroke-width: 1px`. Em telas de alta densidade (OLED, Retina 3x) fica
quase invisível em contraste com o glass da superfície.

**Impacto:** Identidade visual da agente enfraquecida em displays premium.

**Próximo passo:** Aumentar para `stroke-width: 1.5px` e testar em 1x, 2x e 3x.

---

## Polish visual (lista consolidada)

Achados menores que não justificam um commit individual mas devem ser
resolvidos antes do GA:

- `.alg-agent__status-dot` usa `--alg-fg-quaternary` em tamanho 6px — abaixo
  do mínimo de contraste para elementos tão pequenos. Considerar cor brand ou
  success dependendo do estado.
- Altura mínima do `.alg-skeleton--card` (6.5rem) não corresponde à altura
  real dos cards de KPI que carrega. Ajustar para refletir o conteúdo real.
- `.alg-toast` não tem `role="status"` ou `aria-live` nos elementos de texto —
  necessário para screen readers anunciarem as notificações.
- `.alg-menu__item` com `width: calc(100% - var(--alg-space-2))` + `margin`
  lateral cria um alinhamento visual inconsistente com o padding interno.
  Simplificar para `width: 100%` com `padding` lateral.
- `alg-modal-in` keyframe usa `translateY(12px) scale(0.96)` — consistente com
  o resto do sistema, mas poderia ser um token de spring quando a lib de motion
  ambient for adicionada.
- Drawer sem `aria-modal="true"` e sem focus trap implementado no componente
  `AlgDrawer.vue`.

---

*Criado em: 2026-05-28. Revisitar antes do GA do Cinematic OS v1.*
