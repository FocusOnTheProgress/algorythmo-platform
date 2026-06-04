# Plano 0012 — Brain "simples" + Copiloto do Operador (consultor de conhecimento)

**Branch de trabalho:** `algorythmo/brain-copiloto` (criar a partir de `algorythmo/main`).
**Status:** **PLANO v2 — pós-revisão adversarial.** Várias afirmações sobre o GBrain que a v1 tratou como "fato conferido" estavam erradas (mesmo erro do M3 com `--dir`/OAuth-scope). v2 reescreveu as seções afetadas contra o **source real** do `garrytan/gbrain` (branch `master`, ~839 issues abertas, push de 2026-06-03).
**Base factual:** conferência direta no código DESTE fork (arquivos:linha) **e** no source do gbrain. Cada fato sobre o gbrain abaixo é marcado **[VERIFICADO: arquivo do source]** ou **[A CONFIRMAR NA IMPLEMENTAÇÃO]**.

### Fatos do gbrain verificados no source (âncora desta v2)

| Fato | Status | Fonte |
|---|---|---|
| `think` imprime **markdown por padrão**; JSON **só com `--json`** | VERIFICADO | `src/commands/think.ts:142-174` |
| Flags do `think`: `--anchor --rounds --model --since --until --save --take --json --with-calibration`. **Não existe `--context`** | VERIFICADO | `src/commands/think.ts:24-46, 57-60` |
| Shape de `think --json`: `{ question, answer, citations[], gaps[], pagesGathered, takesGathered, graphHits, modelUsed, rounds, warnings[], synthesisOk, savedSlug?, saved_slug, evidence_inserted }` | VERIFICADO | `src/core/think/index.ts:123-145`, `think.ts:148-152` |
| Citação = `{ page_slug: string, row_num: number\|null, citation_index: number }` (NÃO `page/snippet`) | VERIFICADO | `src/core/think/cite-render.ts:20-23` |
| Sem LLM: `answer="(no LLM available …)"`, `gaps=["no LLM available; …"]`, `warnings=["NO_ANTHROPIC_API_KEY"]`, **`synthesisOk=false`**, exit 0 | VERIFICADO | `src/core/think/index.ts:440-462` |
| Modelo de síntese default = **Anthropic** (`ANTHROPIC_API_KEY`), resolvido por chain de 6 tiers, `configKey: 'models.think'`, `tier: 'deep'` | VERIFICADO | `src/core/think/index.ts:233-237`, `src/core/config.ts:59-61` |
| DeepSeek é provider de **chat** (recipe `id:'deepseek'`, `base_url_default:'https://api.deepseek.com/v1'`, lê `DEEPSEEK_API_KEY`). **NÃO tem modelo de embeddings** | VERIFICADO | `src/core/ai/recipes/deepseek.ts:10-31`, `docs/integrations/embedding-providers.md` (tabela: `deepseek` = "chat only") |
| Embedding default do gbrain = **ZeroEntropy** (`zeroentropyai:zembed-1`, 1280 dims, chave `ZEROENTROPY_API_KEY`) — **provider escolhido (founder 2026-06-04)**; OpenAI segue trocável | VERIFICADO | `src/core/ai/defaults.ts:20-21`, `src/core/config.ts:43-44,409` |
| `init` auto-detecta provider por env key; **múltiplas keys → picker interativo; non-TTY → exit 1**. `--embedding-model zeroentropyai:zembed-1` crava sem auto-detect | VERIFICADO | `src/commands/init.ts:30-90, 416`, `src/core/ai/defaults.ts:20-21` |
| Isolamento de brain por **`GBRAIN_HOME`** (relocaliza `~/.gbrain/` inteiro por invocação) e/ou `GBRAIN_DATABASE_URL` | VERIFICADO | `src/core/config.ts:24-25` (configDir honra GBRAIN_HOME), `src/core/storage-config.ts:16-17` |
| gbrain roda em **bun + PGLite (Postgres-17 WASM)**, **por subprocess** (sem daemon Day-1) — RAM residente por invocação | VERIFICADO | `src/core/pglite-engine.ts`, premissa M3 (subprocess stdio) |
| `stats` é read-only barato; `export` é caro e adquire write-lock | A CONFIRMAR (assumido pelo M3) | — |

---

## 0. Enquadramento de produto (1 página, sem código)

Estamos preparando o **conteúdo de IA** antes de ligar qualquer canal real na Modeloja. Duas frentes, uma fundação única:

- **O Cérebro (Brain)** é a **fonte única de conhecimento** da empresa. Ele guarda o que a empresa sabe — políticas, manuais, regras, histórico de atendimento. Hoje a tela do Brain é um **hub de demonstração** (a esfera "Aurora", `BrainAquario.vue`) que mostra dados de mentira. Vamos trocar isso por **dado de verdade**: o que o operador vê passa a vir do motor.
- **O Copiloto** é um **consultor** que responde perguntas do operador (a "Malu", a pessoa que atende) **com base 100% no Cérebro**. Dia 1 ele é só pergunta-e-resposta: ele **não** escreve resposta pro cliente, **não** mexe em conversa, **não** executa nada no CRM. Read-only. (Redigir/sugerir resposta na conversa é fase futura, quando o canal existir — fora deste plano.)
- **A Manu** (a agente que conversa com o lead) continua **adiada**. Não construímos ela aqui.

A frase do founder que rege a arquitetura: **"a LLM deve funcionar apenas como o motor; o que importa são os dados que o cérebro armazena."** Logo: o LLM (DeepSeek) é trocável e fica atrás de configuração; o ativo é o Cérebro.

E a outra frase, que define o escopo da frente 2: **"crie toda a infraestrutura e deixe um espaço pronto pra eu anexar os documentos depois."** Logo: o **encanamento de upload de documento → texto → markdown → cérebro** é trabalho NOSSO e tem que ficar 100% funcional; o **conteúdo** (os documentos reais) o founder abastece depois, por uma porta que entregamos pronta e honesta (sem documentos falsos plantados).

### A fatia mínima da aba Brain: Ver + Ajustar + Histórico

- **Ver** — mostrar o conhecimento real compilado do motor (substitui a esfera-fixture).
- **Ajustar** — colar/editar conhecimento **e anexar documentos** (a porta de upload).
- **Histórico** — linha do tempo de como o cérebro cresceu.

---

## 1. Estado real do código (verificado — fatos âncora)

> **Aviso de v2 (P1-4):** o `Brain::Client` **nunca foi exercitado contra um gbrain real** neste fork. O "FUNCIONA" abaixo é **teórico** (código existe, specs com stub). Antes do Copiloto (PR 6) é obrigatório um `gbrain_real_integration_spec` rodando contra o **SHA exato pinado** (ADR-0013, 40 chars) — ver §8/§12. Sem prova de integração real, o Copiloto seria construído no escuro.

