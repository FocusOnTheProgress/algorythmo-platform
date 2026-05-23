# Workflows desabilitados

Workflows herdados do Chatwoot upstream que NÃO se aplicam ao fork da Algorythmo. Ficam aqui (em vez de deletados) pra:

1. **Preservar histórico de upstream** — sync mensal (ADR-0001) pode trazer atualizações nesses arquivos. Mantê-los facilita o diff.
2. **Documentar a decisão** — engenheiro futuro entende por que cada um foi tirado.
3. **Reativação fácil** — basta `git mv` de volta pra `.github/workflows/` se um dia fizer sentido.

GitHub Actions só executa arquivos `.yml` dentro de `.github/workflows/` na raiz. Subpasta `disabled/` é ignorada — convenção padrão pra desabilitar sem deletar.

## Lista

| Workflow | Por que desabilitado |
|---|---|
| `deploy_check.yml` | Checa Heroku review app em `chatwoot-pr-N.herokuapp.com`. Infraestrutura do upstream. |
| `ghsa-linear-sync.yml` | Sync de advisories com Linear do Chatwoot. Secrets que não temos. |
| `logging_percentage_check.yml` | Força ≥5% de linhas `Rails.logger` em arquivos `.rb` modificados. Regra cultural do upstream — pode ser reativada se concordarmos. |
| `nightly_installer.yml` | Roda diário baixando `get.chatwoot.app/linux/install.sh`. Instalador do upstream. |
| `publish_codespace_image.yml` | Publica imagem em `ghcr.io/chatwoot/chatwoot_codespace`. Registry do upstream. |
| `publish_ee_docker.yml` | Publica `chatwoot/chatwoot` (Enterprise) no Docker Hub do upstream. |
| `publish_foss_docker.yml` | Publica `chatwoot/chatwoot:*-ce` (Community) no Docker Hub do upstream. |
| `run_mfa_spec.yml` | Suíte de MFA do upstream (~10 min por PR). MFA não faz parte do MVP Algorythmo OS. Reativar quando MFA entrar no escopo. |
| `test_docker_build.yml` | Build de imagem Docker em duas arquiteturas (`amd64` + `arm64` via QEMU, 20–40 min). Não temos pipeline de release Docker próprio ainda (ADR-0006). Reativar junto com o publish-* da Algorythmo. |
| `size-limit.yml` | Bundle-size gate do upstream. Compila assets em `production`, ~5–10 min. Sem orçamento de tamanho definido pela Algorythmo; reativar quando tivermos meta de bundle. |
| `frontend-fe.yml` | Duplica `lint-frontend` + `frontend-tests` do `run_foss_spec.yml`. Manter um único pipeline de frontend evita dobrar consumo de minutos. |

## Decisão de free tier (2026-05-22)

Para o MVP em fork privado mantemos os workflows acima desativados e o
`run_foss_spec.yml` escopado **apenas** ao código Algorythmo (engine specs
+ Captain feature-gate specs + vitest dos arquivos Algorythmo). Isso é o
suficiente para gatear PRs sem estourar os 2 000 min/mês do plano free.
Quando migrarmos para uma org paga (ou self-hosted runners), reativar os
workflows acima caso a caso.

## Quando revisitar

- **Quando definirmos pipeline de release próprio:** os 3 publish-* devem ser substituídos por workflows da Algorythmo (publicar no nosso registry, com nossa tag, em formato compatível com hosting Algorythmo padrão — ADR-0006).
- **Quando o sync mensal tocar nesses arquivos:** comparar diff upstream, decidir se vale puxar a mudança ou ignorar.
- **Se logging discipline for adotada:** reativar `logging_percentage_check.yml`.
