# Plano 0003 — M1-C — Leads reais ligados a conversations

**Status:** READY_FOR_DISPATCH (planner). Single contract para o `engineer` agent.
**Versão:** 1.1 (iteração pós adversarial review — 2026-05-24).
**Data inicial:** 2026-05-24
**Owner:** Gustavo (founder/CEO Algorythmo).
**Linhagem:** fecha §9/§10 do plano `0001-mvp-algorythmo-os.md`. Integra o que ficou em pé pós M1-A (`#36` + `#42`), M1-B (`#43`/`#44`/`#45`/`#47`/`#48`/`#49`/`#50`), M1-D (`#37`).

> **Boundary:** este documento é contrato. Toda decisão técnica está tomada. Ambiguidade volta pro `planner`, nunca pro founder. Decisões de produto **não decididas** estão isoladas em §11 (Questões abertas) — só elas viram pergunta humana.

---

## CHANGELOG

### v1.1 (2026-05-24) — Iteração pós adversarial review

Fixes aplicados após review adversarial verificada contra código real do Chatwoot:

- **§6.2 (owner setter)** — race condition real corrigida. Read-then-write substituído por `UPDATE ... WHERE owner_id IS NULL` atômico (first-writer-wins por DB, não last-writer-wins).
- **§6.3 (stage_history hook)** — afirmação factualmente errada sobre `ActiveSupport::CurrentAttributes` removida. Chatwoot usa `thread_mattr_accessor` em `lib/current.rb` (verificado), e `Current.agent_bot` **não existe**. AgentBot vem como `Current.user` (cf. `conversations_controller.rb:95` — `Current.user.is_a?(AgentBot)`). Discriminação reescrita via `case Current.user`.
- **§5.4 (novo) — Defesa ghost-history.** Lead bloqueia `stage_id_changed?` fora de `move_to_stage` via `before_update` guard. Stage só muda pelo método canônico.
- **§7.2 (lead_json)** — `time_in_stage` REMOVIDO do payload público de display. Front continua calculando a partir de `stage_entered_at` (auto-consistente, sem drift). `time_in_stage` vira dado de métrica/analytics e entra só em endpoints internos quando dashboard for desenhado (M3). Achado coerente com design review (chip aging por drift).
- **§7.1 (stage_history endpoint)** — cap 100 explícito via `{ stage_history: [...], truncated: true }`.
- **§8.1 (owner edge cases)** — caso de race reescrito pra refletir update atômico.
- **§8.2 (stage_history edge cases)** — caso novo: Sidekiq retry duplicado em reopen não cria StageHistory dupla (guard idempotente no Recorder).
- **§9.1 (specs)** — specs de concorrência marcadas explicitamente `use_transactional_tests = false` + skip se adapter ≠ PostgreSQL (advisory_lock/`update_all` race só faz sentido em PG).
- **§10.7 (CONTRACT bump procedure)** — referência a "Sessão A" removida (M1-C é single-engineer). Founder aprova o PR `[CONTRACT_BUMP]` antes do PR 3 abrir; sem dependência síncrona de outra sessão.
- **§5.2 (rake cleanup)** — duplo gate em prod: `--force` flag + env `ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW`. Audit log em `tmp/cleanup_legacy_leads_<timestamp>.log` com IDs antes de qualquer delete.
- **§5.3 (validação actor_id)** — `numericality: { greater_than: 0, allow_nil: true }` adicionado.
- **§8.4 (performance)** — esclarecido que `includes(:owner)` é +1 query independente do count, não +N.
- **§12 (riscos)** — adicionados R11 (`Current.user` stale em thread Sidekiq reused) e R12 (`stage_id` mudando fora de `move_to_stage`). Risco #2 (race owner setter) re-classificado como mitigado por DB.

Cosméticos não aplicados (rationale documentado em §15):
- Index `idx_stage_histories_stage_chrono` (M3) — mantido. Custo de 1 índice extra é desprezível em greenfield; criá-lo depois requer `algorithm: :concurrently` em prod e é mais caro de coordenar.
- Helper `actor_summary` documentado explicitamente em §7.1.

### v1.0 (2026-05-24) — Plano inicial

---

## 1. Em uma frase

Quando uma pessoa manda mensagem por qualquer canal conectado ao Algorythmo OS, ela aparece como Lead em "Novo" no Kanban — sozinha, sem clique, com a história dela registrada e com o vendedor que primeiro responder virando o dono. Esse é o marco M1-C.

## 2. Para o founder (linguagem de produto)

O que muda na operação:

- **O painel para de mentir.** Hoje o Kanban funciona, mas as colunas mostram cards de exemplo. Depois deste marco, cada card é uma pessoa real que mandou mensagem agora há pouco — WhatsApp, e-mail, Instagram, widget — e que tem uma conversa de verdade ligada a ela.
- **Vendedor que pega leva.** O primeiro humano da equipe que responder uma mensagem do lead vira o dono daquele card. Não precisa atribuir nem configurar nada. Manu respondendo não conta — ela não rouba a dona do lead.
- **O Kanban vira radar de gestão.** Cada movimentação de coluna fica gravada com data, hora e quem moveu (humano com nome, ou "Manu"). Em alguns meses, isso vira o dashboard que mostra onde o lead trava, em que etapa cada vendedor é melhor, e quanto tempo a operação leva pra fechar. M1-C não desenha o dashboard — só garante que a matéria-prima esteja sendo gravada do dia zero.
- **A casa fica limpa.** Hoje o ambiente de dev pode ter leads "fantasma" de seeds antigos sem dono e sem canal. O marco joga fora esses fantasmas e garante que daqui pra frente só nascem leads de verdade.
- **Risco controlado.** Tudo o que estamos ligando segue atrás do interruptor `algorythmo_crm`, que continua desligado por default. Quando a gente quiser ligar pra um cliente, é uma chave. Quando precisar desligar, é a mesma chave. Sem deploy, sem migração.

O que **não** muda neste marco (intencionalmente):

- Nada de buscar dados externos do lead (enriquecimento com IA, Clearbit, Apollo). Isso é o M5, separado.
- Nada de distribuição automática de lead (round-robin, regra por canal). Continua "quem pega leva".
- Nada de dashboard de métrica ainda. Só o lastro de dados que vai alimentar o dashboard depois.

---

## 3. Onde a gente está hoje (precisa ler antes de planejar o que falta)

**Backend M1-A está pronto e mergeado.** Não é o que o prompt assumia — não tem nada pra reconstruir.

Confirmado nos arquivos:

- `engines/algorythmo/db/migrate/20260523000001_create_crm_tables.rb` — `algorythmo_pipelines`, `algorythmo_stages`, `algorythmo_leads` criadas com os campos `channel_origin`, `channel_metadata`, `stage_entered_at`, `closed_at`, `last_message_at`, `previous_lead_id`, `deleted`. Três índices F8 corretos.
- `engines/algorythmo/app/listeners/algorythmo/crm_listener.rb` — `message_created` ativo, com filtro C1, advisory lock F2, debouncing C2 (janela 7d), cache F3, gate `algorythmo_crm`, captura de canal e metadata, rescue de exceções via `ChatwootExceptionTracker`.
- `engines/algorythmo/app/dispatchers/algorythmo/async_dispatcher.rb` — listener prependado ao `AsyncDispatcher` upstream via `super + [...]`.
- `engines/algorythmo/app/controllers/algorythmo/api/v1/leads_controller.rb` — index (cursor por stage_id ou contact_id), show, create, update, destroy soft, `PATCH /move`, `POST /reopen`, `GET /:id/conversations`. JSON já embute `contact: { id, name, email, phone_number, thumbnail }`.
- `engines/algorythmo/app/controllers/algorythmo/api/v1/pipelines_controller.rb` + `stages_controller.rb` — `pipelines/default`, `stages/:id` (aging_coefficient), `stages/:id/rename`.
- `engines/algorythmo/config/routes.rb` — todas as rotas acima registradas sob `/algorythmo/api/v1/accounts/:account_id`.

**Frontend M1-B está pronto e mergeado.** O Kanban **NÃO renderiza mock** — renderiza o que vem da API real.

Confirmado:

- `app/javascript/dashboard/routes/dashboard/crm/views/KanbanBoard.vue` usa `usePipelineStore` + `useLeadStore`.
- `app/javascript/dashboard/composables/algorythmo/useLeadStore.js` chama `fetchLeads` / `moveLead` / `reopenLead` de `dashboard/helper/algorythmo/leadApi.js`.
- `app/javascript/dashboard/helper/algorythmo/leadApi.js` faz axios contra `/algorythmo/api/v1/accounts/:id/leads`.
- PR #50 mergeou 39 testes Playwright **com `.skip()`** porque o contrato espera `algorythmo_crm` ligado E backend §9 live. Brief de Sessão D explicitamente registra: "remove `.skip()` da suite Playwright quando o flag `algorythmo_crm` ligar + backend §9 estiver live."

**Então o que falta?** A diferença entre o que o produto promete (ver §2) e o que o sistema entrega hoje é **estreita**:

| Promessa do produto | Estado atual | Lacuna real |
|---|---|---|
| Lead nasce automaticamente quando mensagem entra | Listener existe e está montado | Falta validação ponta-a-ponta + smoke E2E desligando o `.skip()` |
| Card mostra dono do lead | Campo `owner_id` não existe no schema | **M1-C** |
| Primeiro humano que responder vira dono | Listener não escuta `outgoing` ainda | **M1-C** |
| Histórico de transição de etapa preservado | Tabela não existe; `move_to_stage` só atualiza o lead | **M1-C** |
| Tempo nesta etapa visível no card | Frontend calcula localmente a partir de `stage_entered_at` | **Mantido como está** (decisão v1.1) — front calcula, é a fonte única de verdade; `time_in_stage` no JSON virou ferramenta de métrica futura (M3) |
| Ambiente sem leads fantasma de seed antigo | Seeders podem ter criado leads pré-listener | **M1-C** (rake de limpeza idempotente + duplo gate em prod) |
| Flag `algorythmo_crm` controla tudo | Listener + controllers + sidebar | Manter — sem rollback ad-hoc |

**Decorrência:** M1-C **não reescreve** o que já está em pé. Só adiciona 2 capacidades (ownership, stage_history) + closes manutenção (cleanup rake, un-skip da suite Playwright).

---

## 4. Escopo

### Dentro do escopo (M1-C)

1. **Ownership do lead (`owner_id`).** Campo nullable no `algorythmo_leads`. Setado automaticamente no primeiro `MessageCreated` outgoing onde `sender` é um `User` (humano). Manu não seta. Sem fila/round-robin. JSON do lead embute `owner: { id, name, thumbnail }`. **Setter usa `UPDATE ... WHERE owner_id IS NULL` atômico** — first-writer-wins por garantia de DB.
2. **Histórico de transições (`algorythmo_stage_histories`).** Nova tabela append-only. Cada transição (auto ou manual) grava `lead_id`, `from_stage_id` (nullable na criação), `to_stage_id`, `actor_type` (`user`, `system`, `agent_bot`), `actor_id` (nullable se system), `created_at`. Gravada por hook único no `Lead` (after_create + after_update_if_stage_changed). API expõe leitura. **`stage_id` só pode mudar via `Lead#move_to_stage`** — guard `before_update` no model bloqueia mudanças por outros paths (defesa ghost-history).
3. **Cleanup de leads órfãos.** Rake `algorythmo:crm:cleanup_legacy_leads` que apaga (hard delete) leads sem `channel_origin` E sem `last_message_at` (assinatura de seed pré-listener). Idempotente. **Duplo gate em prod**: `--force` flag + `ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW`. Audit log em `tmp/cleanup_legacy_leads_<timestamp>.log` antes de qualquer delete.
4. **Smoke E2E ponta-a-ponta.** Un-skip da suite Playwright criada em PR #50 (39 testes) **só** depois que (1)-(3) estiverem mergeados. Cenário canal-first novo: mensagem entra pelo widget → lead nasce em "Novo" em <10s no painel → humano responde → vira owner → arrasta pra "Qualificado" → stage_history mostra as 2 entradas.
5. **Documentação curta de operação.** README curto em `engines/algorythmo/docs/M1-C-OPERATION.md` cobrindo: como ligar a flag, como verificar listener ativo, como rodar rake de cleanup (com gate de prod), o que esperar em logs.

### Fora do escopo (não rola neste marco)

- **`time_in_stage` no payload público.** Decisão v1.1 — front calcula a partir de `stage_entered_at` (já presente). Dois timestamps no payload = duas fontes de verdade = drift. `time_in_stage` entra em endpoints internos de métrica quando dashboard for desenhado (M3).
- Enriquecimento de lead (qualquer chamada externa, IA, Clearbit). **M5**.
- Distribuição automática (round-robin, regra por canal, fila). **Pós-MVP**.
- Reatribuir owner manualmente via UI. Dado já existe; UI fica pra M2/M3.
- Dashboard de métrica em cima do `stage_history`. **M3** (analytics) — M1-C só garante o lastro.
- ActionCable / WebSocket pra push em tempo real. Polling 8s do frontend continua sendo a estratégia. Roadmap pós-M2.
- Soft-delete de `stage_history`. Append-only por contrato.
- Auditoria detalhada das ações de Manu no CRM (criar deal, mover pra Proposta com aprovação humana). **M4**.

---

## 5. Modelo de dados

### 5.1 Schema final (delta sobre M1-A)

```
┌───────────────────────────────┐
│ algorythmo_leads              │   (já existe — M1-A)
├───────────────────────────────┤
│ id                  bigint PK │
│ account_id          FK        │
│ contact_id          FK        │
│ stage_id            FK        │
│ position            float     │
│ stage_kind          int       │   (denormalizado, M1-A)
│ previous_lead_id    bigint    │
│ channel_origin      string    │
│ channel_metadata    jsonb     │
│ custom_fields       jsonb     │
│ stage_entered_at    timestamp │
│ closed_at           timestamp │
│ last_message_at     timestamp │
│ deleted             bool      │
│ owner_id            FK → users.id   ← NOVO (M1-C)
│ created_at, updated_at        │
└───────────────────────────────┘
              │ 1
              │
              │ N
┌─────────────▼─────────────────┐
│ algorythmo_stage_histories    │   ← NOVA (M1-C)
├───────────────────────────────┤
│ id                  bigint PK │
│ lead_id             FK        │
│ from_stage_id       FK NULL   │   (NULL quando é a criação)
│ to_stage_id         FK        │
│ actor_type          string    │   "user" | "system" | "agent_bot"
│ actor_id            bigint    │   user_id, agent_bot_id, ou NULL
│ created_at          timestamp │
└───────────────────────────────┘
```

### 5.2 Migrations (uma por PR — ver §10)

**Migration 1 — `add_owner_id_to_algorythmo_leads`**

```ruby
class AddOwnerIdToAlgorythmoLeads < ActiveRecord::Migration[7.1]
  def change
    add_reference :algorythmo_leads, :owner,
                  null: true,
                  foreign_key: { to_table: :users, on_delete: :nullify },
                  index: { name: 'idx_algorythmo_leads_on_owner_id' }
  end
end
```

- Nullable por contrato — lead não-respondido fica sem dono.
- `on_delete: :nullify`: se o user for apagado, o lead não some; vira "sem dono".
- Index simples (não composto) porque o filtro "leads do owner X" é o caso comum e nunca passa por stage_id.

**Migration 2 — `create_algorythmo_stage_histories`**

```ruby
class CreateAlgorythmoStageHistories < ActiveRecord::Migration[7.1]
  def change
    create_table :algorythmo_stage_histories do |t|
      t.references :lead, null: false,
                          foreign_key: { to_table: :algorythmo_leads, on_delete: :cascade },
                          index: false
      t.references :from_stage, null: true,
                                foreign_key: { to_table: :algorythmo_stages, on_delete: :nullify }
      t.references :to_stage, null: false,
                              foreign_key: { to_table: :algorythmo_stages, on_delete: :restrict }
      t.string  :actor_type, null: false   # "user" | "system" | "agent_bot"
      t.bigint  :actor_id,   null: true
      t.timestamp :created_at, null: false # append-only — sem updated_at
    end

    # Hot path: histórico de um lead específico, ordem cronológica.
    add_index :algorythmo_stage_histories, %i[lead_id created_at],
              name: 'idx_stage_histories_lead_chrono'

    # Dashboard futuro (M3): "transições por etapa por mês".
    # Mantido em greenfield: criar agora é grátis; criar depois exige
    # algorithm: :concurrently em prod.
    add_index :algorythmo_stage_histories, %i[to_stage_id created_at],
              name: 'idx_stage_histories_stage_chrono'
  end
end
```