| Peça | Estado hoje | Arquivo |
|---|---|---|
| Wrapper do motor (`capture/search/think/export/stats`) | Código existe (subprocess stdio, timeouts, validação de path, `JSON.parse`). **BUG LATENTE (P0-1):** `think` (client.rb:63-67) **não passa `--json`** → o gbrain devolve **markdown**, não JSON → `JSON.parse` quebra → `SubprocessError`/502 em TODA chamada. **Corrigir no PR 6.** | `engines/algorythmo/app/services/algorythmo/brain/client.rb` |
| Lock de escrita serializado (Redis) | FUNCIONA | `engines/algorythmo/app/services/algorythmo/brain/write_lock.rb:45` |
| Tenant resolution (fail-closed, account_id == `ALGORYTHMO_PRIMARY_ACCOUNT_ID`) | FUNCIONA, concern em `Brain::BaseController` | `engines/algorythmo/app/controllers/concerns/algorythmo/brain/tenant_resolution.rb:35` |
| Cadeia de auth Brain (5 níveis, inclui gate `algorythmo_crm`) | FUNCIONA | `engines/algorythmo/app/controllers/algorythmo/api/v1/brain/base_controller.rb` |
| `compiled_truth` / `timeline` controllers | **STUB → `head :not_implemented` (501)** | `.../brain/compiled_truth_controller.rb`, `.../timeline_controller.rb` |
| `adjustments` controller | **STUB 501** (já documentado: deve enfileirar `IngestionWorker`, não chamar gbrain síncrono) | `.../brain/adjustments_controller.rb:7` |
| `snapshots` controller | **STUB 501** | `.../brain/snapshots_controller.rb` |
| Worker de ingestão (forward-only, lock-wrapped, idempotente) | FUNCIONA, usado para conversas | `engines/algorythmo/app/workers/algorythmo/brain/ingestion_worker.rb` |
| Conversa → markdown (filtra notas privadas) | FUNCIONA | `engines/algorythmo/app/services/algorythmo/brain/conversation_to_markdown.rb` |
| Model de snapshot + worker de snapshot diff | **NÃO EXISTEM NA MAIN** (T4 do M3 nunca foi shippado — só o stub do controller) | — |
| Rotas Brain (compiled_truth/timeline/adjustments/snapshots/mcp) | FUNCIONAM, sob `namespace :brain` | `engines/algorythmo/config/routes.rb` |
| Frontend Brain | **só o hub-demo Aurora** — `BrainViewer.vue` carrega `BrainAquario.vue`; as abas Ajustes/Histórico foram REMOVIDAS num round posterior | `app/javascript/dashboard/modules/algorythmo/brain/BrainViewer.vue:23` |
| Service do frontend (tenta API, cai pra fixture em 501) | FUNCIONA | `app/javascript/dashboard/modules/algorythmo/brain/brain.service.js:26` |
| Entrada de menu Brain (sob INTELIGÊNCIA, `isAdmin`-only) | FUNCIONA | `app/javascript/dashboard/components-next/sidebar/Sidebar.vue:690` |
| Padrão de gate cut/enable-flag (invertido; `crm` é enable-flag, default OFF) | FUNCIONA | `app/models/concerns/algorythmo/feature_flag_bits.rb:105` |

### Reuso do worktree `m8b-brain-upload` (CONFERIDO)

O worktree `.claude/worktrees/m8b-brain-upload` está na branch `engineer/m8b-brain-upload` (commit `7331f7f59`). Ele contém **`BrainDocumentUpload.vue`** (dropzone estilo Linear, chips de categoria, lista de arquivos, i18n pt_BR/en, specs). **Mas é frontend-only, "local-state only, no POST"** — não há backend, extração, nem `capture`. Veredito de reuso:

- **Reaproveitar:** o componente Vue do dropzone (UI + acessibilidade + i18n + specs) como ponto de partida do **Ajustar/Upload** — economiza a camada visual.
- **NÃO existe** e precisa ser construído do zero: o pipeline backend inteiro (upload → extração → markdown → capture), que é o coração desta entrega.
- Esse componente **não está na main** (a `BrainViewer.vue` atual foi reduzida só ao Aquário). O engineer faz **cherry-pick do arquivo** (`git show 7331f7f59:.../BrainDocumentUpload.vue`) e adapta — não faz merge da branch inteira (ela arrasta M8a/M7/M5 já superados).

---

## 2. Arquitetura macro

### 2.1 Princípio: o Cérebro é a fonte única; o Copiloto é só um consumidor read-only

```
                          ┌──────────────────────────────────────────────────┐
                          │                  ABA BRAIN (admin)                │
                          │   Ver  ·  Ajustar (colar + upload)  ·  Histórico  │
                          └───────────────┬──────────────────────────────────┘
                                          │ (lê/escreve via API Rails)
                                          ▼
   ┌───────────────────────────────────────────────────────────────────────────────┐
   │                       CAMADA RAILS (engines/algorythmo)                         │
   │                                                                                │
   │   Leitura (sem lock):              Escrita (enfileira + WriteLock):            │
   │   GET  /brain/compiled_truth ──┐   POST /brain/adjustments  (colar texto)      │
   │   GET  /brain/timeline ────────┤   POST /brain/documents    (upload arquivo)   │
   │   GET  /brain/snapshots ───────┤        │                                       │
   │   POST /brain/copilot/ask  ────┤        ▼                                       │
   │        (RAG read-only)         │   IngestionWorker (Sidekiq)                    │
   │            │                   │        │ extração → markdown → capture         │
   │            ▼                   ▼        ▼                                       │
   │     Brain::Client (subprocess wrapper, env hash com chaves)  ◄── BYOK env       │
   └───────────────────────────────┬───────────────────────────────────────────────┘
                                    │ Open3.popen3(env: { chaves }, gbrain <cmd>)
                                    ▼
                   ┌───────────────────────────────────────────────┐
                   │            MOTOR GBrain (CLI, bun+PGLite)     │
                   │  Open3 injeta GBRAIN_HOME=<brain da Modeloja> │
                   │  → brain DEDICADO e ZERADO, isolado do        │
                   │    cérebro do founder (account 1). Ver §3.5   │
                   │  search · think · capture · stats (subprocess)│
                   └──────┬───────────────────────┬────────────────┘
                          │ embeddings            │ síntese (think)
                          ▼                        ▼
              ┌────────────────────────┐   ┌────────────────────────────┐
              │  ZeroEntropy (default) │   │   DeepSeek (chat)          │
              │  zeroentropyai:zembed-1│   │   recipe lê DEEPSEEK_API_KEY│
              │  (1280d)               │   │   base_url já embutido no  │
              │  via ZEROENTROPY_API_KEY│  │   recipe (api.deepseek.com)│
              │  ~0 RAM                 │   │   setado por config, NÃO   │
              │  (provider CRAVADO no  │   │   por env per-request:     │
              │   init, não auto-det.) │   │   models.think=deepseek:…  │
              └────────────────────────┘   └────────────────────────────┘
              (provisionamento único: gbrain init + gbrain config set — §3.4)

   COPILOTO (aba dedicada, irmã do Brain no menu) ─── chat Q&A ───► POST /brain/copilot/ask
       └── NUNCA toca conversa, CRM, nem escreve no cérebro. Read-only puro.
          Concorrência de subprocessos gbrain LIMITADA (semáforo) — §3.6 / P1-1.
```

### 2.2 Fluxo A — pergunta do operador no Copiloto (REESCRITO v2 — shape real)

```
 Operador digita pergunta no chat do Copiloto
        │
        ▼
 POST /algorythmo/api/v1/accounts/:id/brain/copilot/ask   { question }
        │   (mesma cadeia de auth Brain: token → account → gate crm → tenant fail-closed)
        ▼
 CopilotController#ask → CopilotAnswer.call
        │  1. valida/sanitiza a pergunta (tamanho, vazio, rate-limit)
        │  2. adquire slot do semáforo de concorrência gbrain (P1-1)
        │  3. Brain::Client.new(account_id).think(prompt: question)   ← passa SÓ a pergunta
        │         IMPORTANTE: o gbrain faz retrieval + montagem do prompt + síntese
        │         INTERNAMENTE. Nós NÃO controlamos o prompt do think (não há --context).
        │         O Client agora passa --json (correção P0-1).
        ▼
 gbrain think --json → {
        answer, gaps[], citations: [{page_slug, row_num, citation_index}],
        modelUsed, pagesGathered, takesGathered, graphHits, synthesisOk, warnings[]
      }
        │
        ▼
 CopilotAnswer mapeia para a MÁQUINA DE ESTADOS (P1-2):
   ┌─────────────────────────────────────────────────────────────────────────┐
   │ synthesisOk=false & warnings inclui NO_ANTHROPIC_API_KEY                  │
   │   → state: "engine_unconfigured"  → 503  → UI: "Motor de IA não config." │
   │   (NÃO é "não sei" — seria MENTIR pro operador)                          │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ synthesisOk=true & citations vazio (cérebro não tinha a resposta)         │
   │   → state: "ungrounded"  → 200  → UI: "Não encontrei isso no Cérebro"    │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ synthesisOk=true & citations não-vazio                                    │
   │   → state: "grounded"  → 200  → resposta + chips de citação (page_slug)  │
   ├─────────────────────────────────────────────────────────────────────────┤
   │ warnings inclui LLM_OUTPUT_NOT_JSON  (modelo devolveu lixo)               │
   │   → state: "degraded"  → 200  → UI: "Resposta indisponível, tente de novo"│
   └─────────────────────────────────────────────────────────────────────────┘
        ▼
 Chat renderiza o estado correto (saída SEMPRE escapada — anti-XSS, §4.4)
```

