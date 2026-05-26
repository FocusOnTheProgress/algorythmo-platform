# ADR-0014 — Dream Cycle gate (dedup ON, external OFF até M5)

**Status:** Aceita  
**Data:** 2026-05-26  
**Decisor:** Gustavo (founder/CEO Algorythmo)  
**Depende de:** [ADR-0013](0013-gbrain-sha-pin-and-bump-cadence.md)  
**PR:** M3-1 (gate)

## Contexto

GBrain expõe um "Dream Cycle" — processo assíncrono de manutenção do knowledge graph que roda crons configuráveis. As capacidades disponíveis incluem:

- `auto_link: on/off` — extração automática de referências de entidades e edges entre páginas. Zero custo LLM, opera sobre texto local.
- `dedup_entities: on/off` — fusão de entidades duplicadas (mesma pessoa/empresa em páginas diferentes). Normalização sem chamadas externas.
- `enrich_external: on/off` — enriquecimento via fontes externas (lookup de empresa, Linkedin, CNPJ, etc.).
- `fix_citations_external: on/off` — correção de citações via fontes externas.
- `score_salience_external: on/off` — pontuação de relevância via LLM ou API externa.

O M3 é dogfooding interno Day-1 com dados sensíveis da Algorythmo (pricing, objections, políticas). Qualquer toggle `*_external` envia dados do Brain para serviços de terceiros. O founder definiu como hard line: **enriquecimento externo é M5**.

## Decisão

O arquivo `engines/algorythmo/config/gbrain_dream_cycle.yml` (versionado, imutável durante M3) define:

```yaml
# Dream Cycle toggles — Algorythmo OS M3 (Day-1 dogfooding)
# Gate: external toggles OFF until M5. Spec validates no *_external key is truthy.
auto_link: "on"
dedup_entities: "on"

enrich_external: "off"
fix_citations_external: "off"
score_salience_external: "off"
```

**Regra de gate:** nenhuma chave que case com o padrão `/_external$/` pode estar em estado truthy. Spec `gbrain_dream_cycle_spec.rb` (T2 / PR M3-2) valida isso na CI.

**Flip para `enrich_external: on`** requer:
1. ADR adendo que revoga esta decisão.
2. Privacy review para dados enviados ao provider externo.
3. BYOK configurado para o embedding/LLM externo do tenant.
4. Aprovação explícita do founder (a decisão não é delegável ao engineer).

## Consequências

- **Positivo:** Brain indexa e dedup entidades localmente sem custo externo ou vazamento de dados. `auto_link` garante que o knowledge graph cresce organicamente a cada ingestion.
- **Negativo:** sem `enrich_external`, entidades com nomes inconsistentes nos ajustes (ex.: "João" vs "João Silva") podem não ser fundidas automaticamente. Mitigação: founder pode colar nomes canônicos nos ajustes.
- **Risco aceito:** o M3 entrega Brain funcional com dedup local. Se o knowledge graph ficar anêmico sem enriquecimento, o diagnóstico virá via D5 (snapshot diff semanal) antes de M5.

## Multi-tenant — appendix

Multi-tenant infra (brain-per-account via `GBRAIN_DATABASE_URL`) é tratada em ADR-0015. Este ADR cobre exclusivamente o gate de Dream Cycle.

## Histórico de revisão

- v5.0 (2026-05-25): appendix filesystem isolation removida (substituída por ADR-0015 dedicado). Body restrito a dream cycle gate.
- v4.0 (2026-05-25): reescrita após premise audit — `--dir` flag removido (não existe upstream). Filesystem isolation movida para appendix.
- v3.0 (2026-05-25): versão original com filesystem isolation.