- **Append-only.** Sem `updated_at`. Sem método `update` exposto no model.
- `from_stage_id` NULL quando o registro representa a criação do lead.
- `actor_type` é string, não enum Rails — agentes futuros (Manu suporte, Ana operações) não devem exigir nova migration. Validação por inclusion no model.
- `actor_id` nullable só quando `actor_type == 'system'` (validation no model).
- `on_delete: :cascade` no `lead_id`: se o lead for hard-deleted (raro, cleanup admin), o histórico vai junto. Soft delete (`leads.deleted = true`) não dispara cascade — histórico é preservado.
- `on_delete: :restrict` no `to_stage_id`: impede apagar um Stage que tem histórico apontando pra ele.

### 5.3 Validações (models)

`Algorythmo::Lead` ganha:
```ruby
belongs_to :owner, class_name: 'User', optional: true
has_many :stage_histories, class_name: 'Algorythmo::StageHistory',
                            inverse_of: :lead, dependent: :destroy
```

`Algorythmo::StageHistory` (novo):
```ruby
ACTOR_TYPES = %w[user system agent_bot].freeze

belongs_to :lead, class_name: 'Algorythmo::Lead'
belongs_to :from_stage, class_name: 'Algorythmo::Stage', optional: true
belongs_to :to_stage,   class_name: 'Algorythmo::Stage'

validates :actor_type, inclusion: { in: ACTOR_TYPES }
validates :actor_id, numericality: { only_integer: true, greater_than: 0,
                                      allow_nil: true }
validate  :actor_id_required_unless_system

# Append-only: nenhum updated_at, e blocking guard contra update.
def readonly?
  persisted? # uma vez gravado, nunca muda
end

private

def actor_id_required_unless_system
  return if actor_type == 'system'
  errors.add(:actor_id, :blank) if actor_id.blank?
end
```

### 5.4 Defesa contra ghost-history (NOVO v1.1)

`stage_id` no `Algorythmo::Lead` só pode ser modificado pelo método canônico `move_to_stage`. Qualquer outro path (rake admin, console, jobs futuros) que tentar `lead.update!(stage_id: X)` direto bate em `ActiveRecord::RecordInvalid`.

```ruby
# em Algorythmo::Lead
attr_accessor :_via_move_to_stage

before_update :guard_stage_id_change

def move_to_stage(new_stage)
  self._via_move_to_stage = true
  # ... lógica existente (update! stage:, position:, stage_entered_at:, closed_at:) ...
ensure
  self._via_move_to_stage = false
end

private

def guard_stage_id_change
  return unless stage_id_changed?
  return if _via_move_to_stage
  errors.add(:stage_id, 'só pode ser modificado via Lead#move_to_stage')
  throw :abort
end
```

**Razão.** Sem essa defesa, qualquer caminho alternativo (script de revert, migração de dados, futuro job) que faça `update(stage_id:)` direto **grava** o histórico (via `after_update_commit`) mas pode pular validações ou intermediar lógica — gerando histórico inconsistente com estado final. Guard garante invariante: "se está em stage X, existe entry de StageHistory consistente com como chegou lá". Custo: 1 método privado + 1 `attr_accessor` ephemeral.

---

## 6. Event flow (ASCII)

### 6.1 Auto-create de lead (já existe, recapitulação + ajuste M1-C)

```
┌─────────────┐    HTTP POST     ┌──────────────────┐
│  WhatsApp / │  ──────────────► │  Chatwoot Channel│
│  Email /    │                  │  webhook handler │
│  Widget /   │                  └────────┬─────────┘
│  Instagram  │                           │
└─────────────┘                           ▼
                              ┌────────────────────┐
                              │  Message.create!   │
                              │  (host app)        │
                              └─────────┬──────────┘
                                        │ Wisper event
                                        │  message.created
                                        ▼
                              ┌─────────────────────┐
                              │  AsyncDispatcher    │
                              │  (prepended by      │
                              │   Algorythmo::      │
                              │   AsyncDispatcher)  │
                              └─────────┬───────────┘
                                        │ enfileira em :critical
                                        ▼
                              ┌─────────────────────┐
                              │  Sidekiq job →      │
                              │  CrmListener        │
                              │  .message_created   │
                              └─────────┬───────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
       message.message_type      sender.is_a?(Contact)?    feature flag on?
       == 'incoming'?            (não conta agente humano)  algorythmo_crm
              │                         │                         │
              ▼                         ▼                         ▼
          [se NÃO em qualquer um → return early]
              │
              ▼
              ┌────────────────────────────────────┐
              │  pg_advisory_xact_lock(            │
              │    hash(account, contact)          │
              │  ) — serializa por contato         │
              └────────────────┬───────────────────┘
                               │
                               ▼
              ┌────────────────────────────────────┐
              │  lead aberto pra esse contato?     │
              ├────────────────────────────────────┤
              │  SIM → touch(:last_message_at)     │
              │  NÃO → fechado < 7d? reabrir       │
              │     senão → create! novo lead      │
              │              (chain via            │
              │               previous_lead_id)    │
              └────────────────┬───────────────────┘
                               │
                               ▼ ← NOVO M1-C
              ┌────────────────────────────────────┐
              │  Recorder.record_creation(lead)    │
              │  → idempotente: pula se último     │
              │    StageHistory já é (to=Novo,     │
              │    created_at >= 1 min atrás)      │
              │    (mitiga Sidekiq retry — §8.2)   │
              └────────────────────────────────────┘
```

### 6.2 First-outbound-human seta owner (NOVO M1-C — v1.1 atomic)

```
┌──────────────────┐ ─POST→ ┌─────────────────┐
│  Agente humano   │        │ Reply via UI    │
│  responde no UI  │        │ (Chatwoot)      │
└──────────────────┘        └────────┬────────┘
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │ Message.create!      │
                          │ message_type:        │
                          │   'outgoing'         │
                          │ sender_type: 'User'  │
                          └──────────┬───────────┘
                                     │ Wisper event
                                     ▼
                          ┌──────────────────────┐
                          │ CrmListener          │
                          │ .message_created     │
                          │ (mesmo listener,     │
                          │  novo branch)        │
                          └──────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
       outgoing AND               algorythmo_crm        contact_id resolvido?
       sender.is_a?(User)?        ligado?               (conversation.contact_id)
              │                      │                      │
              ▼                      ▼                      ▼
                       [se NÃO em qualquer → return]
              │
              ▼
              ┌──────────────────────────────────────────────────┐
              │  open_lead = Lead.find_open_for(                 │
              │    account, contact_id                           │
              │  )                                               │
              │  return unless open_lead                         │
              │                                                  │
              │  # UPDATE atômico — first-writer-wins por DB.    │
              │  # Sem race possível: o WHERE owner_id IS NULL   │
              │  # é avaliado dentro da mesma transação que faz  │
              │  # o SET, e Postgres garante atomicidade row-    │
              │  # level. Segundo writer recebe 0 linhas.        │
              │  updated = Algorythmo::Lead                      │
              │    .where(id: open_lead.id, owner_id: nil)       │
              │    .update_all(                                  │
              │      owner_id: message.sender_id,                │
              │      updated_at: Time.current                    │
              │    )                                             │
              │  return if updated.zero?  # já tinha dono        │
              └──────────────────────────────────────────────────┘
```