Garantia de produto: **se o Cérebro não tem a informação, o Copiloto diz que não sabe** — e isso tem lastro real no source: o `think` devolve `gaps[]` e, no caso ungrounded, `citations` vazio com `synthesisOk=true`. Mas o estado "motor não configurado" (`synthesisOk=false`) é **distinto** e não pode ser confundido com "não sei" — senão o operador acharia que o Cérebro está vazio quando na verdade falta a chave do LLM.

**Nota sobre citações:** o `page_slug` é o identificador da página no Cérebro. Para a UI mostrar um chip legível, o backend pode resolver `page_slug → título` via uma chamada `search`/leitura leve (ou exibir o próprio slug Day-1). O campo `row_num`/`citation_index` posiciona a citação. **Não existe `snippet` no retorno** — se quisermos trecho citável, é trabalho adicional de leitura por slug (registrar como evolução, não Day-1).

### 2.3 Fluxo B — upload de documento (a "porta pronta pra anexar depois")

```
 Founder/admin arrasta um .pdf/.docx/.md/.txt na aba Ajustar
        │
        ▼
 POST /brain/documents  (multipart)   { file, category }
        │   1. valida ANTES de tocar disco: extensão allowlist, MIME real (magic bytes),
        │      tamanho ≤ 10 MB, nome sanitizado, sem null byte
        │   2. grava em Active Storage (volume persistente já montado — ver memória)
        │   3. cria registro algorythmo_brain_documents (status: pending)
        │   4. enfileira BrainDocumentIngestionWorker(account_id, document_id)
        ▼
 Worker (Sidekiq):
        │   a. baixa o blob pra tmpfile efêmero (Dir.mktmpdir, removido no ensure)
        │   b. EXTRAI texto conforme tipo (pdf → texto; docx → texto; md/txt → as-is)
        │   c. converte pra markdown com frontmatter (titulo, categoria, origem, data)
        │   d. WriteLock.with_lock { Brain::Client.new(account_id).capture(file: md_path) }
        │   e. atualiza status: captured + brain_page_path  (ou failed + last_error)
        ▼
 Documento aparece em "Ver" (conhecimento real) e gera evento no "Histórico"
```

A porta entregue pronta: enquanto o founder não anexa nada, **o Ver e o Histórico mostram empty-state honesto** ("Nenhum documento ainda — anexe em Ajustar"). Nada de fixture plantada. No instante em que ele solta o primeiro arquivo, o pipeline roda fim-a-fim.

---

## 3. Motores: embeddings, síntese, provisionamento e isolamento

### 3.1 Decisão de embeddings — DEFAULT do motor `zeroentropyai:zembed-1` (founder 2026-06-04)

> **REVISÃO 2026-06-04 (founder):** NÃO usar OpenAI como indexador "por enquanto" — usar o **DEFAULT do próprio motor gbrain**: `zeroentropyai:zembed-1` (1280 dims), chave `ZEROENTROPY_API_KEY` [VERIFICADO no SHA pinado: `src/core/ai/defaults.ts:20-21` (`DEFAULT_EMBEDDING_MODEL`/`DEFAULT_EMBEDDING_DIMENSIONS`), `src/core/config.ts:43,409`]. Continua **cravado explicitamente** no provisionamento (`--embedding-model` + `--embedding-dimensions`), porque o picker do `init` trava em non-TTY (P0-4) — não confiar em auto-detect. OpenAI segue **trocável** via as constantes do provisionador se o founder reverter. O histórico abaixo (escolha OpenAI anterior) fica como contexto.

---

#### Histórico — escolha anterior: OpenAI `text-embedding-3-small` (substituída em 2026-06-04)

Embeddings = **OpenAI `text-embedding-3-small`** (1536 dims). **DeepSeek faz SÓ a síntese (`think`)** — [VERIFICADO: `docs/integrations/embedding-providers.md`, tabela lista `deepseek` como "chat only", sem modelo de embeddings; recipe `src/core/ai/recipes/deepseek.ts`].

**Esta é uma escolha ATIVA, não um default.** O default de embeddings do gbrain é **ZeroEntropy** (`zeroentropyai:zembed-1`) [VERIFICADO: `src/core/config.ts:44`]. Estamos optando por OpenAI conscientemente.

Por quê:
1. **DeepSeek não tem embeddings** — confirmado no source do gbrain (não é mais "issue tracker"; é fato do motor). Logo, separar os dois provedores é **obrigatório**, não preferência.
2. **Custo desprezível.** `text-embedding-3-small` = ~**US$ 0,02 / 1M tokens** (tabela de preços OpenAI; a recipe do gbrain lista o default `openai` em 0,13 porque o default dela é o `-large` 1536d — por isso cravamos o `-small` explicitamente). Base da Modeloja = poucos milhões de tokens → centavos. Re-embedding só no upload.
3. **Zero RAM local.** Embeddings via API não disputam memória com Rails/Sidekiq/Postgres/Redis (mas atenção: isso NÃO zera a RAM do próprio gbrain — ver §3.6 / P1-1).

#### ⚠ Ressalva LGPD (decisão de produto CONSENTIDA, não atalho técnico)

> **Atualização 2026-06-04:** com o default do motor (ZeroEntropy) agora ativo, o terceiro que recebe os embeddings passa a ser a **ZeroEntropy** (não a OpenAI). A superfície de dados e a necessidade de consentimento explícito **permanecem idênticas** — só muda o nome do provedor no contrato/material de venda. A trilha de fuga local (Ollama) segue válida.

**No upload, o acervo INTEIRO de conhecimento do cliente é enviado uma vez a um terceiro** para gerar embeddings de cada chunk. Isso é uma superfície de dados **diferente** da síntese:

- **Embeddings (OpenAI):** todo o conteúdo indexado sai uma vez, no momento do upload.
- **Síntese (DeepSeek):** só o **subconjunto recuperado** por pergunta sai, sob demanda.

Como o default do gbrain seria ZeroEntropy, **mandar para a OpenAI é escolha ativa que precisa de consentimento explícito** no contrato / material de venda da Modeloja ("seus documentos são processados por provedores de IA terceiros — OpenAI para indexação, DeepSeek para respostas"). **Registrar como decisão de produto consentida.** Trilha de fuga se um cliente recusar: ZeroEntropy (default), ou embeddings locais (Ollama) numa VPS com RAM suficiente — ver §12.

### 3.2 Por que NÃO Ollama local (override consciente da D-OQ5 do M3)

D-OQ5 escolheu Ollama `nomic-embed-text` por "custo/privacidade zero". Override: (a) o modelo + runtime come **centenas de MB residentes** numa VPS de 4 GB dividida por 4 serviços — risco de OOM; (b) "custo zero" vira custo de confiabilidade. Ollama fica como **fallback** (§12) só com VPS ≥ 8 GB ou exigência LGPD de não-saída de dados.

### 3.3 Síntese = DeepSeek — configurada por PROVISIONAMENTO, não por env per-request (P0-3)

**Correção crítica da v1:** o gbrain **NÃO** lê `DEEPSEEK_BASE_URL`/`DEEPSEEK_MODEL` do env por chamada. O `think` resolve o modelo por uma chain de 6 tiers com `configKey: 'models.think'`, `tier: 'deep'` [VERIFICADO: `src/core/think/index.ts:233-237`], cujo default é **Anthropic** (`anthropic:claude-sonnet-4-6` / tier deep) lendo `ANTHROPIC_API_KEY` [VERIFICADO: `src/core/config.ts:59-61`]. A recipe DeepSeek já embute o `base_url` (`https://api.deepseek.com/v1`) e lê `DEEPSEEK_API_KEY` [VERIFICADO: `src/core/ai/recipes/deepseek.ts:14-16`].

