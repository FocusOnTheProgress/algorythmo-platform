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

## Quando revisitar

- **Quando definirmos pipeline de release próprio:** os 3 publish-* devem ser substituídos por workflows da Algorythmo (publicar no nosso registry, com nossa tag, em formato compatível com hosting Algorythmo padrão — ADR-0006).
- **Quando o sync mensal tocar nesses arquivos:** comparar diff upstream, decidir se vale puxar a mudança ou ignorar.
- **Se logging discipline for adotada:** reativar `logging_percentage_check.yml`.