Notas críticas:
- **Manu NÃO seta owner.** Quando Manu responder, o `sender_type` será `'AgentBot'` (Manu plug em M4). O filtro `sender.is_a?(User)` é estrito e exclui AgentBot.
- **First-writer-wins por DB, não por lógica Ruby.** Cenário: humano A e B clicam Reply quase simultâneo. Dois `MessageCreated` na queue, dois jobs Sidekiq em workers diferentes. Ambos chegam no listener. O primeiro `update_all` retorna `1` (linha atualizada). O segundo retorna `0` (WHERE não casa mais — `owner_id` já não é NULL). Sem corrupção. Sem advisory lock necessário. **Invariante:** owner setado uma vez nunca muda neste listener.
- **Sem `Lead.find` + `update!`.** Esse é o padrão que cria a race. Aqui usamos `where(...).update_all(...)` que vira um único `UPDATE` SQL atômico.
- **`account` é resolvido do `message.account`**, não de `Current.account`. Listener roda em Sidekiq, fora de request context.
- **Reassign manual é feature futura (out of scope M1-C).** Quando vier, será via PATCH explícito, com auditoria, em outro endpoint — não toca este path.

### 6.3 Move grava stage_history (NOVO M1-C — v1.1 corrigido)

```
┌──────────────────┐ PATCH /leads/:id/move ┌──────────────────────┐
│  Kanban frontend │ ───────────────────►  │  LeadsController#move│
│  (drag/drop)     │   { stage_id }        └────────┬─────────────┘
└──────────────────┘                                │
                                                    ▼
                                  ┌─────────────────────────────────┐
                                  │  Lead#move_to_stage(new_stage)  │
                                  │  (já existe M1-A — M1-C blinda  │
                                  │   stage_id via §5.4 guard)      │
                                  │  → update!(stage:, position:,   │
                                  │     stage_entered_at:,          │
                                  │     closed_at: ...)             │
                                  └────────────────┬────────────────┘
                                                   │
                                                   ▼ ← NOVO M1-C
                                  ┌─────────────────────────────────┐
                                  │  after_update_commit (if        │
                                  │  saved_change_to_stage_id?):    │
                                  │    StageHistoryRecorder         │
                                  │      .record_transition(        │
                                  │        lead,                    │
                                  │        from: stage_id_before,   │
                                  │        to:   stage_id           │
                                  │      )                          │
                                  └─────────────────────────────────┘
```

**Resolução de actor — verificado contra código real.**

Chatwoot usa `thread_mattr_accessor` (não `ActiveSupport::CurrentAttributes`) — vide `lib/current.rb`:

```ruby
module Current
  thread_mattr_accessor :user
  thread_mattr_accessor :account
  thread_mattr_accessor :account_user
  thread_mattr_accessor :executed_by
  thread_mattr_accessor :contact
end
```

**Não existe `Current.agent_bot`.** AgentBot vem como `Current.user` (cf. `app/controllers/api/v1/accounts/conversations_controller.rb:95` — `Current.user.is_a?(AgentBot)`). Discriminação correta:

```ruby
# em Algorythmo::StageHistoryRecorder
def self.resolve_actor
  actor = Current.user
  case actor
  when AgentBot
    { actor_type: 'agent_bot', actor_id: actor.id }
  when ::User
    { actor_type: 'user', actor_id: actor.id }
  else
    # nil (Sidekiq job) ou tipo desconhecido — system
    { actor_type: 'system', actor_id: nil }
  end
end
```

**Cuidado com `thread_mattr_accessor` em Sidekiq.** Diferente de `CurrentAttributes`, **`thread_mattr_accessor` NÃO auto-reseta entre jobs.** Threads Sidekiq são reusadas; se um job anterior setou `Current.user` e não fez `Current.reset` no `ensure`, o próximo job na mesma thread herda. Chatwoot já se defende disso (`BulkActionsJob` faz `Current.reset` defensivo). **Defesa adicional no Recorder:** acima, o `case` aceita só `AgentBot` ou `User`; qualquer outra coisa (incluindo stale) cai em `system`. Sem confiar implicitamente em `Current.user` ser limpo.

**Hook roda after_commit, fora da transação principal do move.** Razão: falha no insert do histórico **não desfaz** o move. Prioridade do produto: "lead caminha mesmo se o histórico falhar". Job de reconciliação noturno (Sidekiq cron) re-popula histórico ausente comparando `stage_entered_at` vs último `StageHistory.to_stage_id` é roadmap M3. Por enquanto: log estruturado quando insert falha (`ChatwootExceptionTracker`).

**`actor_id` é `bigint` nu**, não FK polimórfica. Razão: `User`, `AgentBot`, e futuros agentes Manu vivem em tabelas diferentes; FK polimórfica acopla M1-C a decisões futuras. Resolução por convenção: leitura via helper `actor_summary` (§7.1).

---

## 7. API surface (delta sobre M1-A)

### 7.1 Endpoints novos

```
GET  /algorythmo/api/v1/accounts/:id/leads/:lid/stage_history
```

Retorna transições em ordem cronológica desc. Cap defensivo em 100. **Cliente é avisado quando truncou** (`truncated: true`).

Response:
```json
{
  "stage_history": [
    {
      "id": 7,
      "from_stage_id": 12,
      "from_stage_name": "Novo",
      "to_stage_id": 13,
      "to_stage_name": "Qualificado",
      "actor_type": "user",
      "actor_id": 4,
      "actor_summary": { "id": 4, "name": "Gustavo Bordin", "thumbnail": "..." },
      "created_at": "2026-05-24T12:34:56Z"
    }
  ],
  "truncated": false
}
```

- `truncated: true` quando o cap de 100 é atingido (cliente sabe que pode estar incompleto).
- `actor_summary` é nullable quando `actor_type == 'system'`.
- Quando `actor_type == 'agent_bot'`, `actor_summary` resolve via `AgentBot.find_by(id: actor_id)`. Quando Manu chegar (M4), o mesmo shape funciona.

**Helper `actor_summary` — contrato explícito.** Definido no controller como método privado:

```ruby
def actor_summary(entry)
  case entry.actor_type
  when 'user'
    user = User.find_by(id: entry.actor_id)
    user && { id: user.id, name: user.name, thumbnail: user.avatar_url }
  when 'agent_bot'
    bot = AgentBot.find_by(id: entry.actor_id)
    bot && { id: bot.id, name: bot.name, thumbnail: nil }
  else
    nil # system
  end
end
```

N+1 mitigado por preload em lote (`User.where(id: user_ids).index_by(&:id)`) na ação `stage_history`. Documentado em spec.

### 7.2 Endpoints alterados (delta no JSON, sem mudança de path/contrato HTTP)

`GET /leads`, `GET /leads/:id`, `POST /leads`, `PATCH /leads/:id`, `PATCH /leads/:id/move`, `POST /leads/:id/reopen` — todos passam por `lead_json` que **ganha 1 campo** (não 2):

```diff
 {
   "id": 1,
   "contact_id": 42,
   "stage_id": 7,
   "channel_origin": "whatsapp",
   "stage_entered_at": "2026-05-23T10:00:00Z",
+  "owner": {                       // nullable
+    "id": 4,
+    "name": "Gustavo Bordin",
+    "thumbnail": "https://.../avatar.png"
+  },
   "contact": { ... }
 }
```

**`time_in_stage` NÃO entra no `lead_json` público.**

Razão (decisão v1.1):
- Front já tem `stage_entered_at` e calcula `Date.now() - stage_entered_at` localmente. Auto-consistente (relógio único do cliente, sem drift).
- Expor `time_in_stage` (snapshot) + `stage_entered_at` (absoluto) = duas fontes de verdade. Cliente teria que escolher qual usar pra animar o chip aging, gerando flicker quando os dois divergem (drift cliente-servidor + tempo de roundtrip).
- Coerente com achado do design review (chip aging por drift).
- `time_in_stage` é **dado de métrica**, não de display. Quando dashboard for desenhado (M3), entra em endpoints internos de analytics — separado do payload de UI.

- `owner` segue o mesmo shape de `contact` no `lead_json`. `nil` quando `owner_id` é null.
- Adiciona `includes(:owner)` na query do `index_by_stage` e `index_by_contact` pra evitar N+1.

### 7.3 Compatibilidade com CONTRACT_M1B v1.0.0