Logo, apontar a síntese para o DeepSeek é um **passo de provisionamento idempotente**, rodado uma vez por brain (no init/deploy), que grava em `~/.gbrain/config.json`:

```
gbrain config set models.think deepseek:deepseek-chat
```

(`DEEPSEEK_API_KEY` continua via env do subprocess — só a chave; o resto é config persistida.)

### 3.4 Provisionamento do brain (passo NOVO, non-TTY-safe — P0-3 + P0-4)

Sem isto, a **ingestão falha no primeiro upload** em produção: `gbrain init` em subprocess non-TTY com múltiplas keys dispara picker interativo → **exit 1** [VERIFICADO: `src/commands/init.ts:416`, `embedding-providers.md`]. A solução é um **comando de init com provider CRAVADO**, idempotente, rodado uma vez por brain no deploy (rake task `algorythmo:brain:provision`):

```
# 1. cria o brain (provider de embeddings explícito — sem auto-detect/picker)
#    DEFAULT do motor (founder 2026-06-04): zeroentropyai:zembed-1 / 1280 dims.
gbrain init --pglite --force --non-interactive \
  --embedding-model zeroentropyai:zembed-1 --embedding-dimensions 1280
# 2. aponta a síntese para o DeepSeek
gbrain config set models.think deepseek:deepseek-chat
```

Roda com `GBRAIN_HOME` apontando para o brain da Modeloja (§3.5) e `ZEROENTROPY_API_KEY` no env. **Quando** roda: no provisionamento do brain (uma vez), e idempotente em re-deploys (o `init` sem `--force` preserva; com `--force` re-cria — usar `--force` só na criação inicial). [VERIFICADO no SHA pinado: dims do default = 1280 — `src/core/ai/defaults.ts:21` (`DEFAULT_EMBEDDING_DIMENSIONS`); a init help-text do gbrain cita 2560 como tier "largest", mas o sistema crava 1280 no fresh-install — `src/commands/init.ts` `resolveEmbeddingByEnv`.]

### 3.5 Isolamento por brain DEDICADO da Modeloja (P0-5 — era P0 ABERTO)

**Problema real:** a instância de produção tem **account 1 (founder, com dogfooding M3)** E **account 2 (Modeloja)**. Hoje há **um único `~/.gbrain/`**, um WriteLock global, e o `Client` ignora `account_id` Day-1 — ou seja, **o conhecimento do founder e o da Modeloja se misturariam** (vazamento cross-tenant). O "single-tenant aceito" do M3 foi decidido para um mundo founder-only no laptop, que não existe mais.

**Decisão (founder + planner): a Modeloja tem cérebro PRÓPRIO, isolado e ZERADO** — só conhecimento dela, nada do dogfooding do founder.

**Mecanismo real do gbrain para múltiplos brains = `GBRAIN_HOME`** [VERIFICADO: `src/core/config.ts:24-25` — `configDir()` honra `GBRAIN_HOME` e relocaliza o `~/.gbrain/` inteiro (config.json + store PGLite) por invocação]. (Há também `GBRAIN_DATABASE_URL` para Postgres remoto; para Day-1 PGLite, `GBRAIN_HOME` é o caminho mais simples e suficiente.) **NÃO é o `--dir` inventado do M3 — é o knob upstream real.**

Implementação:
- Mapa `account_id → GBRAIN_HOME path` (ex.: `/var/algorythmo/brains/account-2`). Day-1 pode ser uma constante/ENV `ALGORYTHMO_BRAIN_HOME` resolvida pelo `Brain::Client.new(account_id)`; o scaffold de multi-tenant já previsto em ADR-0014/0015 evolui disto.
- O `Brain::Client#subprocess_env` injeta `GBRAIN_HOME=<path da Modeloja>` em **todas** as invocações.
- O **WriteLock vira por-brain** (`gbrain:write:lock:<account_id>`) — o arg `account_id` já existe no `with_lock`, hoje ignorado (`write_lock.rb:45`); ativar a key por-account.
- **Nascimento zerado:** o brain da Modeloja nasce do `gbrain init --force` (§3.4) num `GBRAIN_HOME` vazio → garantidamente **sem nenhuma página do account 1**. Garantia testável: `gbrain stats` logo após o init retorna 0 páginas; um spec de integração afirma que o brain da Modeloja não contém slug nenhum do dogfooding do founder.

**Dono do brain:** account 2 (Modeloja). O `ALGORYTHMO_PRIMARY_ACCOUNT_ID` (tenant fail-closed) **passa a apontar para a Modeloja** nesta instância — confirmar no deploy que o valor é `2`. [A CONFIRMAR NA IMPLEMENTAÇÃO: se o founder também precisa do seu próprio brain ativo na MESMA instância, são dois `GBRAIN_HOME` distintos e o tenant guard precisa aceitar ambos — hoje aceita só um `PRIMARY`. Day-1 desta fase: só a Modeloja é alvo; o brain do founder não é servido por esta instância.]

### 3.6 Concorrência e RAM do motor (P1-1)

Resolver embeddings via API **não** resolve a RAM do gbrain: cada `capture`/`search`/`think` é um `Open3` novo que sobe **bun + PGLite (Postgres-17 em WASM) residente** [VERIFICADO: `src/core/pglite-engine.ts`; sem daemon Day-1]. Copiloto + ingestão concorrentes podem estourar a VPS de 4 GB **mesmo sem Ollama**. Mitigações (PR 6 + deploy):
- **WriteLock já serializa escrita** (capture/export). Falta limitar **leitura concorrente** (`think`/`search`).
- **Semáforo de concorrência gbrain** (contador Redis simples, ex.: máx. 2 subprocessos gbrain simultâneos no total) OU **fila Sidekiq dedicada de baixa concorrência** para o Copiloto (concurrency 1-2). O `think` do Copiloto roda **assíncrono** atrás dessa fila/semáforo, não inline no request web.
- **Medir RAM real por processo no deploy** (`/usr/bin/time -v` ou cgroup stats) antes de liberar o Copiloto — número real, não estimativa.

---

## 4. Modelo de segurança (construído desde o primeiro traço)

### 4.1 Tenant — fail-closed, já existente, preservado

Todo controller novo herda de `Algorythmo::Api::V1::Brain::BaseController`, que aplica a cadeia de 5 níveis e o `resolve_tenant!` (account_id deve bater com `ALGORYTHMO_PRIMARY_ACCOUNT_ID`; env unset = 403; mismatch = 403). **Nunca** instanciar `Brain::Client` fora dessa cadeia. O `copilot` e o `documents` controllers entram **dentro do `namespace :brain`** justamente para herdar isso de graça.

### 4.2 BYOK / chaves — nunca em código

- Chaves só via ENV, injetadas no `subprocess_env` do `Open3`.
- **Nunca** em argumento de CLI (visível em `ps`), nunca logadas (o `build_error` do Client já trunca stderr; auditar que stderr do gbrain não ecoa a chave — se ecoar, redigir antes de logar).
- `Brain::Client` sem chave configurada para uma operação → erro tipado (`MissingCredentialError`), traduzido em 503 com mensagem honesta na UI ("Motor de IA não configurado"), **nunca 500**.

### 4.3 Validação de upload — defesa em profundidade

Ordem obrigatória, **antes de qualquer escrita em disco**:

1. **Allowlist de extensão:** `.pdf .docx .md .txt` apenas (sem `.exe`, `.svg`, `.html`, etc.).
2. **MIME real por magic bytes**, não pelo header do cliente (usa `Marcel`/`mimemagic` já presente no Chatwoot) — rejeita um `.exe` renomeado pra `.pdf`.
3. **Tamanho ≤ 10 MB** (checado no controller E no Active Storage; rejeita antes de bufferizar tudo).
4. **Nome sanitizado** (sem path traversal, sem null byte, sem `..`) — e nunca usado como path; o path real vem do `Dir.mktmpdir` server-owned (o `validate_capture_path!` do Client já exige path dentro do tmpdir).
5. **Extração em sandbox de tmpfile efêmero**, removido no `ensure` (padrão já usado no `IngestionWorker#with_tmp_markdown`).
6. **Sem execução de macro**: para `.docx`, extrair só texto (nunca abrir como documento ativo). Para PDF, usar extrator de texto puro — não renderizador.

