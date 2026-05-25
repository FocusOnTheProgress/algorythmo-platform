# M1-C — Manual de operação

Marco M1-C: leads reais ligados a conversations. Backend disparado via
`CrmListener` (auto-create no `conversation.created`, stage transitions
no `conversation.updated/resolved`, owner assignment no primeiro outbound
humano, stage_history persistida).

Esse doc cobre dois cenários operacionais que o founder vai exercer
manualmente:

1. **Smoke checklist** — caminho feliz fim-a-fim, do widget até o card no
   Kanban e a aba "Histórico" do drawer.
2. **Cleanup de leads legados** — rake que apaga leads criados antes do
   `CrmListener` estar wired (legado da fase de scaffolding). Protegido
   por **gate duplo** em produção.

---

## 1. Smoke checklist (§9.3)

Pré-requisito: flag `algorythmo_cut_crm` ligada para a conta de teste.
Duas formas:

**Via super-admin UI** (recomendado em produção): logar como super-admin
e abrir `/super_admin/accounts/1/algorythmo_flags`, marcar **crm** e
salvar.

**Via console** (dev / staging):

```bash
bundle exec rails runner "a = Account.find(1); a.algorythmo_cut_crm = true; a.save!"
```

A flag é cacheada por 30s (`Algorythmo::FeatureGate`); o smoke pode rodar
imediatamente — a primeira request invalida o cache.

Passos:

1. **Abrir o widget** da conta de teste (`/widget?website_token=...`).
2. **Enviar uma mensagem** como visitante. Resultado esperado:
   - Card novo aparece na coluna **Novo** do `/crm`.
   - `lead.channel_origin = "widget"`, `lead.last_message_at` populado.
   - `lead.owner` ainda `null` (nenhum agente humano respondeu).
3. **Responder do dashboard** como agente humano (primeira mensagem
   outbound, não-bot). Resultado esperado:
   - Drawer do lead mostra **nome do agente** no campo `Dono`.
   - Banco: `lead.owner_id` = id do agente.
4. **Arrastar o card** de **Novo** → **Qualificado**. Resultado esperado:
   - Card aparece na nova coluna.
   - Aba **Histórico** do drawer lista a transição (entrada nova no
     topo, formato "Sistema → Qualificado" com timestamp).
   - *Verificação alternativa enquanto o drawer (PR 4) não estiver no
     ar:* via console, `Algorythmo::StageHistory.where(lead_id: <id>)
     .order(created_at: :desc).first` deve retornar uma linha com
     `to_stage_id = 2` (Qualificado).
5. **Enviar uma segunda mensagem** pelo widget. Resultado esperado:
   - `lead.last_message_at` atualiza.
   - **Nenhum lead novo é criado** (idempotência por conversation).
6. **Marcar a conversa como resolvida** no dashboard. Resultado esperado:
   - Card move para **Fechado ganho** (ou **Fechado perdido**, conforme
     a opção escolhida no resolve modal).
   - Botão **"Reabrir como novo lead"** aparece no drawer.

Se qualquer passo falhar, parar o smoke e checar:
- Logs do worker Sidekiq (job de listener pode estar com retry).
- `Algorythmo::StageHistory.where(lead_id: <id>)` deve ter pelo menos
  uma entrada para cada transição observada.

---

## 2. Cleanup de leads legados

### Quando rodar

Apenas uma vez por ambiente, na janela entre o deploy do listener e o
fim do dia 1 de operação. Apaga leads criados pelo scaffolding antes
do `CrmListener` estar wired. Assinatura do legado:

```
channel_origin IS NULL OR channel_origin = ''
AND last_message_at IS NULL
```

(O listener sempre popula ambos os campos; qualquer lead sem os dois
nunca passou pelo listener.)

O cascade `on_delete: :cascade` em `stage_histories.lead_id` garante
que histórico legado some junto. Sem risco de órfãos.

### Em dev / teste

Sem gates. Roda direto:

```bash
bundle exec rake algorythmo:crm:cleanup_legacy_leads
```

Saída esperada:

```
[cleanup_legacy_leads] removed 7 legacy lead(s). Audit log: /app/tmp/cleanup_legacy_leads_1716580000_42.log
```

Re-rodar é seguro: a segunda chamada deleta `0` leads (idempotente) e
ainda assim grava um log de auditoria para rastreabilidade.

### Em produção, staging, ou qualquer env != dev/test — gate duplo

A ausência de gate é **allowlist** (`development`, `test`), não negação
de produção. Qualquer outro env (`production`, `staging`, `qa`, `demo`
ou um ambiente misconfigurado) cai no gate duplo. Operação destrutiva
opta OUT de safety, não IN.

Falha qualquer trava → `abort` antes de tocar no banco.

**Trava 1 — flag `--force` na linha de comando:**

```bash
bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force
```

(Atenção ao `--` que separa argumentos do rake.)

**Trava 2 — variável de ambiente confirmação:**

```bash
export ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW
bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force
```

Faltando qualquer uma, o rake aborta com mensagem explícita:

```
[cleanup_legacy_leads] ABORT: Refusing to run in production without --force flag. ...
```

ou

```
[cleanup_legacy_leads] ABORT: Refusing to run in production without ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW.
```

### Simulando produção localmente

Para validar o gate antes do deploy real:

```bash
RAILS_ENV=production bundle exec rake algorythmo:crm:cleanup_legacy_leads
# → aborta por falta de --force

RAILS_ENV=production bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force
# → aborta por falta de ALGORYTHMO_CLEANUP_CONFIRM

RAILS_ENV=production ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW \
  bundle exec rake algorythmo:crm:cleanup_legacy_leads -- --force
# → executa
```

### Audit log

Toda execução que passa pelos gates grava um log em:

```
tmp/cleanup_legacy_leads_<unix_timestamp>_<pid>.log
```

Conteúdo:

```
--- algorythmo:crm:cleanup_legacy_leads ---
started_utc=2026-05-24T20:13:20Z
env=production
force_flag=true
confirm_env_present=true
scanned_count=7
scanned_ids=[12, 13, 17, 22, 23, 24, 25]
severed_chain_count=1
severed_chains=[[42, 17]]
deleted_count=7
completed_utc=2026-05-24T20:13:20Z
```

`severed_chains` lista pares `[reopened_lead_id, legacy_lead_id]` cujo
`previous_lead_id` foi nullificado pelo FK ao apagar o legacy. Vazio no
caso normal — se aparecer, é sinal de que um lead reaberto tinha
pointer pro legado e perdeu rastreabilidade da cadeia.

Em produção, copiar esse arquivo para fora do container imediatamente
após a execução (`docker cp`). As linhas deletadas são definitivas; o
audit log é o único registro.