Conferido `docs/coordination/CONTRACT_M1B.md` v1.0.0:
- Card do front consome `lead.id`, `lead.stage_id`, `lead.channel_origin`. Nenhum dos campos novos quebra o contrato visual (são adições).
- `LeadDetailDrawer` (Fase 3 do M1-B, contrato fixado pro D scaffoldar) já reserva `data-testid="drawer-conversation-link"` e outras coisas; **não** reserva nada de owner ainda. Decisão: adicionar `data-testid="drawer-owner-name"` + `data-testid="drawer-stage-history-list"` ao contrato via **CONTRACT_BUMP v1.1.0** no início do PR 4 (frontend wire-up).
- Suite Playwright (PR #50) está `.skip()`d. Un-skip só na PR 5, depois que toda a costura backend estiver mergeada.

---

## 8. Edge cases e migração de dados

### 8.1 Owner setter — casos a cobrir em RSpec

| Cenário | Esperado |
|---|---|
| Outgoing message, sender User, lead aberto sem owner | `update_all` retorna 1 → Lead.owner_id = sender_id |
| Outgoing message, sender User, lead aberto com owner | `update_all` retorna 0 → no-op (idempotência por WHERE) |
| Outgoing message, sender AgentBot (Manu) | Branch nem entra (filtro `sender.is_a?(User)`) |
| Outgoing message, sender User, **sem** lead aberto pro contato | No-op + log warning |
| Outgoing message, sender User, lead aberto, owner anterior foi `User.destroy` (nullify) | `owner_id` voltou a NULL → `update_all` casa WHERE → seta novo owner |
| Incoming message (cliente) | Branch nem entra |
| Flag `algorythmo_crm` off | No-op (early return existente) |
| **Race: 2 humanos respondendo simultaneamente** | Primeiro `UPDATE ... WHERE owner_id IS NULL` retorna 1. Segundo retorna 0 (WHERE não casa). First-writer-wins por DB. Spec usa 10 threads + `wait_for_completion`. Marcar `use_transactional_tests = false` + skip se adapter ≠ PostgreSQL. |

### 8.2 StageHistory — casos a cobrir

| Cenário | Esperado |
|---|---|
| Listener cria lead novo | StageHistory(from=nil, to=Novo, actor=system) |
| Listener reabre lead fechado (C2) | StageHistory(from=Won/Lost, to=Novo, actor=system) |
| **Sidekiq retry duplicado em reopen (mesmo job rodando 2x)** | Recorder.record_creation é idempotente: pula se último StageHistory do lead é `(to=Novo, created_at >= 1 min atrás)`. Sem dupla entrada. Spec explícita. |
| API move move lead via UI (humano arrastou) | StageHistory(from=X, to=Y, actor=user, actor_id=Current.user.id) |
| API move move lead via agent bot | StageHistory(from=X, to=Y, actor=agent_bot, actor_id=Current.user.id) — porque `Current.user.is_a?(AgentBot)` |
| `Lead#reopen_as_new_lead` (cria novo lead em "Novo" com previous_lead_id) | StageHistory no **novo** lead with from=nil, to=Novo, actor=system |
| `Lead#move_to_stage` falha (RecordInvalid) | StageHistory NÃO criado (after_update_commit não dispara) |
| StageHistory.create! falha (constraint, qualquer coisa) | Lead permanece movido (move foi committed antes). Log error. Dashboard de reconciliação futuro detecta gap. |
| Tentativa de `history.update(actor_type: ...)` | `ActiveRecord::ReadOnlyRecord` raise (readonly?) |
| **Tentativa de `lead.update!(stage_id: X)` direto fora de `move_to_stage`** | `ActiveRecord::RecordInvalid` (guard §5.4). Hook não dispara, sem ghost-history. |
| `Lead.destroy` (hard delete, raro) | StageHistory entries do lead vão junto (cascade) |
| `Lead.update(deleted: true)` (soft delete) | StageHistory preservado (sem cascade em soft delete) |
| Job Sidekiq herda `Current.user` stale de execução anterior | Recorder cai em `system` quando não-User/AgentBot ou descarta entry. Spec explícita simulando thread reuso. |

### 8.3 Migração de dados existentes

**Cenário 1 — leads pré-listener em dev/staging/prod.** Founder rodou seeders antes do listener estar montado; existem leads sem `channel_origin` e sem `last_message_at`. Solução: rake `algorythmo:crm:cleanup_legacy_leads` que:

- Identifica `Algorythmo::Lead.where(channel_origin: [nil, ''], last_message_at: nil)`.
- Em dev/test/staging: `delete_all` (hard) sem confirmação.
- **Em production (`Rails.env.production?`): duplo gate.**
  - Flag obrigatória: `rake algorythmo:crm:cleanup_legacy_leads -- --force`
  - Env var obrigatória: `ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW`
  - Se faltar qualquer um dos dois → abort com mensagem clara.
- **Audit log antes do delete**: escreve `tmp/cleanup_legacy_leads_<timestamp>.log` com:
  - Timestamp
  - Lista de IDs a apagar
  - Pares (account_id, contact_id)
  - Count total
  - Resultado da operação após `delete_all`
- Idempotente: rodar 2x não quebra nada (segunda execução: 0 deletes).

**Cenário 2 — leads M1-A com stage_entered_at populado mas sem stage_history.** A migração `create_algorythmo_stage_histories` é greenfield. Decisão: **não retro-popular**. Razão: M1-A foi mergeado há ~24h, em ambiente sem leads de operação real; criar histórico sintético "lead criado em X" é gerar dado fake que distorce dashboards futuros. Rake separado pode fazer isso opt-in (`algorythmo:crm:backfill_stage_history`) se o founder pedir depois — não shippa por default.

**Cenário 3 — leads com owner_id após adicionar coluna.** Migration adiciona `owner_id` com default null. Leads existentes ficam sem dono. Próximo outbound humano em cada conversa seta. Comportamento esperado, sem rake especial.

### 8.4 Performance — 10x e 100x

- **`owner` no JSON.** Adiciona um JOIN no `users`. Mitigado por `includes(:owner)` no controller. Esclarecimento (v1.1): `includes(:owner)` é **+1 query independente do count** (não +N). Para 1k leads paginados: 1 query de leads + 1 query de owners (`WHERE id IN (?)`). Mesmo padrão do `contact`.
- **`StageHistory.create!` no hook de `Lead`.** Custo: 1 INSERT por move. Move humano é evento raro (segundos). Auto-create dispara 1 INSERT a mais no listener. Sidekiq queue `:critical` já tolera o volume (medido em §2.1 P2 do plano 0001).
- **Owner setter via `update_all`.** Um único `UPDATE` SQL com WHERE condicional. O(1) por mensagem outgoing humana. Sem JOINs. Index existente em `id` (PK) cobre.
- **`GET /leads/:id/stage_history`.** Index `(lead_id, created_at)` cobre. Lead típico < 20 transições. Cap em 100 defensivo + `truncated: true` no payload.
- **Dashboard futuro (M3, fora deste plano).** Index `(to_stage_id, created_at)` já cobre "transições para etapa X no mês Y". Crescimento esperado: ~10 transições/lead × N leads. 100k leads = 1M rows em 1 ano — Postgres lida sem tuning especial. Particionamento por `created_at` é decisão de M3+.

### 8.5 Hostile input

- `GET /leads/:id/stage_history` para lead de outro account → 404 (controller filtra por `current_account.id`).
- `POST /leads/:id/move` com `stage_id` de pipeline diferente → 422 (validação já existe em `move_to_stage`).
- Tentativa de SQL injection via `actor_type` (campo string aberto) — validado por inclusion, qualquer outro valor 422. JSON renderiza string escapada.
- `actor_id` inválido (zero, negativo, string) → 422 via `numericality` validator.
- `actor_id` referenciando user que não existe → permitido (FK não é hard constraint). Helper `actor_summary` retorna `null` graciosamente.

### 8.6 Offline / flaky network

- Frontend M1-B já tem rollback otimista em drag fail (visto em `useDragLead.js`). Nada a mudar no front-end.
- Se `StageHistory.create!` falhar dentro do hook após move, log error + Lead permanece movido (decisão registrada §6.3).

---

## 9. Plano de testes

### 9.1 RSpec (gate ≥90% nos arquivos novos)

**Novos arquivos a cobrir:**
- `engines/algorythmo/app/models/algorythmo/stage_history.rb`
- `engines/algorythmo/app/services/algorythmo/stage_history_recorder.rb` (extraído do model pra testar isoladamente — ver §10 PR 2)
- Branch novo em `engines/algorythmo/app/listeners/algorythmo/crm_listener.rb` (owner setter atômico)

**Specs concretas (não "adicionar specs"):**

`spec/algorythmo/models/stage_history_spec.rb`:
- valida `actor_type` em ACTOR_TYPES
- valida `actor_id` numericality (positivo, integer, allow_nil) — rejeita "abc", 0, -1
- valida `actor_id` presente se actor_type ≠ 'system'
- `readonly?` retorna true após persisted
- `update` raise ReadOnlyRecord
- belongs_to `lead` (cascade destroy)
- belongs_to `from_stage` opcional, `to_stage` obrigatório

`spec/algorythmo/services/stage_history_recorder_spec.rb`:
- `record_creation` grava entry com from=nil
- `record_creation` é idempotente: pula se último entry do lead é `(to=Novo, created_at >= 1 min atrás)` — caso Sidekiq retry
- `record_transition` grava entry from→to
- actor resolve `'user'` quando `Current.user.is_a?(User)`
- actor resolve `'agent_bot'` quando `Current.user.is_a?(AgentBot)`
- actor resolve `'system'` quando `Current.user.nil?`
- actor resolve `'system'` quando `Current.user` é tipo desconhecido (defesa stale)
- falha de insert não levanta (rescues + logs via `ChatwootExceptionTracker`)

`spec/algorythmo/models/lead_spec.rb` (edita o existente):
- `move_to_stage` dispara hook que grava StageHistory
- **`Lead#update!(stage_id:)` direto raises `RecordInvalid`** (guard §5.4)
- `reopen_as_new_lead` grava StageHistory no novo lead (não no antigo)

`spec/algorythmo/listeners/crm_listener_owner_spec.rb` (novo arquivo, mesma estrutura do existente):
- 8 cenários da tabela §8.1
- **Cenário concorrência (v1.1):**
  - `self.use_transactional_tests = false`
  - `skip 'Postgres-only (update_all atomicity)' unless ActiveRecord::Base.connection.adapter_name == 'PostgreSQL'`
  - 10 threads concorrentes simulando MessageCreated outgoing de 10 humanos diferentes para o mesmo lead. Asserta: exatamente 1 thread vê `updated == 1`, demais veem `updated == 0`. Lead.owner_id no final é o sender_id do vencedor.

`spec/algorythmo/listeners/crm_listener_spec.rb` (edita o existente):
- 2 novos contextos: "when creating a new lead → StageHistory entry is appended" e "when reopening a closed lead → StageHistory entry is appended"
- Caso de Sidekiq retry duplicado: invocar `message_created` 2x consecutivas no mesmo evento → exatamente 1 StageHistory (idempotência §8.2)

`spec/algorythmo/controllers/leads_controller_spec.rb` (edita o existente):
- `GET /leads/:id/stage_history` — happy path, IDOR (lead de outro account → 404), cap em 100 + `truncated: true`
- `lead_json` agora inclui `owner` (nullable) — e **NÃO inclui `time_in_stage`** (asserção explícita)
- `includes(:owner)` evita N+1 (usar `bullet` ou contagem manual de queries)

`spec/algorythmo/tasks/cleanup_legacy_leads_spec.rb` (novo):
- happy path dev: cria 5 leads legacy + 5 normais, rake apaga só os legacy
- idempotência: 2ª execução = no-op (0 deletes)
- production sem `--force` → aborta com mensagem
- production com `--force` mas sem `ALGORYTHMO_CLEANUP_CONFIRM` → aborta com mensagem
- production com ambos → executa + escreve audit log com IDs e count
- audit log: arquivo existe em `tmp/cleanup_legacy_leads_<timestamp>.log`

### 9.2 Playwright (un-skip da suite PR #50 + 2 cenários novos)

Suite existente (39 testes `.skip()`d) é destravada **no PR 5 e só nele**. Pré-requisitos: PRs 1-4 mergeados, flag `algorythmo_crm` ligada em ambiente de teste.

Cenários novos a adicionar à suite:
- `e2e/crm/owner-assignment.spec.ts` — Cliente abre conversa via widget → lead em "Novo" sem owner → humano A responde → card mostra avatar de A em <10s.
- `e2e/crm/stage-history-drawer.spec.ts` — Drawer do lead lista todas as transições com timestamp + ator. Estado inicial = 1 entrada "Sistema · há X · Criado em Novo".

Gate axe-core continua valendo (sem novos imports).

### 9.3 Manual smoke (founder)

Checklist no `engines/algorythmo/docs/M1-C-OPERATION.md`:
1. Liga flag `algorythmo_crm` em conta de teste.
2. Manda mensagem pelo widget como "lead". Lead aparece em <10s em "Novo" com nome do widget e canal "widget".
3. Responde da UI como agente. Card mostra avatar do agente em <10s. `stage_history` do lead tem 1 entrada (criação).
4. Arrasta lead pra "Qualificado". Card move. Drawer abre, `stage_history` mostra 2 entradas.
5. Manda nova mensagem do mesmo contato. **Não** cria lead novo (idempotência). `last_message_at` atualiza.
6. Roda `bundle exec rake algorythmo:crm:cleanup_legacy_leads` em conta de teste → mensagem "0 legacy leads removed".

---

## 10. Sequência de PRs (cada um ≤ ~400 LOC, single responsibility)

Total: **5 PRs**. Sequência tem 1 dependência rígida (PR 5 depende de todos os anteriores). PRs 1, 2 e 3 podem ser despachados em paralelo (afetam arquivos diferentes).

### PR 1 — Migration: owner_id + listener branch atômico + JSON owner

**Branch:** `algorythmo/m1c-owner-id`
**LOC estimado:** ~250
**Conteúdo:**
- Migration `add_owner_id_to_algorythmo_leads`
- `Algorythmo::Lead` ganha `belongs_to :owner, class_name: 'User', optional: true`
- `Algorythmo::CrmListener#message_created` ganha branch outgoing → **owner setter via `update_all` atômico** (§6.2)
- `LeadsController#lead_json` embute `owner: { id, name, thumbnail }`
- `LeadsController#index_by_stage` e `index_by_contact` adicionam `:owner` ao `includes`
- RSpec: `crm_listener_owner_spec.rb` (8 cenários §8.1 + cenário 10-threads PG-only) + edits em `leads_controller_spec.rb` (owner no JSON, IDOR, N+1, asserção explícita que `time_in_stage` NÃO está no payload)

**Acceptance:**
- Migration up/down clean
- `Algorythmo::Lead.first.owner` resolve a User ou nil
- RSpec verde em ≥90% nos arquivos novos
- Em conta de teste: humano responde conversa → DB `algorythmo_leads.owner_id` = sender.id
- Spec de concorrência: 10 threads, exatamente 1 vence

### PR 2 — Migration: stage_histories + model + service recorder + guard §5.4

**Branch:** `algorythmo/m1c-stage-history`
**LOC estimado:** ~400
**Conteúdo:**
- Migration `create_algorythmo_stage_histories`
- Model `Algorythmo::StageHistory` (readonly, validações incluindo numericality do actor_id)
- Service `Algorythmo::StageHistoryRecorder` com 2 métodos: `record_creation(lead)` (idempotente), `record_transition(lead, from:, to:)`. Resolve `actor` via `case Current.user` (não `Current.agent_bot`).
- `Algorythmo::Lead`:
  - `has_many :stage_histories` + `after_update_commit` condicional a `saved_change_to_stage_id?` chamando o recorder
  - **Guard §5.4**: `before_update :guard_stage_id_change` + `attr_accessor :_via_move_to_stage` + wrap em `move_to_stage` com `ensure`
- `Algorythmo::CrmListener`: chama `StageHistoryRecorder.record_creation` após criar ou reabrir lead
- RSpec: `stage_history_spec.rb`, `stage_history_recorder_spec.rb`, edits em `crm_listener_spec.rb` (caso Sidekiq retry idempotência) + `lead_spec.rb` (caso guard §5.4 raise)

**Acceptance:**
- Migration up/down clean
- `Lead.create!` → 0 entries (recorder não dispara no create do Lead direto; só via listener / move)
- Listener cria lead → 1 StageHistory(from=nil, to=Novo, actor=system)
- Listener invocado 2x para mesmo evento → 1 StageHistory (idempotência)
- `Lead#move_to_stage` → +1 StageHistory(from=X, to=Y, actor=user/agent_bot/system)
- `Lead#update!(stage_id: X)` direto → `RecordInvalid` raise (guard §5.4)
- `StageHistory.first.update(...)` → ReadOnlyRecord raise
- RSpec verde em ≥90% nos arquivos novos

### PR 3 — Endpoint stage_history + CONTRACT bump

**Branch:** `algorythmo/m1c-stage-history-api`
**LOC estimado:** ~180
**Conteúdo:**
- `LeadsController#stage_history` (novo action, GET member). Inclui `actor_summary` com preload em lote por actor_type. Retorna `{ stage_history: [...], truncated: <bool> }`.
- Rota `get :stage_history` em `config/routes.rb` no resource `:leads`
- RSpec edits em `leads_controller_spec.rb`: 3 contextos para o novo endpoint (happy, IDOR, cap+truncated)
- CONTRACT_M1B bump: v1.1.0 — adiciona `data-testid="drawer-owner-name"` e `data-testid="drawer-stage-history-list"` ao §7 (LeadDetailDrawer). Engineer abre PR `[CONTRACT_BUMP]` ANTES deste PR — ver §10.7.

**Acceptance:**
- `GET /leads/:id/stage_history` retorna `{ stage_history: [...], truncated: false }` com array em ordem desc
- Quando count = 100, retorna `truncated: true`
- IDOR test: lead de outro account → 404
- RSpec verde

**Nota.** `time_in_stage` foi REMOVIDO do escopo deste PR (decisão v1.1) — fica fora do `lead_json` público. Roadmap M3 (dashboard).

### PR 4 — Frontend: consome owner + stage_history (front continua calculando aging local)

**Branch:** `algorythmo/m1c-frontend-wire-real-data`
**LOC estimado:** ~350
**Depende de:** PR 1, PR 2, PR 3 mergeados.
**Conteúdo:**
- `app/javascript/dashboard/composables/algorythmo/useLeadStore.js`: nada a mudar (já consome o `lead_json` inteiro)
- `app/javascript/dashboard/routes/dashboard/crm/views/components/LeadCard.vue`:
  - Renderiza avatar do `lead.owner` no canto inferior direito (ou placeholder "Sem dono")
  - **Continua calculando aging localmente a partir de `lead.stage_entered_at`** — não troca pra `time_in_stage` (não existe no payload por decisão v1.1)
- `app/javascript/dashboard/helper/algorythmo/leadApi.js`: novo método `fetchStageHistory(accountId, leadId)`
- `app/javascript/dashboard/composables/algorythmo/useStageHistory.js`: novo composable que lazy-load o histórico quando o drawer abre. Trata `truncated: true` mostrando rodapé "Mostrando últimos 100 — histórico mais antigo omitido".
- `LeadDetailDrawer.vue` (a criar — não foi feito em M1-B, contrato §7 do CONTRACT está reservado): renderiza nome, contato, canal, owner, lista de stage_history. Usa `data-testid` do CONTRACT v1.1.0.
- i18n: `algorythmoCrm.json` (en + pt_BR) ganha as strings de owner, sem dono, histórico, ator system, "Mostrando últimos N"
- Vitest: specs para LeadCard atualizado, useStageHistory (incluindo branch de truncated), LeadDetailDrawer

**Acceptance:**
- Card mostra avatar de owner quando setado, placeholder quando não
- Card aging continua usando `stage_entered_at` (sem mudança de comportamento aqui)
- Drawer abre, lista stage_history com timestamps relativos e nome do ator
- Drawer exibe rodapé "truncated" quando aplicável
- Vitest ≥75% interaction / ≥90% composables (mesma régua T2 do plano 0001)

### PR 5 — Cleanup rake (duplo gate) + un-skip Playwright + smoke E2E

**Branch:** `algorythmo/m1c-cleanup-and-e2e`
**LOC estimado:** ~280
**Depende de:** PR 1, 2, 3, 4 mergeados.
**Conteúdo:**
- `engines/algorythmo/lib/tasks/algorythmo_cleanup.rake`: `algorythmo:crm:cleanup_legacy_leads` (lógica §8.3, duplo gate em prod, audit log)
- RSpec `tasks/cleanup_legacy_leads_spec.rb` (cenários: dev happy, idempotência, prod sem `--force`, prod sem env, prod com ambos + audit log)
- Remove `.skip()` dos 39 testes em `spec/system/algorythmo/crm/` (suite do PR #50)
- Adiciona 2 cenários novos: `owner-assignment.spec.ts` e `stage-history-drawer.spec.ts`
- `engines/algorythmo/docs/M1-C-OPERATION.md`: checklist §9.3 + documentação do duplo gate de cleanup
- Atualiza `docs/coordination/STATUS.md` — Fase 3 fechada

**Acceptance:**
- `bundle exec rake algorythmo:crm:cleanup_legacy_leads` em ambiente de dev funciona
- Em prod simulado: comando sem `--force` aborta; com `--force` mas sem env aborta; com ambos executa
- Audit log gerado em `tmp/cleanup_legacy_leads_<timestamp>.log`
- 41 testes Playwright passam (39 originais + 2 novos)
- axe-core gate continua zero violations critical/serious
- Founder valida manualmente os 6 itens de §9.3 em conta de teste local

### 10.6 Ordem de despacho

```
                 ┌──────┐
                 │ PR 1 │ owner_id (atomic UPDATE) — paralelo
                 ├──────┤
                 │ PR 2 │ stage_history + guard §5.4 — paralelo
                 ├──────┤
                 │ PR 3 │ endpoint stage_history (após PR 1 pra evitar
                 │      │ conflito em lead_json)
                 └──┬───┘
                    │
                 ┌──▼───┐
                 │ PR 4 │ frontend wire real data (após 1+2+3)
                 └──┬───┘
                    │
                 ┌──▼───┐
                 │ PR 5 │ cleanup + e2e + docs (fecha M1-C)
                 └──────┘
```

PRs 1+2 sem conflito mútuo (arquivos distintos). PR 3 toca `lead_json` que PR 1 também toca — despachar PR 3 **após** PR 1 mergear evita conflito de 5 linhas.

### 10.7 Coordenação CONTRACT_M1B bump (v1.1 corrigido — single-engineer)

PR 3 inclui CONTRACT bump v1.1.0. Procedimento M1-C (single-engineer):

1. Engineer abre PR `[CONTRACT_BUMP]` modificando apenas `docs/coordination/CONTRACT_M1B.md` ANTES do PR 3 abrir. PR isolado, minúsculo (~30 LOC), zero código.
2. **Founder aprova diretamente** (via `/review` ou inspeção manual). Sem dependência de "Sessão A" (não existe em M1-C — referência removida na v1.1). Sem ETA de "1h" — founder decide quando aprovar; engineer espera.
3. Após merge do bump, engineer abre PR 3 referenciando o commit hash do bump na descrição.
4. Se founder rejeitar o bump (mudança de testids), engineer revisa proposta antes de abrir PR 3.

Nenhum PR 3 abre antes do bump mergear. Sem race entre PRs.

---

## 11. Questões abertas (decisões de produto)

Lista curta — só itens onde a resposta muda o produto, não o código. Founder responde antes do PR 4 abrir.

### Q1 — Quando o lead vier de uma conversa que **não tem `contact_id` resolvido** (canal anônimo, ex: widget sem identify), o que mostrar como nome do owner?

Hoje o listener pula sem criar lead (sem contact_id = sem lead). Sem implicação direta neste marco. **Recomendação do planner:** manter o comportamento atual (não-fix). Levantando aqui porque é decisão de produto, não técnica. Confirma?

**Decisão founder (2026-05-24):** Confirmado — não cria lead pra widget anônimo. Vira ruído.

### Q2 — Reassign manual de owner pelo painel — entra em algum marco próximo?

Hoje o owner uma vez setado nunca muda automaticamente. Se humano A respondeu primeiro e B precisa assumir, hoje não há fluxo. **Recomendação do planner:** out of scope M1-C, levantar como feature M2 ou M3. UI mínima: botão "Reatribuir" no drawer. Backend trivial (PATCH /leads/:id com `owner_id`). Decisão de quando shippar fica com o founder.

**Decisão founder (2026-05-24):** Confirmado — empurra pra M2/M3. Fica tracking issue, não bloqueia M1-C.

### Q3 — Quando Manu (M4) começar a mover leads, ela deve aparecer em `stage_history` como `actor_type='agent_bot'` ou como `'manu'` específico?

Schema atual aceita string aberta (validada). **Recomendação do planner:** usar `'agent_bot'` genérico (compatível com AgentBot upstream do Chatwoot) + popular `actor_id` com `AgentBot#id` da Manu. Diferenciação por nome no `actor_summary` quando dashboard for desenhado. Sem mudança de schema. Confirma?

**Decisão founder (2026-05-24):** Confirmado — `actor_type='agent_bot'` + lookup pelo nome da Manu via `actor_id`. Sem mudança de schema.

### Q4 — Em produção (quando rolar), o rake de cleanup deve rodar automaticamente em deploy ou só manual?

**Recomendação do planner:** manual, com **duplo gate** (já é o design v1.1: `--force` + `ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW`). Rodar automático em deploy é risco desnecessário — `delete_all` de leads em prod sem revisão humana é exatamente o tipo de coisa que dá errado. Confirma?

**Decisão founder (2026-05-24):** Confirmado — manual, com `--force` + env var em prod. Sem auto-run em deploy.

---

## 12. Riscos

| # | Risco | Probabilidade | Severidade | Mitigação |
|---|---|---|---|---|
| 1 | Spam vira lead em volume (mensagem de bot/promo cria lead falso) | Média | Alta no longo prazo | M1-C herda mitigação D6/§7 do plano 0001 (confia em filtro de canal do Chatwoot). Métrica futura: alerta se `Lead.created` por hora > X. Tracking issue separada. |
| 2 | Race condition no owner setter (2 humanos respondendo) | Baixa | ~~Baixa~~ Mitigada | **First-writer-wins por DB via `UPDATE ... WHERE owner_id IS NULL`.** Segundo writer recebe 0 linhas atualizadas. Sem corrupção possível. Testado com 10 threads concorrentes em spec PG-only. |
| 3 | Hook de stage_history falha após move | Baixa | Média | Log estruturado + job de reconciliação roadmap M3. Move não desfaz. |
| 4 | Migração de leads órfãos apaga lead real por engano em prod | Baixíssima em dev | Catastrófica em prod | **Duplo gate: `--force` flag + `ALGORYTHMO_CLEANUP_CONFIRM=YES_I_KNOW`** + audit log com IDs antes de qualquer delete. Sem auto-run em deploy (Q4). |
| 5 | Sidekiq queue `:critical` saturada em pico de mensagens (200 leads em 10 min) | Média | Alta | Já mitigado em M1-A (§7 risco #8 do plano 0001 — criar queue `:algorythmo_crm` se p95 > 5s). Sem novo trabalho aqui — métrica via dashboard Sidekiq existente. |
| 6 | Frontend ainda mostra `.skip` em CI após PR 5 | Baixa | Média | PR 5 explicitamente remove os skips. Adversarial reviewer obrigado a checar diff de `.skip(`. |
| 7 | Owner referenciado é hard-deleted (`User.destroy`) | Baixa | Baixa | FK `on_delete: :nullify` — lead vira sem dono. Próximo outbound humano re-seta. |
| 8 | `stage_history.actor_id` aponta pra User que não existe | Baixa | Cosmética | Helper `actor_summary` retorna `null` graciosamente. UI mostra "Usuário removido". |
| 9 | Lead criado em flag-off, flag liga depois — não tem stage_history de criação | Baixa | Cosmética | Decisão registrada §8.3 cenário 2: não retro-popular. Rake opcional `backfill_stage_history` fica como roadmap se founder pedir. |
| 10 | CONTRACT bump v1.1.0 não coordenado quebra builds paralelos | Baixíssima | Média | Procedimento explícito §10.7 — bump merge antes de PR 3 abrir. Em single-engineer (M1-C) o risco de race entre PRs é nulo. |
| **11** | **`Current.user` stale em thread Sidekiq reusada (não auto-reseta como `CurrentAttributes`)** | **Baixa** | **Média** | **Recorder discrimina por `case Current.user`: aceita só `AgentBot` ou `User`; qualquer outra coisa cai em `'system'`. Defesa explícita contra herança de thread state. Spec simula thread reuso.** |
| **12** | **`stage_id` modificado fora de `move_to_stage` (rake admin, script, futuro job) gera ghost-history** | **Baixa** | **Média** | **Guard §5.4 `before_update :guard_stage_id_change` bloqueia mudança fora do método canônico com `RecordInvalid`. Spec verifica raise.** |

---

## 13. Feature flag — rollout

Tudo continua atrás de `algorythmo_crm`. M1-C **não** adiciona flag nova.

Rollout incremental quando for ligar pra cliente real (operacional, não M1-C):
1. Cliente piloto (1 conta) liga flag → CrmListener começa a criar leads pra mensagens novas.
2. Founder roda `rake algorythmo:crm:cleanup_legacy_leads` na conta antes de ativar (limpa qualquer fantasma — com duplo gate).
3. Founder valida 24h.
4. Restart pra invalidar cache (P2 do plano 0001 — restart-required no MVP).
5. Próximo cliente.

Rollback é trivial: desligar a flag. Listener para de processar (early return em §6.1). Leads já criados ficam visíveis se a flag voltar a ligar.

---

## 14. Definição de pronto (M1-C completo)

Checklist binário:

- [ ] Migration 1 (owner_id) mergeada
- [ ] Migration 2 (stage_histories) mergeada
- [ ] Listener seta owner em outbound humano via `update_all` atômico (RSpec verde incluindo cenário 10-threads PG-only + smoke manual)
- [ ] Listener grava stage_history em create/reopen com idempotência Sidekiq-retry (RSpec verde)
- [ ] `Lead#move_to_stage` grava stage_history (RSpec verde)
- [ ] **Guard §5.4** bloqueia `stage_id` change fora de `move_to_stage` (RSpec verde)
- [ ] `GET /leads/:id/stage_history` retorna `{ stage_history, truncated }` (RSpec verde)
- [ ] `lead_json` embute `owner` (nullable). **NÃO inclui `time_in_stage`** (asserção explícita em spec)
- [ ] LeadCard renderiza owner avatar; aging continua local via `stage_entered_at` (Vitest verde)
- [ ] LeadDetailDrawer lista stage_history + indicador de truncamento (Vitest + Playwright verdes)
- [ ] CONTRACT_M1B v1.1.0 mergeado antes de PR 3
- [ ] Rake cleanup_legacy_leads funcional em dev + duplo gate em prod testado + audit log gerado (RSpec + manual)
- [ ] Suite Playwright PR #50 des-skipada + 2 novos cenários verdes
- [ ] axe-core gate continua zero critical/serious
- [ ] `engines/algorythmo/docs/M1-C-OPERATION.md` escrito
- [ ] `docs/coordination/STATUS.md` atualizado (M1-C FECHADO)
- [ ] Founder rodou os 6 itens manuais de §9.3 em conta de teste local

Quando todos os checkboxes acima estiverem marcados, M1-C está fechado e a próxima sessão pode dispatch M2 final (cuts batch 2) ou começar a desenhar M3 (Brain) sem dívida técnica desse marco.

---

## 15. Decisões de cosméticos não aplicadas (rationale)

A auditoria sugeriu cosméticos opcionais. Decisões:

- **Padronização de formato com planos 0001/0002.** Inspecionado — formato deste plano (CHANGELOG no topo, §§ numeradas, ASCII forte, decisões inline, riscos tabulares) é equivalente. Sem ação.
- **YAGNI no `idx_stage_histories_stage_chrono` (M3).** NÃO aplicado. Razão: criar índice em greenfield é grátis (tabela vazia, sem `CONCURRENTLY` necessário). Criar em prod depois exige `algorithm: :concurrently`, lock leve mas operação de manutenção. Custo agora < custo depois. Mantido.
- **Helper `actor_summary` documentado.** Aplicado em §7.1 (assinatura + lógica explícita, não convenção implícita).
