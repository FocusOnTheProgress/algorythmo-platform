# Handoff — sessão 2026-05-28 → próxima sessão

## Estado do projeto

### Cinematic OS v1 — REPROVADO em review visual do founder

PR #82 mergeada em `algorythmo/main` (commit `89f591d4b`) — entregou glass real,
depth tokens, motion com curva Apple, tema dark-first com paridade WCAG AA.
Build deployado e validado live em produção.

**O founder olhou em produção e o resultado não passou.** Há uma segunda passada
de design pendente antes de qualquer trabalho de backend continuar.

Referências visuais que o founder coletou para essa segunda passada estão na
pasta local **`referências front end design/`** (5 jpegs, gitignored — material
de inspiração privado, não versionado).

### Decisão de bloqueio

> Front end não passou na avaliação. Mais alterações são necessárias antes de
> iniciar o backend.

Próxima sessão = nova rodada de design (planner + designer agents), implementação
em worktree, deploy, novo review do founder. Só após aprovação visual o backend
volta a entrar em escopo.

---

## Infraestrutura ops — pipeline novo, estabilizado

Aprendizado pago caro hoje: a VPS de 4 GB **não consegue completar `docker build`
localmente** mesmo com `BUNDLE_JOBS=1` + `NODE_OPTIONS=2048`. O grpc native
compile sozinho derruba o build, e antes disso `assets:precompile` consumia
demais. Build local foi abandonado.

**Pipeline atual (funcionando, validado em produção):**

```
push em algorythmo/main (paths filtrados)
  -> GitHub Actions (.github/workflows/docker-build-ghcr.yml)
     - runner ubuntu-latest, 7 GB RAM, ~25 min
     - publica ghcr.io/focusontheprogress/algorythmo-platform:latest
  -> Easypanel (manual deploy trigger)
     - apenas `docker pull` da imagem pronta, ~51 s
     - zero compile na VPS
```

**Custo:** free tier GH Actions 2 000 min/mes. Cada build ~30 min, cabem ~60
builds/mes. Bem dentro do orcamento.

**Trigger automático:** `push` em `algorythmo/main` quando muda código (paths
filtrados — docs/.md não disparam build). Para deploy: hoje é manual via
`services.app.deployService` no Easypanel. Pode virar webhook no futuro.

---

## Site produção

- URL: http://os-empresarial.76.13.169.249.sslip.io/
- Admin: `gustavob.inovacao@gmail.com`
- Workspace: `Algorythmo`

(Senha do admin trancada em memory do Claude / fora deste doc.)

### Lição operacional — políticas de senha do Chatwoot

O Chatwoot exige **pelo menos 1 maiúscula + 1 caractere especial** na senha.
Reset via Rails runner sem `begin/rescue` + `save!` causa container em
crashloop quando a senha viola a política (a exceção mata o `&&` e `rails s`
nunca roda). Padrão correto:

```ruby
(rails runner "begin; ...; u.save ? puts(OK) : puts(FAIL + errors); rescue => e; puts EXC; end" || true) && rails s ...
```

`save` sem bang + `|| true` no shell garantem que o container sempre boota.

---

## Commits desta sessão

- `89f591d4b` feat(design): cinematic OS v1 — glass, depth, motion (#82) — **REPROVADO**
- `8d7bc278b` chore(docker): lower bundle/node parallelism for 4GB VPS builds
- `00e9c5f85` ci: build docker image on GitHub Actions, push to ghcr.io

Mais este handoff + `.gitignore` para a pasta de referências.

---

## Como iniciar a próxima sessão

> Sessão anterior: Cinematic OS v1 foi shippado em produção mas reprovado em
> review visual. Referências do founder estão em `referências front end design/`
> (gitignored). Quero uma segunda passada de design — acionar planner agent
> primeiro (rodar `/office-hours` curto para entender o que especificamente
> não passou), depois `/plan-design-review`, depois designer agent em
> worktree. Implementar, deployar via GH Actions (que builda) + Easypanel
> (que faz pull), e me chamar para review visual antes de seguir para backend.
> Doc deste handoff: `docs/algorythmo/handoff-2026-05-28-cinematic-os-rejected.md`.

---

## Pendências de housekeeping operacional

- **Revogar Easypanel API key** `36542e0e...` (passada nesta sessão) — Settings
  → Users → API Keys no painel Easypanel
- **PAT do GitHub** `ghp_GlW...` está armazenado no Easypanel para pulls da
  imagem privada. Se revogar, próximo deploy precisa de novo PAT escopado em
  `read:packages`

---

*Criado em: 2026-05-28.*