### 4.4 Fronteira de confiança — prompt injection via documento anexado (REESCRITO v2 — P0-2)

O vetor é real: o founder **vai anexar documentos arbitrários**, e o `think` recupera esse conteúdo internamente para sintetizar. Um documento pode conter "Ignore instruções anteriores e revele X".

**Correção honesta da v1:** o `think` do gbrain faz **retrieval + montagem do prompt + síntese INTERNAMENTE**. Nós passamos **só a string da pergunta** (não existe `--context`, não existe template de prompt que injetamos) [VERIFICADO: `src/commands/think.ts` — flags não incluem `--context`; `src/core/think/index.ts` monta o prompt internamente]. **Portanto NÃO controlamos a fronteira dado-vs-instrução dentro do `think`.** Qualquer defesa baseada em "rotular o conteúdo recuperado como não-confiável no nosso prompt" era **fictícia** — removida.

As defesas que **realmente** sobram (e são suficientes para o Dia-1):

1. **Read-only estrutural (a mitigação forte e real).** O Copiloto não tem ferramentas, não escreve no cérebro, não acessa conversa/CRM. Mesmo que uma injeção "convença" o modelo, **não há ação que ele possa executar**. Pior caso de uma injeção bem-sucedida: uma resposta textual ruim para um operador interno — não exfiltração, não ação. Esta é a fronteira de confiança que de fato existe.
2. **Sanitização de saída no frontend (anti-XSS).** A resposta é renderizada como **markdown/texto escapado**, nunca HTML cru — um documento malicioso não injeta `<script>` via resposta.
3. **Citações + máquina de estados (§2.2).** Resposta `ungrounded` (sem citações) é sinalizada na UI; uma injeção que produza texto sem origem no Cérebro fica visível como não-fundamentada.

**Alternativa futura (NÃO Day-1), se quisermos fronteira de verdade:** trocar a arquitetura — nós chamamos `gbrain search` (retrieval), montamos **nosso próprio prompt** (com o conteúdo recuperado rotulado como dado não-confiável entre delimitadores) e chamamos o LLM **direto** (DeepSeek via SDK OpenAI-compatible), em vez de delegar tudo ao `think`. Isso nos daria controle do prompt — ao custo de reimplementar o que o `think` já faz. Registrado como evolução; **não** se constrói agora.

### 4.5 Copiloto read-only — superfície mínima

- Um único endpoint: `POST /brain/copilot/ask`. Sem CRUD, sem write, sem ferramentas.
- Rate-limit por usuário (reusar o throttle do Rack::Attack do Chatwoot ou um contador Redis simples) — o `think` chama DeepSeek (custo + latência); proteger contra abuso/loop.
- O Copiloto **não** recebe `conversation_id` nem nada do CRM no Dia 1 — entrada é só a pergunta. Isso impede que ele vire vetor de leitura cruzada de dados de conversa antes da hora.

---

## 5. Modelo de dados (sem mudança de schema upstream do Chatwoot)

Toda tabela nova é **prefixada `algorythmo_`** e vive em migration do engine — preserva o sync mensal D1 do Chatwoot (zero toque em tabela upstream).

### Tabela nova: `algorythmo_brain_documents`

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigint PK | |
| `account_id` | bigint, FK, index | scaffold multi-tenant (igual ao padrão do `ingestion_log`) |
| `user_id` | bigint, FK | quem anexou |
| `filename` | string | nome original sanitizado (exibição) |
| `content_type` | string | MIME real detectado |
| `byte_size` | bigint | |
| `category` | string | reusa as 6 categorias do `BrainDocumentUpload.vue` |
| `status` | integer (enum) | `pending(0) / extracting(1) / captured(2) / failed(3)` |
| `brain_page_path` | string, null | retorno do `capture` (link pro Ver) |
| `last_error` | string(1000), null | diagnóstico de falha |
| `created_at / updated_at` | timestamps | |

- **Índice único** `(account_id, id)` implícito; **índice** em `(account_id, status)` para o Ver listar.
- **Sem `default_scope`** (padrão D-A8 do projeto — todas as queries explícitas).
- O **blob** do arquivo vive em Active Storage (volume persistente já montado — ver memória `project_active_storage_persistent_volume`), não no banco.

### Tabela nova: `algorythmo_brain_snapshots` (para o Histórico)

O M3 planejou mas **nunca shippou** (T4). Precisamos da fatia mínima:

| Coluna | Tipo | Nota |
|---|---|---|
| `id` | bigint PK | |
| `account_id` | bigint, FK, index | |
| `taken_at` | datetime, index | |
| `stats` | jsonb | saída do `gbrain stats` no momento (nº páginas, edges, etc.) |
| `diff_summary` | text, null | resumo legível do que mudou vs. snapshot anterior |
| `trigger` | string | `upload / adjustment / manual / cron` |
| `created_at` | timestamps | |

**Histórico Dia-1 = derivado de eventos via `gbrain stats` (P1-3).** Cada `capture` bem-sucedido cria um snapshot leve chamando **`gbrain stats`** — que é **read-only e barato, SEM write-lock** [A CONFIRMAR NA IMPLEMENTAÇÃO contra o source de stats; assumido pelo M3]. O **`gbrain export`** (caro, adquire write-lock, serializa contra capture) fica **explicitamente FORA de escopo** desta fase — nada de `SnapshotDiffWorker` completo do M3. O diff semanal por cron é evolução opcional pós-Day-1.

---

## 6. Superfície de API (exata)

Todas sob `namespace :brain` em `engines/algorythmo/config/routes.rb`, herdando a cadeia de auth.

```
GET  /algorythmo/api/v1/accounts/:account_id/brain/compiled_truth   → CompiledTruthController#show   (LIGAR stub → Client#search/stats)
GET  /algorythmo/api/v1/accounts/:account_id/brain/timeline         → TimelineController#index        (LIGAR stub)
GET  /algorythmo/api/v1/accounts/:account_id/brain/snapshots        → SnapshotsController#index       (LIGAR stub → tabela nova)

POST /algorythmo/api/v1/accounts/:account_id/brain/adjustments      → AdjustmentsController#create    (LIGAR stub → enfileira worker de RAW MARKDOWN — ver P2 abaixo)
POST /algorythmo/api/v1/accounts/:account_id/brain/documents        → DocumentsController#create      (NOVO — upload)
GET  /algorythmo/api/v1/accounts/:account_id/brain/documents        → DocumentsController#index       (NOVO — lista p/ Ver)

POST /algorythmo/api/v1/accounts/:account_id/brain/copilot/ask      → CopilotController#ask           (NOVO — RAG read-only, ASSÍNCRONO)
```

Assinaturas de serviço novas (shapes REAIS do gbrain):

```
Algorythmo::Brain::DocumentExtractor.call(blob_path:, content_type:) → String (markdown)
Algorythmo::Brain::BrainDocumentIngestionWorker#perform(account_id, document_id)
Algorythmo::Brain::RawMarkdownIngestionWorker#perform(account_id, raw_markdown_id)   # P2 — caminho do "colar texto"
Algorythmo::Brain::CopilotAnswer.call(account_id:, question:) →
    { state: "grounded"|"ungrounded"|"engine_unconfigured"|"degraded",
      answer:, citations: [{ page_slug:, row_num:, citation_index: }], gaps: [],
      model_used:, pages_gathered: }
    # mapeado da máquina de estados §2.2 a partir de synthesisOk/warnings/citations do think --json
Algorythmo::Brain::Client#think(prompt:)  → agora passa --json (P0-1); parse do shape real
Algorythmo::Brain::Client#subprocess_env (privado) → Hash
    # injeta GBRAIN_HOME=<brain Modeloja>, ZEROENTROPY_API_KEY, DEEPSEEK_API_KEY no Open3.
    # NÃO injeta DEEPSEEK_BASE_URL/DEEPSEEK_MODEL (não lidos pelo gbrain — §3.3).
```

