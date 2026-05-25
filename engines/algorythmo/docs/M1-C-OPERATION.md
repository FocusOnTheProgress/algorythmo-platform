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

Pré-requisito: flag `algorythmo_crm` ligada para a conta de teste:

```bash
bundle exec rails algorythmo:seed:enable_crm ACCOUNT_ID=1
```

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

### Em dev / staging / teste

Sem gates. Roda direto:

```bash
bundle exec rake algorythmo:crm:cleanup_legacy_leads
```

Saída esperada:

```
[cleanup_legacy_leads] removed 7 legacy lead(s). Audit log: /app/tmp/cleanup_legacy_leads_1716580000.log
```

Re-rodar é seguro: a segunda chamada deleta `0` leads (idempotente) e
ainda assim grava um log de auditoria para rastreabilidade.

### Em produção — gate duplo

Em `Rails.env.production?` o rake exige **as duas** travas
simultaneamente. Falha qualquer uma → `abort` antes de tocar no banco.

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
tmp/cleanup_legacy_leads_<unix_timestamp>.log
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
deleted_count=7
completed_utc=2026-05-24T20:13:20Z
```

Em produção, copiar esse arquivo para fora do container imediatamente
após a execução (`docker cp`). As linhas deletadas são definitivas; o
audit log é o único registro.
