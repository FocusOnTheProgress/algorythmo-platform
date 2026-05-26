# ADR-0013 — GBrain como motor do Brain Algorythmo OS (SHA pin + bi-semanal + hotfix lane)

**Status:** Aceita  
**Data:** 2026-05-26  
**Decisor:** Gustavo (founder/CEO Algorythmo)  
**Depende de:** [ADR-0011](0011-sequencia-mvp-crm-brain-agentes.md)  
**PR:** M3-1 (gate)

## Contexto

O M3 adota GBrain (garrytan/gbrain, MIT, ~18.9k stars) como motor do Brain Algorythmo OS em vez de construir retrieval, knowledge graph, dream cycle e MCP do zero. GBrain é upstream ativo em desenvolvimento: o changelog mostra v0.36.0 → v0.36.6.0 entre 17-19 May 2026 (6 patches em 3 dias). Depender de uma referência mutável (tag móvel, branch) quebraria o ambiente em builds subsequentes sem aviso.

O repositório upstream (`garrytan/gbrain`) **não publica release tags semânticos**. A única referência imutável disponível é o **commit SHA de 40 caracteres**.

## Decisão

1. **Pin via commit SHA de 40 chars.** O manifesto referencia `garrytan/gbrain` pelo SHA exato do commit testado. Nenhuma tag ou branch range.

2. **Cadência de bump bi-semanal.** Segunda-feira da semana ímpar ISO (ex.: semanas 1, 3, 5...). Alinhado ao ritual de `D1 sync upstream Chatwoot` já estabelecido — um único momento cognitivo quinzenal cobre tanto o upstream do fork quanto o GBrain.

3. **Hotfix lane desacoplado.** CVEs, regressões críticas ou breaking change confirmada não esperam a janela bi-semanal. Engineer abre PR de bump emergencial com label `hotfix/gbrain` a qualquer momento.

4. **Allowed drift checks** (executados a cada bump, automatizados em PR M3-1.5):
   - Embedding provider default flip (ex.: v0.36.2.0 flipped para ZeroEntropy)
   - CLI flag adicionado ou removido (ex.: `gbrain capture` flags)
   - MCP transport change (stdio → HTTP default flip)
   - Migration schema necessária (novo campo em `~/.gbrain/config.json` ou DB)
   - Skillpack install/uninstall removido (v0.36.0 dropped)

5. **Política breaking change.** Hold de 1 janela bi-semanal (≈2 semanas) para breaking changes não-urgentes, dando tempo para adaptar `Brain::Client`. Hotfix always available.

6. **Defer permanente pro upstream.** Brain storage, Postgres layout, ingestion granularity, dream cycle internals, mecanismo multi-tenant (brain-per-account via `GBRAIN_DATABASE_URL` — ADR-0014). `feedback_architecture_defer_upstream.md` governa.

## Manifesto (Day-0 — engineer preenche SHA antes do merge)

GBrain é um CLI Node.js gerenciado via `bun`. O pin fica em `package.json` do projeto:

```json
{
  "dependencies": {
    "gbrain": "garrytan/gbrain#<sha40>"
  }
}
```

O SHA de 40 chars é preenchido no PR M3-1 após o engineer validar a versão localmente (Day-0 spike).

> **Nota Day-0:** SHA placeholder `<SHA_TO_BE_PINNED_DAY0>` é substituído pelo engineer antes do merge, após confirmar que `gbrain capture` funciona localmente com `nomic-embed-text` (smoke Ollama — PR M3-2).

## Consequências

- **Positivo:** builds reproduzíveis; breaking changes detectadas em bumps controlados; hotfix lane mantém agilidade em emergências.
- **Negativo:** bump bi-semanal é overhead real (~30min por ciclo de validação). Mitigação: PR M3-1.5 automatiza os drift checks na CI nightly.
- **Risco aceito:** entre bumps, CVEs no GBrain não corrigidas ficam no código. Mitigação: hotfix lane + CI nightly no SHA pinado detecta regressões antes do bump promover.

## Histórico de revisão

- v5.0 (2026-05-25): SHA pin substituiu "tag exata" (upstream não tem release tags — fato confirmado por codex review v1 P1 #16). Cadência mensal → bi-semanal (codex v1 P1 #17 — upstream patches em dias). Hotfix lane adicionada (codex v1 P2 #19). Allowed drift checks explicitados (codex v1 P2 #20).
