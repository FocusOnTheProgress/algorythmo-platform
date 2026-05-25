# Sessão E — PR 6 — M1-D Pipeline Metrics (prompt inicial)

> **Cole tudo abaixo no Cmd-K depois de abrir uma sessão Claude Code com cwd em `C:/Users/gusta/dev/algorythmo-m1d-metrics`.**
> O prompt é auto-contido: a sessão recebe todo o contexto e segue até abrir o PR.

---

Você é a **Sessão E** do projeto Algorythmo OS (fork do Chatwoot). Está em um worktree isolado `C:/Users/gusta/dev/algorythmo-m1d-metrics` na branch `algorythmo/m1d-pipeline-metrics`, baseada em `algorythmo/main @ d9c2a320a`. A Sessão A (orquestradora) está no `Fork Chatwoot/` principal e fez o dispatch. Em paralelo, a Sessão F trabalha em outro worktree (cuts Playwright) sem tocar nos seus arquivos.

## Quem é o founder

Gustavo, CEO da Algorythmo. **Não revisa código.** Toda review passa por `adversarial-reviewer` agent antes do merge. Não fala em jargão técnico com ele — quando reportar progresso, fale em produto. Memórias da sessão: world-class em todas as camadas, sem mediano, sem atalhos.

## Contexto do produto (resumido)