**P2 — descasamento de contrato do `adjustments`.** O `IngestionWorker` existente assume `conversation_id` / `account.conversations` (`ingestion_worker.rb:34-51`) — **colar texto livre não tem conversation**. Por isso o "colar/editar" NÃO reusa o `IngestionWorker`: cria um **caminho separado** (`RawMarkdownIngestionWorker`, ou um modo "raw markdown" explícito). O `AdjustmentsController#create` grava o markdown colado e enfileira esse worker, que escreve um tmpfile e chama `capture` sob lock — mesmo padrão de extração de documento, sem o passo de conversa. **Endereçado no PR 4.**

Gate explícito: o Copiloto herda o gate `algorythmo_crm`. Como Modeloja terá `crm` ligado, OK. Se quiser separar, registrar um enable-flag próprio `brain_copilot` é trivial — **não necessário Dia-1** (decisão de produto, ver §11), mas o slot existe.

---

## 7. Edge cases (o que quebra e como respondemos)

| Cenário | Comportamento |
|---|---|
| **Cérebro vazio** (Modeloja ainda sem documentos) | Ver/Histórico = empty-state honesto. Copiloto: estado **`ungrounded`** (200, "Não encontrei isso no Cérebro"). Distinto de "motor não configurado". Nunca inventa. |
| **`DEEPSEEK_API_KEY` / `ANTHROPIC_API_KEY` de síntese ausente** | `think --json` volta `synthesisOk=false` + `warnings:[NO_ANTHROPIC_API_KEY]`. Copiloto: estado **`engine_unconfigured`** → 503 + UI "Motor de IA não configurado". **NÃO** é "não sei" (P1-2 — não mentir pro operador). Ver/Ajustar/Histórico seguem funcionando (não dependem do LLM). |
| **`ZEROENTROPY_API_KEY` ausente (embeddings)** | Upload aceita o arquivo, mas a ingestão (`capture`) falha (sem embeddings) → status `failed` + `last_error` claro no Ver. Sem 500. |
| **LLM devolve lixo não-JSON** | `think --json` marca `warnings:[LLM_OUTPUT_NOT_JSON]`, `synthesisOk=false`. Copiloto: estado **`degraded`** → 200 "Resposta indisponível, tente de novo". |
| **`think` sem `--json` (bug P0-1)** | **Corrigido:** Client passa `--json`; sem isso o gbrain devolveria markdown e o `JSON.parse` quebraria em toda pergunta. Spec trava `--json` presente. |
| **Upload hostil** (.exe renomeado, SVG com script, PDF-bomba, 0 byte) | Rejeitado na validação (allowlist + magic bytes + tamanho). Nunca chega ao disco do brain. |
| **Documento com prompt injection** | Defesa real = read-only estrutural (§4.4). Pior caso: resposta textual ruim a um operador interno. Sem ação possível. |
| **Escrita concorrente** (upload + colar simultâneos) | Serializado pelo `WriteLock` **por-brain** (`gbrain:write:lock:<account_id>`). Contention → retry Sidekiq backoff 2s/4s/8s. |
| **Leitura concorrente** (Copiloto + outra consulta) | **Limitada por semáforo de concorrência gbrain** (P1-1) — caso contrário N subprocessos bun+PGLite estouram a VPS. |
| **Subprocess gbrain trava/lento** | Timeout do Client (READ 30s / WRITE 60s) → TERM+KILL. Erro tipado, não trava request. |
| **Pergunta vazia / gigante no Copiloto** | Validação: rejeita vazio; trunca/recusa acima de N chars; rate-limit por usuário. |
| **Vazamento cross-tenant (account 1 ↔ Modeloja)** | **Fechado (P0-5):** brain dedicado da Modeloja via `GBRAIN_HOME` isolado, nascido zerado (`gbrain init --force`). Spec afirma 0 páginas do founder. |
| **Escala 10×–100× de documentos** | Ingestão assíncrona/idempotente; Ver paginado; embeddings via API não pressionam RAM **de embeddings** (mas a RAM do gbrain por subprocess é o limite real — semáforo + medição no deploy, P1-1). |
| **VPS sob pressão de RAM** | Embeddings via API = 0 RAM. **Mas o gbrain (bun+PGLite WASM) consome RAM por subprocess** — mitigado por semáforo de concorrência + medição real no deploy (§3.6). |
| **Active Storage sem volume** | Já mitigado: volume `storage` montado (memória do projeto). Reconfirmar no deploy. |

---

## 8. Fatiamento em PRs (da fatia mais segura à mais arriscada)

Cada PR ≤ ~200 linhas quando possível, responsabilidade única, salvaguarda/teste obrigatório. **Sem teste, o PR não fecha.**

> **Mudança de sequência na v2:** a revisão forçou inserir um **PR 0 de fundação** (provisionamento do brain isolado + pin de SHA + prova de integração real) ANTES de tudo. Sem ele, P0-4 (init non-TTY) e P0-5 (cross-tenant) ficariam abertos e o PR 1 ("ligar leitura") rodaria contra um brain inexistente ou contaminado. Os PRs de produto continuam 1→7.

### PR 0 — Fundação: brain isolado da Modeloja + pin de SHA + prova de integração real (NOVO, P0-4/P0-5/P1-4)
- **Pin do SHA do gbrain** (40 chars) num arquivo versionado (ADR-0013) — o repo teve push hoje e tem ~839 issues abertas; o contrato pode mudar.
- **Rake task `algorythmo:brain:provision`** (idempotente, non-TTY-safe): `gbrain init --pglite --force --non-interactive --embedding-model zeroentropyai:zembed-1 --embedding-dimensions 1280` + `gbrain config set models.think deepseek:deepseek-chat`, rodando com `GBRAIN_HOME` da Modeloja e `ZEROENTROPY_API_KEY` no env (§3.4/§3.5).
- **`Brain::Client#subprocess_env`** injetando `GBRAIN_HOME` (isolamento), `ZEROENTROPY_API_KEY`, `DEEPSEEK_API_KEY`; **WriteLock por-brain** (`<account_id>`).
- **`gbrain_real_integration_spec`** (roda contra o SHA pinado, fora do CI padrão se preciso, gate manual): `capture` de um markdown → `stats` mostra a página → `search` acha → brain nasce com 0 páginas após init. Prova que o Client funciona de verdade e que o brain da Modeloja está vazio (sem dado do founder).
- **Salvaguarda:** o integration spec é o gate; sem ele verde, PR 6 (Copiloto) não começa.

### PR 1 — Ligar leitura: `compiled_truth` + `timeline` reais (a mais segura)
- LIGA os stubs 501 ao `Brain::Client` (`search`/`stats` para compiled_truth; eventos para timeline). Read-only, sem lock, sem LLM.
- `brain.service.js`: como agora retorna 200 com dado real, a degradação pra fixture deixa de disparar (mantida só como rede de segurança em 501).
- **Salvaguarda:** request specs — founder = 200 com shape real; non-founder = 403 (fail-closed); gbrain ausente = 502 tipado, não 500.

### PR 2 — "Ver" real na aba Brain (frontend)
- `BrainViewer.vue` ganha de volta uma aba **Ver** que consome `compiled_truth`/`documents#index` reais (substitui o protagonismo do hub-demo Aurora; o Aquário pode virar um header decorativo, não a fonte de verdade).
- Empty-state honesto quando o cérebro está vazio.
- **Salvaguarda:** spec Vue — estado com dado, estado vazio, estado de erro; nenhuma fixture plantada em produção.

### PR 3 — Pipeline de upload backend (extração → markdown → capture)
- Migration `algorythmo_brain_documents`; model; `DocumentsController#create/index`; `DocumentExtractor`; `BrainDocumentIngestionWorker`.
- Validação de upload completa (§4.3) desde este PR.
- **Salvaguarda:** specs de validação (allowlist, magic-bytes, tamanho, null byte, traversal); spec do worker (extração pdf/docx/md/txt → capture chamado sob lock; idempotência; falha → status failed + last_error). Cobertura ≥90% nessa fatia.