- **Algorythmo OS** = helpdesk AI-first + CRM Kanban embutido. Fork do Chatwoot, repo `FocusOnTheProgress/algorythmo-platform` privado.
- M1-C (leads reais + drawer + stage history) acabou de fechar. Agora vem **M1-D — observabilidade do Kanban**.
- Princípio (memória do founder): *"Kanban É o funil de vendas — instrumento de métrica de jornada, não só visualização."* O Brain (M3) e o time C-level (Andar 2) vão consumir essas métricas. **Sem dado agora, atrasamos M3 depois.**
- Card do Kanban = Lead (Pessoa). 5 estágios renomeáveis (`Novo / Qualificado / Proposta / Fechado ganho / Fechado perdido`). Histórico de transições já persiste em `stage_histories` (PR #52).

## Sua entrega: PR 6

### Backend — engine `engines/algorythmo/`

1. **Service `Algorythmo::Analytics::PipelineMetrics`** em `engines/algorythmo/app/services/algorythmo/analytics/pipeline_metrics.rb`.
   - Construtor: `account, pipeline`. Método único `#call` retorna hash conforme payload no §9 do `docs/coordination/CONTRACT_M1B.md`.
   - Cálculo por estágio:
     - `lead_count` — leads abertos atualmente no estágio (não usa histórico).
     - `avg_time_in_stage_seconds` — média da diferença `closed_at - entered_at` em entradas fechadas (`stage_histories` onde `exited_at IS NOT NULL`) DOS ÚLTIMOS 90 DIAS. Para entradas ainda abertas (lead atualmente no estágio), considerar `Time.current - entered_at`. Documente a janela no comentário.
     - `conversion_rate_to_next` — entre leads que saíram desse estágio nos últimos 90 dias, fração que foi pro estágio com `position` imediatamente maior (independente de nome). `null` em estágios terminais (`won`/`lost`).
   - Agregado do funil:
     - `open_leads` — total de leads abertos no pipeline (kind `open`).
     - `avg_funnel_hours` — média do tempo total que leads `won` levaram do primeiro estágio até `won` nos últimos 90 dias.
     - `conversion_rate` — `won_count / (won_count + lost_count)` dos últimos 90 dias.
   - **Cache:** `Rails.cache.fetch("algorythmo:pipeline_metrics:#{account.id}:#{pipeline.id}", expires_in: 60.seconds)` envolve o cálculo todo. NÃO usar `Rails.cache.write` solto.
   - **Fail-closed:** se `stage_histories` estiver vazio (account novo), retornar payload com zeros, não erro.

2. **Controller `Algorythmo::Api::V1::PipelineMetricsController`** em `engines/algorythmo/app/controllers/algorythmo/api/v1/pipeline_metrics_controller.rb`.
   - Herda da `Algorythmo::Api::V1::BaseController` (mesmo padrão dos outros controllers do engine; busque em `engines/algorythmo/app/controllers/` qual é a base).
   - `GET show` recebe `:pipeline_id` no path. Carrega `Algorythmo::Pipeline.find_by(account: current_account, id: params[:pipeline_id])`. 404 se nil.
   - Gate `algorythmo_crm` (mesmo gate dos outros endpoints — copie o padrão do `LeadsController`).
   - Retorna o payload completo do service como JSON, status 200.

3. **Routes** em `engines/algorythmo/config/routes.rb`:
   ```ruby
   resources :pipelines, only: [] do
     collection do
       get :default
     end
     member do
       get :metrics   # M1-D
     end
   end
   ```
   Confirme path final: `GET /algorythmo/api/v1/accounts/:account_id/pipelines/:id/metrics`.

4. **Specs RSpec** em `engines/algorythmo/spec/algorythmo/`:
   - `services/analytics/pipeline_metrics_spec.rb` — cobertura: account sem histórico (zeros), pipeline com leads em vários estágios + histórico, terminal stage retorna `conversion_rate_to_next: nil`, cache hit (segunda chamada não toca DB — use `expect(ActiveRecord::Base.connection).not_to receive(:exec_query)` ou similar), janela de 90 dias respeitada (lead movido há 100 dias não conta).
   - `controllers/api/v1/pipeline_metrics_controller_spec.rb` — 200 happy path, 404 pipeline de outra account, 403/redirect quando flag `algorythmo_crm` off, payload shape via JSON Schema OU assertions explícitas em cada chave.

### Frontend — `app/javascript/dashboard/`

5. **`helper/algorythmo/leadApi.js`** — adicionar método:
   ```js
   fetchPipelineMetrics(accountId, pipelineId) {
     return axios.get(`/algorythmo/api/v1/accounts/${accountId}/pipelines/${pipelineId}/metrics`);
   }
   ```
   Não criar arquivo novo; já existe.

6. **`composables/algorythmo/useStageMetrics.js`** (novo) — `useStageMetrics(pipelineId)`:
   - State: `metrics: ref(null)`, `loading: ref(false)`, `error: ref(null)`, `lastFetchedAt: ref(null)`.
   - `fetchMetrics()` — chama `leadApi.fetchPipelineMetrics`, hidrata `metrics`, marca `lastFetchedAt`.
   - `metricsForStage(stageId)` — getter que retorna `metrics.value?.stages?.find(s => s.stage_id === stageId) ?? null`.
   - `summary` — computed que retorna `metrics.value?.summary ?? null`.
   - **NÃO** faz polling automático. Componente decide quando chamar `fetchMetrics()`. Default: 1 fetch no mount + re-fetch quando `useDragLead` emite movimento (event bus já existe — busque `algorythmoLeadMoved` no codebase).
   - Spec em `composables/algorythmo/specs/useStageMetrics.spec.js` — mock do axios, valida hidratação + getters.

7. **`routes/dashboard/crm/views/components/KanbanHeader.vue`** (novo):
   - Layout: título à esquerda (`kanban-title` já existe no `KanbanBoard.vue` — **mover pra cá**), search no meio (`kanban-search-input` — também mover), summary à direita.
   - Summary renderiza `data-testid="kanban-metrics-summary"` com 3 stats:
     ```html
     <div data-testid="kanban-metrics-summary">
       <span data-testid="kanban-metrics-stat" data-metric-key="open_leads">…</span>
       <span data-testid="kanban-metrics-stat" data-metric-key="avg_funnel_hours">…</span>
       <span data-testid="kanban-metrics-stat" data-metric-key="conversion_rate">…</span>
     </div>
     ```
   - Loading state: skeleton shimmer (use o padrão SCSS de `assets/scss/algorythmo-bridge.scss` se já existir; senão, simples `opacity: 0.5`).
   - Error state: ícone `i-lucide-alert-triangle` + tooltip i18n `ALGORYTHMO_CRM.METRICS.ERROR_TOOLTIP`. NÃO esconder o header.
   - Acessibilidade: `aria-live="polite"` no summary pra leitor de tela anunciar updates.
   - Spec em `views/components/specs/KanbanHeader.spec.js` — renderiza 3 stats com props, loading, error.

8. **`routes/dashboard/crm/views/components/StageColumn.vue`** (edit):
   - No `stage-column-header`, depois do `stage-count`, adicionar:
     ```html
     <span
       data-testid="stage-metrics-chip"
       :data-stage-id="stage.id"
       :title="metricsTooltip"
       :aria-label="metricsAriaLabel"
     >
       <span data-testid="stage-metrics-avg-time">{{ avgTimeFormatted }}</span>
       <span v-if="conversionRateNext != null" data-testid="stage-metrics-conversion">{{ conversionFormatted }}</span>
     </span>
     ```
   - Recebe prop `metrics` (objeto retornado por `useStageMetrics.metricsForStage(stage.id)`). Quando `null`, renderiza placeholder `—` sem chip de conversão.
   - Formato: `avgTimeFormatted` usa `timeFormat` helper que já existe (busque). Conversão: `Math.round(x * 100)`%.
   - Spec em `specs/StageColumn.spec.js` — adicionar casos: chip aparece com props, placeholder quando metrics null, conversion ausente em terminal.

9. **`routes/dashboard/crm/views/KanbanBoard.vue`** (edit):
   - Importar `useStageMetrics` + `KanbanHeader`.
   - Mover `kanban-title`, `kanban-search-input`, `pipeline-config-link` pra dentro do `KanbanHeader.vue` (passe via props o que precisar — search emite `update:search`).
   - Wirar `stageMetrics` → passar `metrics` correto pra cada `StageColumn`.
   - `fetchMetrics()` no `onMounted` + re-fetch quando `useDragLead` confirma movimento (escute o event bus).

10. **i18n** — em `app/javascript/dashboard/i18n/locale/en/algorythmoCrm.json` e `pt_BR/algorythmoCrm.json`, adicionar sob `ALGORYTHMO_CRM`:
    ```json
    "METRICS": {
      "OPEN_LEADS_LABEL": "Open leads",
      "OPEN_LEADS_LABEL_PT": "Leads abertos",
      "AVG_FUNNEL_LABEL": "Avg funnel time",
      "CONVERSION_RATE_LABEL": "Conversion",
      "STAGE_AVG_TIME_LABEL": "Avg time in stage",
      "STAGE_CONVERSION_NEXT_LABEL": "→ next stage",
      "LOADING": "Loading metrics…",
      "ERROR_TOOLTIP": "Couldn't load metrics. Retry in a few seconds."
    }
    ```
    Espelhe traduções em pt_BR (founder PME, mensagem clara, sem inglês).

## Regras de execução

1. **Use `TaskCreate` no início** pra quebrar isso em ~8-10 tarefas pequenas. Marque `in_progress` ao começar cada uma e `completed` ao terminar.
2. **Não toque em nada fora dos paths listados acima.** Mapa de toque + zero overlap está em `docs/coordination/M1D_FASE5_DISPATCH.md`.
3. **Não toque em `docs/coordination/*.md`** — Sessão A mantém.
4. **CONTRACT v1.2.0 já está congelado.** Implemente os testids EXATAMENTE como o `docs/coordination/CONTRACT_M1B.md` lista (`kanban-metrics-summary`, `kanban-metrics-stat` com `data-metric-key`, `stage-metrics-chip`). Se precisar de testid novo durante a implementação, pare e abra `[BLOCKED]`.
5. **Soft-fork zone:** verifique antes de commitar com `bash engines/algorythmo/bin/check-soft-fork-zone.sh`.
6. **Specs primeiro nas peças críticas** (service e composable). RSpec + vitest passando local antes de push.
7. **Lint:** `./node_modules/.bin/eslint --fix <arquivo>` em cada JS/Vue tocado; `bundle exec rubocop <arquivo>` em cada Ruby.
8. **NÃO mexer em `package.json` / `pnpm-lock.yaml`** — se faltar dependência transitiva (`postcss-import` foi o caso na #49), instale localmente mas reverta o diff antes do commit.
9. **Commit message convention:** seguir o padrão do repo. Conventional commits, Co-Authored-By Claude:
   ```
   feat(M1-D/PR6): pipeline metrics service + KanbanHeader observability

   Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
   ```
10. **Abrir PR contra `algorythmo/main`** com `gh pr create --repo FocusOnTheProgress/algorythmo-platform --base algorythmo/main`. Título: `feat(M1-D/PR6): pipeline metrics + Kanban observability`.
11. **Spawn `adversarial-reviewer`** quando PR estiver pronto. Endereçar todos HIGH. Decidir MED caso a caso. Pelo menos 1 rodada; se a primeira achar HIGH, fix e re-spawn.
12. **NÃO mergear sozinho.** Quando CI verde + adversarial passar, ping a Sessão A pelo chat humano.

## Definição de pronto

- [ ] Backend RSpec verde (`bundle exec rspec engines/algorythmo/spec/algorythmo/services/analytics engines/algorythmo/spec/algorythmo/controllers/api/v1/pipeline_metrics_controller_spec.rb`).
- [ ] Frontend vitest verde (`pnpm vitest run app/javascript/dashboard/composables/algorythmo/specs/useStageMetrics.spec.js app/javascript/dashboard/routes/dashboard/crm/views/components/specs`).
- [ ] Soft-fork zone check passa.
- [ ] Lint zero warning nos arquivos tocados.
- [ ] PR aberto, descrição com checklist do que mudou + screenshots (use `/browse` se já tiver dev server rodando) do header com métricas + estado de loading + estado de erro.
- [ ] Adversarial review passou.

## Onde achar coisas

- Backend padrão de controller/policy: `engines/algorythmo/app/controllers/algorythmo/api/v1/leads_controller.rb`.
- Padrão de service com cache: `engines/algorythmo/app/services/algorythmo/feature_gate.rb` (mostra `Rails.cache.fetch` 30s, replicar com 60s).
- StageHistory model: `engines/algorythmo/app/models/algorythmo/stage_history.rb`.
- Composable padrão Vue 3 com fetch: `app/javascript/dashboard/composables/algorythmo/useStageHistory.js` (PR #56).
- KanbanBoard atual: `app/javascript/dashboard/routes/dashboard/crm/views/KanbanBoard.vue`.
- timeFormat helper: provavelmente em `app/javascript/dashboard/helper/timeFormat.js` ou `shared/helpers/`.
- Plano que disparou M1-D: ainda não existe; este prompt é o plano. Se precisar de decisão fora do escopo aqui, pingue Sessão A.

Mãos à obra.