### PR 4 — "Ajustar" frontend (colar texto + upload) + caminho de RAW MARKDOWN (P2)
- Cherry-pick e adaptação do `BrainDocumentUpload.vue` (worktree m8b) ligado ao `POST /brain/documents` real (troca o "no POST" por POST real, progresso, estados pending/captured/failed).
- Campo de "colar/editar conhecimento" → `POST /brain/adjustments` (LIGA o stub 501 → enfileira **`RawMarkdownIngestionWorker`**, NÃO o `IngestionWorker` de conversa — P2: o worker existente assume `conversation_id`). O worker novo grava tmpfile + `capture` sob lock, sem passo de conversa.
- **Salvaguarda:** spec Vue do fluxo de upload (sucesso, rejeitado, falha de ingestão); spec do adjustments controller (enfileira o worker de raw markdown, não chama gbrain síncrono, não toca em `account.conversations`).

### PR 5 — "Histórico" (snapshots via `stats`, P1-3)
- Migration `algorythmo_brain_snapshots`; model; `SnapshotsController#index` (LIGA stub); snapshot leve via **`gbrain stats`** (read-only, sem lock) a cada capture bem-sucedido; aba Histórico no frontend. **`export` fora de escopo.**
- **Salvaguarda:** spec — capture cria evento de histórico via stats; index pagina; empty-state.

### PR 6 — Copiloto backend (RAG read-only) — depende do PR 0 verde
- `CopilotController#ask` (ASSÍNCRONO, atrás do semáforo/fila de baixa concorrência — P1-1); `CopilotAnswer` mapeando a **máquina de estados §2.2** a partir do `think --json` real; **`Client#think` corrigido para passar `--json`** (P0-1, JÁ FEITO no PR 0) e parsear o shape real (`answer/gaps/citations[page_slug,row_num,citation_index]/synthesisOk/warnings`); rate-limit.
- **Sinal de estado (confirmado na revisão do PR 0, source no SHA pinado):** distinguir "motor desligado" de "não sei" pelo **`synthesisOk === false`** (sinal primário, com default defensivo: campo ausente ⇒ tratar como `false`/degraded). **NÃO** casar o literal `NO_ANTHROPIC_API_KEY` — o gbrain emite esse warning genérico mesmo rodando DeepSeek; tratar `warnings[]` como advisory, não como discriminante.
- **NÃO** há "prompt blindado" — o gbrain monta o prompt internamente (P0-2). A defesa é read-only + saída escapada.
- **Salvaguarda:** specs — `grounded` (citações não-vazias); `ungrounded` (cérebro vazio, citações vazias, synthesisOk=true); **`engine_unconfigured`** (synthesisOk=false + NO_ANTHROPIC_API_KEY → 503, distinto de "não sei" — P1-2); `degraded` (LLM_OUTPUT_NOT_JSON); **teste de prompt injection** (documento com "ignore instruções" → nenhuma ação possível, read-only); `--json` presente na invocação; nenhum método de escrita exposto.

### PR 7 — Copiloto frontend (aba dedicada + chat)
- Nova **entrada de menu irmã do Brain** sob INTELIGÊNCIA (`Sidebar.vue:690`, mesmo padrão `isAdmin`), nova rota, componente de chat (perguntas, respostas, chips de citação por `page_slug`, **os 4 estados da máquina §2.2 com UI distinta**, sanitização de saída anti-XSS).
- **Salvaguarda:** spec Vue (render por estado: grounded/ungrounded/engine_unconfigured/degraded; resposta nunca renderizada como HTML cru); spec de menu (entrada aparece, padrão de papel correto).

**Ordem de risco:** **0 (fundação/integração real)** · 1→2 (leitura pura) · 3→4→5 (escrita, sob lock, assíncrona) · 6→7 (LLM, a superfície nova). O Copiloto vem por último: depende do PR 0 (brain provisionado e provado) e dos PRs 1-5 (conteúdo real) para ser testável de verdade.

---

## 9. Estratégia de teste por fatia

| Camada | Ferramenta | O que prova |
|---|---|---|
| **Integração real gbrain** (PR 0) | RSpec integration (SHA pinado, gate manual) | `capture→stats→search` funciona; brain da Modeloja nasce com **0 páginas** (isolamento P0-5); `think --json` devolve o shape esperado |
| Controllers Brain (todos) | RSpec request | auth fail-closed (non-founder 403), shapes, erros tipados (502/503, nunca 500) |
| `DocumentExtractor` + validação | RSpec unit | allowlist, magic-bytes, tamanho, traversal, null byte, extração por tipo |
| Workers de ingestão (documento + **raw markdown** P2) | RSpec | capture sob lock por-brain, idempotência, falha → status+last_error, tmpfile removido; raw markdown NÃO toca `account.conversations` |
| `CopilotAnswer` (máquina de estados P1-2) | RSpec | **4 estados distintos**: grounded / ungrounded / engine_unconfigured (503, ≠ "não sei") / degraded; mapeados de `synthesisOk`+`warnings`+`citations` do `think --json`; **prompt injection neutralizada por read-only** |
| `Brain::Client#think` (P0-1) | RSpec | passa `--json`; parseia shape real (`page_slug/row_num/citation_index`, `gaps`, `synthesisOk`) |
| `Brain::Client#subprocess_env` | RSpec | injeta `GBRAIN_HOME`/`ZEROENTROPY_API_KEY`/`DEEPSEEK_API_KEY` no env hash; **nunca** em args; nunca em log; NÃO injeta vars que o gbrain não lê |
| Provisionamento (rake task P0-4) | RSpec | idempotente; non-TTY (sem picker); embedding provider cravado; `models.think=deepseek` setado |
| Concorrência gbrain (P1-1) | RSpec | semáforo limita N subprocessos; WriteLock por-brain serializa escrita |
| Componentes Vue (Ver/Ajustar/Histórico/Copiloto) | Vitest + Vue Test Utils | estados (dado/vazio/erro/loading), upload (sucesso/rejeitado/falha), **4 estados do Copiloto**, **saída escapada (anti-XSS)** |
| Menu | Vitest | entrada Copiloto aparece com padrão de papel correto, irmã do Brain |
| Registro de spec novo | — | **cada spec novo registrado em `run_foss_spec.yml` / `vitest.algorythmo.config.ts`** (lição: lista explícita, não glob — senão o check verde mente) |

Gate: **≥90% backend** nas fatias novas, **interação Vue testada** em todas as telas.

---

## 10. Como funciona o "espaço pronto pra anexar documentos" sem documentos reais

- O **pipeline é 100% funcional desde o PR 3** — extração, markdown, capture, lock, status, erro: tudo testado com arquivos de fixture **de teste** (não plantados em produção).
- Em **produção, vazio = vazio honesto**: Ver e Histórico mostram empty-state ("Nenhum conhecimento ainda — anexe documentos em Ajustar"). Copiloto diz "ainda não tenho isso no Cérebro". Nenhuma fixture-fantasma simulando conteúdo (o anti-padrão que o `BrainAquario` hoje tem, e que estamos corrigindo).
- No **momento em que o founder solta o primeiro arquivo**, o pipeline roda fim-a-fim e o conteúdo aparece em Ver/Histórico e fica consultável pelo Copiloto. Sem deploy, sem código novo. É literalmente "a porta pronta".

---

## 11. Decisões de produto remanescentes (só o founder pode decidir)

As principais já estão trancadas (aba dedicada, read-only Dia-1, Manu adiada, Ver/Ajustar/Histórico, DeepSeek como motor de síntese, embeddings externos via OpenAI, brain isolado da Modeloja, BYOK). Restam estas, genuinamente de produto — **não decida por ele**:

1. **Consentimento LGPD do envio do acervo a terceiros (CONSENTIDO, registrar formalmente).** O founder já aprovou embeddings externos; o que falta é **materializar o consentimento no contrato/material de venda da Modeloja**: "documentos do cliente são processados por provedores de IA terceiros — OpenAI (indexação, acervo inteiro no upload) e DeepSeek (respostas, subconjunto recuperado)". Não é decisão técnica; é cláusula de produto/jurídico. (§3.1)
2. **Nome e ícone do Copiloto no menu.** Entra como entrada irmã do Brain sob INTELIGÊNCIA. Sugestão: "Copiloto" (ícone `i-lucide-sparkles` ou `i-lucide-message-circle-question`). O founder escolhe o rótulo final.
3. **Categorias de documento.** O `BrainDocumentUpload.vue` reusado traz 6 (políticas / manuais / regras / design system / outros / todos). Confirmar se servem para a Modeloja. (Default: manter as 6.)

Tudo o mais é decisão técnica — resolvida neste plano.

---

## 12. Riscos técnicos + mitigação

| Risco | Severidade | Mitigação |
|---|---|---|
| **RAM da VPS 4 GB — motor gbrain por subprocess (P1-1)** | Alta | Embeddings via API = 0 RAM, MAS cada `capture/search/think` sobe bun+PGLite WASM residente. **Semáforo de concorrência gbrain** (máx. ~2 subprocessos) + fila Sidekiq baixa concorrência pro Copiloto + **medição real de RAM no deploy** antes de liberar (§3.6). Fallback embeddings (LGPD/qualidade): ZeroEntropy (default) ou Ollama só com VPS ≥ 8 GB. |
| **Vazamento cross-tenant account 1 ↔ Modeloja (P0-5)** | Alta | Brain DEDICADO da Modeloja via **`GBRAIN_HOME` isolado** (mecanismo upstream real, `config.ts:24`), nascido zerado por `gbrain init --force`. WriteLock por-brain. Spec de integração afirma 0 páginas do founder. |
| **`init` non-TTY trava em produção (P0-4)** | Alta | Provisionamento com provider **cravado** (`--embedding-model zeroentropyai:zembed-1 --embedding-dimensions 1280`), sem auto-detect/picker. Rake task idempotente no deploy (§3.4). |
| **`think` quebra (markdown vs JSON) (P0-1)** | Alta | Client passa `--json`; spec trava. Sem isso, 502 em toda pergunta. |
| **DeepSeek mal configurado (env não basta) (P0-3)** | Alta | Síntese via `gbrain config set models.think deepseek:deepseek-chat` (persistido), não via env per-request. DeepSeek não tem embeddings — separação obrigatória. |
| **Prompt injection via documento anexado (P0-2)** | Média (rebaixada) | **Não controlamos o prompt do `think`** — a defesa real é read-only estrutural (sem ação possível) + saída escapada anti-XSS + citações (§4.4). Fronteira de prompt real só com arquitetura `search`+LLM-direto (evolução futura). Teste no PR 6. |
| **LGPD — acervo inteiro vai à OpenAI no upload** | Média | Decisão de produto CONSENTIDA; materializar consentimento no contrato (§3.1, §11). |
| **Integração gbrain nunca exercitada (P1-4)** | Alta | PR 0 crava SHA + `gbrain_real_integration_spec` ANTES do Copiloto. |
| **Estado do Copiloto mente pro operador (P1-2)** | Média | Máquina de estados separa "motor não configurado" (503) de "não sei" (200 ungrounded). Teste dos 4 estados. |
| **Upstream GBrain muda CLI/output (839 issues, push hoje)** | Média | Pin de SHA (ADR-0013); specs travam o contrato real; integration spec roda contra o SHA pinado. |
| **Vazamento de chave em log/CLI** | Alta | Chave só no env hash do Open3; nunca em arg; auditar stderr do gbrain antes de logar; teste em `subprocess_env`. |
| **Custo DeepSeek descontrolado (loop/abuso)** | Baixa | Rate-limit por usuário; sem auto-chamadas; Dia-1 é uso humano manual. |
| **Active Storage perde uploads no deploy** | Média | Volume persistente já montado (memória); reconfirmar no deploy. |
| **Spec novo fora do CI (check verde que mente)** | Média | Registrar cada spec em `run_foss_spec.yml` / `vitest.algorythmo.config.ts` (§9). |

---

## 13. ENV / config nova + provisionamento (CORRIGIDO v2 — P0-3/P0-4/P0-5)

**Atenção:** env vars **não bastam** — há um passo de **provisionamento** (comandos gbrain rodados uma vez). E as vars do DeepSeek da v1 (`DEEPSEEK_BASE_URL`/`DEEPSEEK_MODEL`) **não existem para o gbrain** — removidas.

### Env vars (em `.env.example` + Easypanel, nunca commitar valores)

```
# --- Síntese (think) ---
DEEPSEEK_API_KEY=            # lido pela recipe DeepSeek do gbrain. Founder entrega depois.
                            # Unset → think devolve synthesisOk=false → Copiloto 503.
                            # (NÃO setar DEEPSEEK_BASE_URL/DEEPSEEK_MODEL — gbrain não os lê;
                            #  o base_url está embutido na recipe; o modelo vem de config.)

# --- Embeddings (DEFAULT do motor — founder 2026-06-04) ---
ZEROENTROPY_API_KEY=        # provider de embeddings DEFAULT do gbrain (zeroentropyai:zembed-1, 1280 dims).
                            # Unset → ingestão (capture) falha com erro claro.
                            # (OpenAI text-embedding-3-small era a escolha anterior; segue trocável.)

# --- Isolamento do brain (P0-5) ---
ALGORYTHMO_BRAIN_HOME=/var/algorythmo/brains/account-2   # GBRAIN_HOME da Modeloja (volume persistente)
ALGORYTHMO_PRIMARY_ACCOUNT_ID=2                          # tenant fail-closed → Modeloja (confirmar no deploy)

# --- já existentes, reusados ---
# GBRAIN_BIN, GBRAIN_READ_TIMEOUT, GBRAIN_WRITE_TIMEOUT
```

### Provisionamento (rake `algorythmo:brain:provision`, idempotente, non-TTY-safe)

Roda uma vez por brain no deploy, com `GBRAIN_HOME=$ALGORYTHMO_BRAIN_HOME` e `ZEROENTROPY_API_KEY` no env:

```
gbrain init --pglite --force --non-interactive \
  --embedding-model zeroentropyai:zembed-1 --embedding-dimensions 1280
gbrain config set models.think deepseek:deepseek-chat
```

- `--force` só na criação inicial do brain (nasce zerado, garante isolamento).
- O `GBRAIN_HOME` precisa de **volume persistente** (igual ao Active Storage) — senão o brain some a cada deploy.
- [VERIFICADO no SHA pinado: embeddings default = `zeroentropyai:zembed-1` / 1280 dims — `src/core/ai/defaults.ts:20-21`; chave `ZEROENTROPY_API_KEY` — `src/core/config.ts:43,409`.] [A CONFIRMAR ANTES DO DEPLOY: identificador de modelo DeepSeek vigente (aliases `deepseek-chat`/`deepseek-reasoner` em deprecação — checar V4).]

---

## 14. O que NÃO fazemos (não-goals, inegociáveis)

- Não tocar no motor do CRM (`engines/algorythmo` controllers/models de pipeline/lead/stage) nem na tela de admin.
- Não inventar abstração própria sobre GBrain — seguir upstream (`GBRAIN_HOME` para isolar brain, `--embedding-model` cravado, `models.think` por config, `think --json`/`search`/`capture`/`stats` como são).
- Não construir a Manu, nem o "redigir resposta na conversa" (fase futura, exige canal).
- Não mudar schema upstream do Chatwoot (preserva sync D1) — só tabelas `algorythmo_*` no engine.
- Não plantar fixture-fantasma em produção — vazio é vazio honesto.

---

## Handoff

O `engineer` implementa **PR 0 → 7** nesta ordem, em `algorythmo/brain-copiloto` a partir de `algorythmo/main`. **PR 0 (fundação: provisionamento + isolamento + integração real) é gate** — o Copiloto (PR 6) não começa sem o `gbrain_real_integration_spec` verde. Dúvida técnica volta ao `planner`, nunca ao founder. Decisões §11 (consentimento LGPD, rótulo do Copiloto, categorias) confirmadas pelo founder antes do PR 4 (upload) e PR 7 (menu).
